"""
CareBank AI – FastAPI Backend
Exposes REST endpoints for CSV upload, analysis, and AI chat.
"""

import io
import os

from dotenv import load_dotenv
import pandas as pd
import pdfplumber
from typing import List, Optional
import io

# Load .env file so GEMINI_API_KEY is available via os.getenv()
load_dotenv()
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import timedelta, datetime

import agents
from database import engine, get_db
import models
import auth

# Initialize Database
models.Base.metadata.create_all(bind=engine)

# ---------------------
# App Initialization
# ---------------------
app = FastAPI(title="CareBank Unified API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = agents.Orchestrator()

# In-memory store for the latest analysis context (per-session simplification)
_latest_context: dict = {}


class UserCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "customer"

class Token(BaseModel):
    access_token: str
    token_type: str

class BudgetSettings(BaseModel):
    Food: float = 4000
    Transport: float = 2000
    Shopping: float = 3000
    Other: float = 2000


class ChatRequest(BaseModel):
    message: str
    context: str = ""

class SavingsGoalCreate(BaseModel):
    name: str
    target: float
    deadline: str

class SavingsGoalUpdate(BaseModel):
    saved: float

class FlagRequest(BaseModel):
    reason: str


@app.get("/")
def root():
    return {"status": "CareBank AI API is running"}

@app.post("/api/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pw = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username, 
        hashed_password=hashed_pw,
        role=user.role if user.role in ["customer", "banker"] else "customer"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": new_user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": new_user.role}

@app.post("/api/login") # Removed Token response_model to allow returning role
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    # Return token AND role so frontend can route immediately
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role
    }

@app.get("/api/admin/customers")
def get_all_customers(db: Session = Depends(get_db), current_admin: models.User = Depends(auth.get_current_admin)):
    """Fetch all users and their financial health overview for bank management."""
    users = db.query(models.User).filter(models.User.role == "customer").all()
    results = []
    # Use global orchestrator
    
    for user in users:
        # Load transactions for this user
        df = pd.DataFrame([
            {"Date": t.date, "Description": t.description, "Amount": t.amount}
            for t in user.transactions
        ])
        
        if df.empty:
            health = "New / No Data"
            score = 0
            risk_count = 0
        else:
            analysis = orchestrator.execute(df)
            score = analysis["budget_summary"]["health_score"]
            risk_count = len(analysis["anomalies"])
            health = analysis["advice"][0] if analysis["advice"] else "Stable"

        results.append({
            "id": user.id,
            "username": user.username,
            "health_score": score,
            "status": health,
            "risk_alerts": risk_count,
            "total_transactions": len(user.transactions)
        })
    
    return results

@app.get("/api/admin/customers/export")
def export_customers(db: Session = Depends(get_db), current_admin: models.User = Depends(auth.get_current_admin)):
    """Export all customer data as CSV."""
    customers = get_all_customers(db, current_admin)
    df = pd.DataFrame(customers)
    output = io.StringIO()
    df.to_csv(output, index=False)
    
    from fastapi.responses import StreamingResponse
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=customers_export.csv"}
    )

