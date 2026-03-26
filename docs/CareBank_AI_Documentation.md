# CareBank AI — Project Documentation

**Project:** CareBank AI — Financial Wellness Platform  
**Submitted for:** Vidyutrendz Competition  
**Date:** March 26, 2026  
**GitHub:** https://github.com/Navaneee7/carebank_ai_react

---

## What is CareBank AI?

CareBank AI started as a simple idea — what if your bank didn't just show you numbers, but actually helped you make better financial decisions?

Most banking apps today are "reactive." They tell you what you already spent. We wanted to build something "proactive" — a platform that warns you before you overspend, coaches you on tax savings, and even lets you test "what if I buy this?" scenarios before making a real purchase.

We also realized that banks need tools too. A manager shouldn't have to manually scroll through spreadsheets to verify if a customer's data looks genuine. So we built a forensic layer on top — something that uses real mathematical models to flag suspicious financial data.

---

## Who Uses It?

There are two types of users:

1. **Customers** — Regular people who upload their bank statements and get personalized financial advice, savings tips, and health scores.
2. **Bank Managers** — They get a "Command Center" view where they can audit customer portfolios, check data reliability, and view forensic reports.

Both roles see the same underlying data, which was important to us — we didn't want any inconsistency between what a customer sees and what their manager audits.

---

## The Tech We Used

Here's a quick summary of our stack and why we picked each tool:

**Frontend:**
- **React.js** — We needed a component-based framework to build reusable UI pieces like charts, sidebars, and notification panels.
- **Vite** — Much faster than Create React App for development. Hot-reloading makes iteration quick.
- **Recharts** — We chose this over Chart.js because it integrates natively with React components. We use it for area charts, bar charts, and sparklines in the manager view.

**Backend:**
- **FastAPI (Python)** — We needed an async-capable API framework. FastAPI gave us automatic request validation, interactive docs at `/docs`, and high performance out of the box.
- **SQLAlchemy** — Instead of writing raw SQL queries, we used this ORM to define our database tables as Python classes. It made the code much cleaner and easier to maintain.
- **Pandas** — This handles all the heavy lifting when we parse bank statements. We load CSVs and extracted PDF data into DataFrames for cleaning, merging, and analysis.
- **pdfplumber** — Specifically chosen for PDF parsing because it can extract both structured tables and raw text, which was critical for our dual-pass approach.

**AI Layer:**
- **Google Gemini (Generative AI)** — Powers all our intelligent agents. We send structured prompts with the user's financial data, and Gemini returns natural-language advice and risk assessments.

**Security:**
- **PyJWT** — For generating and validating JSON Web Tokens.
- **Bcrypt** — One-way password hashing. Even if someone accesses our database, they can't reverse the passwords.
- **CORS Middleware** — Ensures only our frontend can talk to our backend. Random websites can't make API calls to our server.

**Database:**
- **SQLite** — Lightweight and file-based, perfect for our current scale. We'd migrate to PostgreSQL for a production deployment.

---

## How We Built Each Feature

### The "Upload Anything" System

This was one of our biggest challenges. Bank statements are messy — every bank uses different column names, some split amounts into "Debit" and "Credit" columns, and PDFs have wildly inconsistent layouts.

**Our approach:**

For CSVs, we built a fuzzy column mapper. Instead of requiring exact headers like "Amount" or "Description," the system looks for close matches. If a bank labels their column "Particulars" or "Narrative," we recognize it and map it correctly. If there are separate "Debit" and "Credit" columns, we merge them automatically.

For PDFs, we use a two-step process:
- First, we try to extract structured tables directly from the PDF using pdfplumber.
- If that fails (because the PDF is poorly formatted or text-based), we fall back to a regex engine that scans the raw text looking for patterns like dates and amounts.

This means users don't need to worry about formatting — they just upload their file and the system handles the rest.

### The AI Agents

We didn't want a single "chatbot" answering everything. Instead, we built specialized agents, each handling a specific domain:

