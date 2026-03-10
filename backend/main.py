"""
CareBank AI – FastAPI Backend
Exposes REST endpoints for CSV upload, analysis, and AI chat.
"""

import io
import os

from dotenv import load_dotenv
import pandas as pd

# Load .env file so GEMINI_API_KEY is available via os.getenv()
load_dotenv()
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from agents import Orchestrator

# ---------------------
# App Initialization
# ---------------------
app = FastAPI(title="CareBank AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = Orchestrator()

# In-memory store for the latest analysis context (per-session simplification)
_latest_context: dict = {}


# ---------------------
# Models
# ---------------------
class BudgetSettings(BaseModel):
    Food: float = 4000
    Transport: float = 2000
    Shopping: float = 3000
    Other: float = 2000


class ChatRequest(BaseModel):
    message: str
    context: str = ""


# ---------------------
# Endpoints
# ---------------------
@app.get("/")
def root():
    return {"status": "CareBank AI API is running"}


@app.post("/api/upload")
async def upload_and_analyze(
    file: UploadFile = File(...),
    food_budget: float = 4000,
    transport_budget: float = 2000,
    shopping_budget: float = 3000,
    other_budget: float = 2000,
):
    """Upload a transaction CSV, run all agents, and return full analysis."""
    global _latest_context

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted.")

    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    # Validate required columns
    required_cols = {"Date", "Description", "Amount"}
    if not required_cols.issubset(set(df.columns)):
        raise HTTPException(
            status_code=400,
            detail=f"CSV must contain columns: {required_cols}. Found: {set(df.columns)}",
        )

    df["Amount"] = pd.to_numeric(df["Amount"], errors="coerce")
    df = df.dropna(subset=["Amount"])

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

    _latest_context = {
        "ai_context": result["ai_context"],
        "budget_summary": result["budget_summary"],
        "category_spending": result["category_spending"],
    }

    return result


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Send a message to the AI advisor with financial context."""
    global _latest_context

    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Use provided context or fall back to stored context
    context = request.context or _latest_context.get("ai_context", "")

    # Try Gemini API
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if api_key:
        try:
            import google.generativeai as genai

            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")

            prompt = (
                f"System Context:\n{context}\n\n"
                f"User Question: {user_message}\n\n"
                f"Provide a helpful, personalized financial advice response. "
                f"Be specific, reference the user's actual numbers, and give actionable steps."
            )

            response = model.generate_content(prompt)
            return {"reply": response.text, "source": "gemini"}

        except Exception as e:
            # Fall through to fallback on ANY error (including quota/rate limits)
            print(f"Gemini API error (falling back to local advisor): {e}")

    # Intelligent fallback when no API key is set or API call fails
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