@app.post("/api/admin/flag/{customer_id}")
def flag_customer(customer_id: int, request: FlagRequest, db: Session = Depends(get_db), current_admin: models.User = Depends(auth.get_current_admin)):
    """Banker flags a customer account for review."""
    customer = db.query(models.User).filter(models.User.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    flag = models.CustomerFlag(
        customer_id=customer_id,
        flagged_by=current_admin.id,
        reason=request.reason,
        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    )
    db.add(flag)
    db.commit()
    return {"status": "success", "message": f"Customer {customer.username} flagged for review."}

@app.get("/api/admin/alerts")
def get_admin_alerts(db: Session = Depends(get_db), current_admin: models.User = Depends(auth.get_current_admin)):
    """Get customers with low health scores (below 40)."""
    customers = get_all_customers(db, current_admin)
    alerts = [c for c in customers if c["health_score"] < 40]
    return alerts


def parse_pdf(file_contents):
    """Extract transaction-like tables from PDF."""
    transactions = []
    with pdfplumber.open(io.BytesIO(file_contents)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables:
                if not table: continue
                # Basic heuristic: ignore rows with < 3 columns
                for row in table:
                    if len(row) >= 3:
                        # Try to find Date, Description, Amount
                        # This is a generic parser; real bank statement parsing is more complex
                        # but we aim for columns containing 'Date', 'Desc', 'Amount' keywords.
                        transactions.append(row)
    
    # Convert to DataFrame
    if not transactions:
        return pd.DataFrame()
    
    df = pd.DataFrame(transactions)
    # Heuristic to find header row
    header_idx = 0
    for i, row in df.iterrows():
        row_str = " ".join(str(x) for x in row if x)
        if all(k in row_str for k in ["Date", "Description", "Amount"]):
            header_idx = i
            break
            
    df.columns = df.iloc[header_idx]
    df = df.drop(df.index[:header_idx+1])
    return df

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Upload a transaction CSV or PDF and save to database."""
    filename = file.filename.lower()
    contents = await file.read()

    if filename.endswith(".csv"):
        try:
            df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")
    elif filename.endswith(".pdf"):
        try:
            df = parse_pdf(contents)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Only CSV and PDF files are accepted.")

    if df.empty:
         raise HTTPException(status_code=400, detail="No data found in file.")

    required_cols = {"Date", "Description", "Amount"}
    # Smart column mapping for PDF if exact match fails
    if not required_cols.issubset(set(df.columns)):
        # Try to find columns that look like Date/Description/Amount
        new_cols = {}
        for col in df.columns:
            c = str(col).lower()
            if "date" in c: new_cols[col] = "Date"
            elif "desc" in c or "particulars" in c: new_cols[col] = "Description"
            elif "amount" in c or "value" in c: new_cols[col] = "Amount"
        
        if len(new_cols) >= 3:
            df = df.rename(columns=new_cols)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"File must contain columns: {required_cols}. Found: {set(df.columns)}",
            )

    # Clean Amount column
    df["Amount"] = df["Amount"].astype(str).str.replace(r'[^\d.-]', '', regex=True)
    df["Amount"] = pd.to_numeric(df["Amount"], errors="coerce")
    df = df.dropna(subset=["Amount"])
    
    # Save transactions securely to the current user
    for _, row in df.iterrows():
        txn = models.Transaction(
            user_id=current_user.id,
            date=str(row.get("Date", "Unknown")),
            description=str(row.get("Description", "No Details")),
            amount=float(row["Amount"]),
            category="Pending"
        )
        db.add(txn)
    db.commit()

    return {"status": "success", "message": f"{len(df)} transactions uploaded."}


@app.get("/api/dashboard")
def get_dashboard(
    food_budget: float = 4000,
    transport_budget: float = 2000,
    shopping_budget: float = 3000,
    other_budget: float = 2000,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Fetch user's transactions from DB and run AI analysis."""
    global _latest_context
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    if not transactions:
        # Return empty state if no data
        return None
    
    df = pd.DataFrame([{
        "Date": t.date,
        "Description": t.description,
        "Amount": t.amount
    } for t in transactions])

    budgets = {
        "Food": food_budget,
        "Transport": transport_budget,
        "Shopping": shopping_budget,
        "Other": other_budget,
    }

    try:
        result = orchestrator.execute(df, budgets)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    # Record health score history
    new_history = models.HealthScoreHistory(
        user_id=current_user.id,
        score=result["budget_summary"]["health_score"],
        date=datetime.now().strftime("%Y-%m-%d")
    )
    db.add(new_history)
    db.commit()

    _latest_context = {
        "ai_context": result["ai_context"],
        "budget_summary": result["budget_summary"],
        "category_spending": result["category_spending"],
    }

    return result

@app.get("/api/goals")
def get_goals(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.SavingsGoal).filter(models.SavingsGoal.user_id == current_user.id).all()

@app.post("/api/goals")
def create_goal(goal: SavingsGoalCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_goal = models.SavingsGoal(
        user_id=current_user.id,
        name=goal.name,
        target=goal.target,
        deadline=goal.deadline
    )
    db.add(new_goal)
    db.commit()
    return new_goal

@app.patch("/api/goals/{goal_id}")
def update_goal(goal_id: int, update: SavingsGoalUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    goal = db.query(models.SavingsGoal).filter(models.SavingsGoal.id == goal_id, models.SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.saved = update.saved
    db.commit()
    return goal

@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    goal = db.query(models.SavingsGoal).filter(models.SavingsGoal.id == goal_id, models.SavingsGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(goal)
    db.commit()
    return {"status": "success"}

@app.get("/api/score-history")
def get_score_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.HealthScoreHistory).filter(models.HealthScoreHistory.user_id == current_user.id).order_by(models.HealthScoreHistory.date).all()

@app.get("/api/suggested-budgets")
def get_suggested_budgets(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Run dashboard analysis briefly to get category spending
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    if not transactions:
        return {}
    df = pd.DataFrame([{"Amount": t.amount, "Description": t.description} for t in transactions])
    # Run spending monitor to get categories
    df = orchestrator.spending.run(df)
    expense_df = df[df["Amount"] < 0].copy()
    category_spending = expense_df.groupby("Category")["Amount"].sum().abs().to_dict()
    return orchestrator.personal_budget.run(category_spending)


@app.post("/api/chat")
async def chat(request: ChatRequest, current_user: models.User = Depends(auth.get_current_user)):
    """Send a message to the AI advisor via local Ollama LLM."""
    global _latest_context

    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Use provided context or fall back to stored context
    context = request.context or _latest_context.get("ai_context", "")

    prompt = (
        f"System Context:\n{context}\n\n"
        f"User Question: {user_message}\n\n"
        f"Provide a helpful, personalized financial advice response. "
        f"Be specific, reference the user's actual numbers, and give actionable steps. Do not wrap in markdown or output thought blocks."
    )

    try:
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={"model": "llama3.2", "prompt": prompt, "stream": False},
                timeout=15.0
            )
            response.raise_for_status()
            reply_text = response.json().get("response", "Error generating response.")
            return {"reply": reply_text, "source": "local-llm (llama)"}
    except Exception as e:
        print(f"Local LLM error (Ensure Ollama is running): {e}")

    # Fallback
    reply = _fallback_response(user_message, _latest_context)
    return {"reply": reply, "source": "fallback"}


def _fallback_response(message: str, context: dict) -> str:
    """Rule-based fallback when Gemini API is unavailable."""
    text = message.lower()
    budget = context.get("budget_summary", {})
    spending = context.get("category_spending", {})

    income = budget.get("income", 0)
    expense = budget.get("expense", 0)
    score = budget.get("health_score", 0)

    if spending:
        top_category = max(spending, key=spending.get)
        top_value = spending[top_category]
    else:
        top_category = "N/A"
        top_value = 0

    if "reduce" in text or "save" in text or "unnecessary" in text or "cut" in text:
        return (
            f"Your highest spending category is **{top_category}** at ₹{top_value:,.0f}. "
            f"Consider setting stricter limits here. Your total expenses are ₹{expense:,.0f} "
            f"against ₹{income:,.0f} income. Reducing {top_category} spending by 20% could "
            f"save you ₹{top_value * 0.2:,.0f} per period."
        )
    elif "score" in text or "health" in text:
        status = "strong" if score > 75 else "moderate" if score > 50 else "at risk"
        return (
            f"Your financial health score is **{score}/100** ({status}). "
            f"This is based on your income-to-expense ratio: ₹{income:,.0f} income vs ₹{expense:,.0f} expenses."
        )
    elif "invest" in text:
        savings = income - expense
        return (
            f"You have approximately ₹{savings:,.0f} in surplus. Consider allocating "
            f"50% to a diversified mutual fund, 30% to a fixed deposit, and 20% as an emergency reserve."
        )
    elif "forecast" in text or "predict" in text or "next month" in text:
        return (
            f"Based on your recent trends, your spending has been averaging ₹{expense:,.0f}. "
            f"The forecast uses a rolling average of your last 2 months to predict next month's cash flow. "
            f"Check the Cashflow Forecast chart for visual details."
        )
    else:
        return (
            f"Here's your financial snapshot: Income ₹{income:,.0f}, Expenses ₹{expense:,.0f}, "
            f"Health Score {score}/100. Your top spending category is {top_category} (₹{top_value:,.0f}). "
            f"Ask me about saving tips, investment advice, or your forecast!"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