- **Tax Agent** — Scans transactions for tax-deductible categories (medical expenses, donations, education) and suggests potential savings.
- **Risk Agent** — Looks at spending patterns and flags things like "You're spending 45% of income on discretionary items" or "Your emergency fund is below the recommended 3-month threshold."
- **Savings Agent** — Finds spending "leaks" — recurring subscriptions you might have forgotten, or categories where small daily expenses add up to large monthly totals.
- **Fraud Detection Agent** — This is our most technically interesting agent. It runs mathematical checks on the data (more on this below).
- **Forecast Agent** — Powers the What-If simulator by projecting how hypothetical transactions would affect the user's financial health.

Each agent receives the user's transaction data, processes it through Google Gemini with a specialized prompt, and returns structured insights.

### Fraud Detection (Benford's Law)

This is something we're genuinely proud of. In real-world financial data, the leading digits of transaction amounts follow a specific mathematical distribution called Benford's Law. The digit "1" appears as the first digit about 30% of the time, while "9" appears only about 5% of the time.

When someone manually creates fake transaction data, they tend to distribute digits evenly — which violates this law. Our Fraud Agent checks for this, along with:

- **Round-number bias** — If an unusually high percentage of transactions are round numbers (₹500, ₹1000, ₹5000), it suggests manual entry rather than real bank activity.
- **Duplicate detection** — Identical transactions occurring within suspicious time windows.

The manager sees all of this as a "Reliability Score" in their forensic view.

### The Manager Command Center

We built a tabbed interface for bank managers with three views:

- **Financials** — Area charts and sparklines showing income vs. expense trends over time.
- **Logic** — Shows the reasoning chain behind the AI's scoring. This is important for transparency — the manager can see *why* a customer got a particular health score.
- **Forensics** — Displays the fraud detection results, including the Benford's Law deviation and reliability score.

### The What-If Simulator

This feature lets users test financial decisions before committing. For example, a user can input "Buy a laptop for ₹50,000" and the system will project how that purchase would affect their health score, monthly budget, and savings goals — without actually modifying any real data.

The Forecast Agent provides a plain-English explanation like: "This purchase would reduce your health score from 78 to 65 and push your discretionary spending over budget by 12%."

### AI Notification Center

Instead of burying insights inside charts, we built a notification bell in the sidebar that collects the most important alerts from all agents. Users see color-coded notifications — red for critical warnings (budget breach), yellow for advisory tips (tax opportunity), and green for positive milestones (savings goal reached).

---

## How We Secured It

**Authentication:**
When a user logs in, the backend validates their password against a Bcrypt hash stored in the database. On success, it generates a JWT token with an expiry time. The frontend stores this token and sends it with every API request. The backend checks this token before processing any request — if it's expired or invalid, the request is rejected.

**Authorization:**
We enforce role-based access. Customer endpoints like `/api/dashboard` require a valid user token. Manager endpoints like `/api/admin/customer/{id}` require an admin token. A customer can never access the forensic tools, and a manager can't modify customer data.

**API Protection:**
CORS middleware restricts which domains can call our API. Only our official frontend URLs are whitelisted. This prevents malicious websites from making unauthorized requests to our backend.

---

## Database Design

We keep things simple with four main tables:

- **users** — Stores credentials (email, hashed password) and role (customer or admin).
- **transactions** — All uploaded financial records linked to user IDs.
- **health_scores** — Historical wellness scores so users can track improvement over time.
- **savings_goals** — User-defined targets with current progress tracking.

---

## Running the Project

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python seed_admin.py
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

The backend runs on `localhost:8000` and the frontend on `localhost:5173`.

---

## What's Next

If we continue developing CareBank AI beyond this competition, here's where we'd take it:

1. **Live bank integration** — Connect to APIs like Plaid or Yodlee so users don't need to manually upload statements.
2. **Better OCR** — Add Tesseract for processing scanned or handwritten statements.
3. **Production database** — Migrate from SQLite to PostgreSQL.
4. **Long-term coaching** — Expand the Forecast Agent to provide automated monthly financial plans.
5. **Mobile app** — Build a React Native companion for on-the-go access.

---

We built CareBank AI because we believe financial tools should do more than display numbers. They should actively help people make smarter decisions — and give institutions the confidence that the data they're working with is genuine.

Thank you for taking the time to review our work.
