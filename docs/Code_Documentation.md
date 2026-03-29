# CareBank AI — Full Code Documentation

This document explains every file in the project, what it does, and how the pieces connect. Written for developers, reviewers, and judges who want to understand the codebase in detail.

---

## Project Structure

```
carebank_ai_react/
├── backend/
│   ├── main.py            ← API server (all endpoints live here)
│   ├── agents.py          ← AI agent classes (the brain of the app)
│   ├── auth.py            ← JWT authentication and password hashing
│   ├── models.py          ← Database table definitions
│   ├── database.py        ← Database connection setup
│   ├── seed_admin.py      ← Script to create the default admin account
│   ├── requirements.txt   ← Python dependencies
│   └── .env               ← API keys (not committed to Git)
│
├── frontend/src/
│   ├── App.jsx            ← Root component (routing, auth state)
│   ├── main.jsx           ← React entry point
│   ├── index.css          ← Global styles and design system
│   ├── components/
│   │   ├── Dashboard.jsx         ← Customer dashboard (main view)
│   │   ├── ManagerDashboard.jsx  ← Bank manager oversight panel
│   │   ├── Sidebar.jsx           ← Navigation, upload, and budget controls
│   │   ├── NotificationsPanel.jsx← AI notification bell dropdown
│   │   ├── ChatWidget.jsx        ← AI chat assistant
│   │   ├── Login.jsx             ← Login form
│   │   ├── Register.jsx          ← Registration form
│   │   ├── SpendingTrends.jsx    ← Monthly income vs expense bar chart
│   │   ├── ScoreHistory.jsx      ← Health score timeline chart
│   │   ├── TaxEstimator.jsx      ← Tax deduction breakdown
│   │   └── SavingsGoals.jsx      ← Savings target tracker
│   └── pages/
│       └── ForgotPassword.jsx    ← Password reset page
│
└── docs/                  ← Documentation for judges
```

---

## Backend Files

---

### `database.py` — Database Connection

This is the simplest file. It sets up the SQLite database connection using SQLAlchemy.

**What it does:**
- Creates a database engine pointing to `carebank.db` in the backend folder
- Sets up a session factory (`SessionLocal`) for creating database sessions
- Provides a `get_db()` dependency function that FastAPI endpoints use to get a database session. It automatically closes the session when the request is done.

**Why SQLite:** We chose SQLite because it's file-based and requires zero setup — perfect for a competition demo. In production, this would be swapped for PostgreSQL by changing one connection string.

---

### `models.py` — Database Tables

Defines all the database tables as Python classes using SQLAlchemy ORM.

**Tables:**

| Class | Table Name | What it Stores |
|-------|-----------|----------------|
| `User` | `users` | Username, hashed password, role (customer or banker) |
| `Transaction` | `transactions` | Individual financial records — date, description, amount, category |
| `Budget` | `budgets` | Per-category spending limits set by the user |
| `SavingsGoal` | `savings_goals` | User-defined savings targets with progress tracking |
| `HealthScoreHistory` | `health_score_history` | Historical health scores so users can see improvement over time |
| `CustomerFlag` | `customer_flags` | Records when a manager flags a customer account for review |

**Relationships:** Each table has a `user_id` foreign key back to the `users` table. SQLAlchemy `relationship()` calls let us access a user's transactions as `user.transactions` directly in Python.

---

### `auth.py` — Authentication & Security

Handles everything related to user identity — logging in, securing endpoints, and protecting passwords.

**Key functions:**

| Function | What it Does |
|----------|-------------|
| `get_password_hash(password)` | Takes a plain password, generates a random salt, and returns a one-way Bcrypt hash. Even if the database leaks, passwords can't be reversed. |
| `verify_password(plain, hashed)` | Compares a login attempt against the stored hash. Returns True/False. |
| `create_access_token(data)` | Creates a JWT token containing the username and an expiry timestamp. This token is what the frontend sends with every API request to prove identity. |
| `get_current_user(token)` | A FastAPI "dependency" that runs before every protected endpoint. It decodes the JWT, finds the user in the database, and returns the user object. If the token is invalid or expired, it throws a 401 error. |
| `get_current_admin(user)` | Extends `get_current_user` with a role check. If the user's role isn't "banker", it throws a 403 Forbidden error. This is what protects all manager-only endpoints. |

**Security constants:**
- Token expiry: 7 days
- Algorithm: HS256 (HMAC-SHA256)
- Secret key: loaded from environment variable, with a dev fallback

---

### `agents.py` — The AI Agent System

This is the most important file in the project. It contains 11 specialized agent classes and one Orchestrator that runs them all in sequence.

**Agent Breakdown:**

#### `SpendingMonitorAgent`
- **Job:** Categorize each transaction (Food, Transport, Shopping, Other)
- **How:** Keyword matching on the description field. "Swiggy" → Food, "Uber" → Transport, etc.
- The `run()` method adds a "Category" column to the DataFrame.

#### `RiskAgent`
- **Job:** Detect anomalous (unusually large or suspicious) transactions
- **How:** Uses scikit-learn's `IsolationForest` algorithm with a 10% contamination rate. Transactions that the model considers outliers are flagged.
- Returns a list of anomalous transaction records.

#### `BudgetAgent`
- **Job:** Calculate overall financial health
- **How:** Sums all positive amounts (income) and all negative amounts (expenses). Computes a health score as `((income - expense) / income) × 100`, clamped between 0 and 100.

#### `ForecastAgent`
- **Job:** Predict next month's cash flow
- **How:** Groups transactions by month, calculates a 2-period rolling average, and projects one month into the future. The result is returned as a time series for charting.

#### `SubscriptionAgent`
- **Job:** Find recurring bills
- **How:** Scans descriptions for keywords like "Netflix", "Spotify", "gym", "subscription". For each match, it estimates the next due date by adding one month to the last transaction date.

#### `MultiMonthAgent`
- **Job:** Break down performance by month
- **How:** Groups transactions by calendar month and sums income and expense separately. Used by the Manager Dashboard's trend charts.

#### `TaxAgent`
- **Job:** Estimate tax liability and find deductions
- **How:** Scans for tax-deductible keywords (insurance, charity, education, medical). Calculates taxable income as total income minus deductions, then applies a simplified 15% tax rate.

#### `PersonalizedBudgetAgent`
- **Job:** Suggest realistic budget limits
- **How:** Takes actual category spending and recommends limits that are 10% higher than current averages, rounded to the nearest ₹100. This gives users achievable targets.

#### `SavingsGoalAgent`
- **Job:** Recommend how to allocate surplus income
- **How:** If income exceeds expenses, it splits the surplus: 50% emergency fund, 30% investments, 20% guilt-free spending.

#### `FraudDetectionAgent`
- **Job:** Verify whether transaction data looks genuine
- **How:** Runs four mathematical checks:
  1. **Duplicate Detection** — Counts exact duplicate rows (same date, description, amount). If more than 10% are duplicates, it's suspicious.
  2. **Round Number Bias** — Checks what percentage of amounts are round numbers (divisible by 100). Real bank data typically has varied amounts; a high round-number ratio suggests manual entry.
  3. **Benford's Law** — Counts the frequency of leading digits. In naturally occurring data, "1" should appear ~30% of the time. If it's below 20% or above 45%, the data may be fabricated.
  4. **Temporal Consistency** — Checks if transactions are suspiciously evenly spaced. Real spending has irregular gaps; perfectly regular intervals suggest generated data.
- Returns a reliability score (0-100), public flags (shown to users), and private flags (shown only to managers).

#### `WealthAssistantAgent`
- **Job:** Generate human-readable advice and build context for the chat AI
- **How:** Evaluates the health score and budget alerts to produce emoji-prefixed recommendations. Also builds a structured text summary that gets sent to Google Gemini as context for the chat assistant.

#### `Orchestrator`
- **Job:** Run all 11 agents in the correct order and combine their results
- **How:** Initializes all agents in `__init__`. The `execute()` method:
  1. Categorizes spending (SpendingMonitorAgent)
  2. Detects anomalies (RiskAgent)
  3. Calculates budget summary (BudgetAgent)
  4. Generates forecast (ForecastAgent)
  5. Finds subscriptions (SubscriptionAgent)
  6. Recommends savings allocation (SavingsGoalAgent)
  7. Breaks down category spending
  8. Checks budget limits and generates alerts
  9. Runs fraud detection (FraudDetectionAgent)
  10. Generates advice (WealthAssistantAgent)
  11. Calculates monthly trends (MultiMonthAgent)
  12. Estimates taxes (TaxAgent)
  13. Suggests personalized budgets (PersonalizedBudgetAgent)
  14. Creates AI notifications for the frontend bell
- Returns a single dictionary with all results.

---

### `main.py` — The API Server

This is where all the HTTP endpoints live. It ties together the database, authentication, and AI agents.

**Startup:**
- Loads environment variables from `.env`
- Creates all database tables if they don't exist
- Initializes the FastAPI app with CORS middleware (allows requests from localhost:5173 and localhost:3000)
- Creates a single Orchestrator instance that all requests share

**Endpoints:**

| Method | Path | Auth | What it Does |
|--------|------|------|-------------|
| `POST` | `/api/register` | None | Creates a new user with hashed password, returns JWT token |
| `POST` | `/api/login` | None | Validates credentials, returns JWT + role |
| `POST` | `/api/reset-password` | None | Updates a user's password hash |
| `GET` | `/api/dashboard` | User | Runs all agents on the user's transactions, saves health score to history, returns full analysis. Strips private fraud flags before returning. |
| `POST` | `/api/upload` | User | Accepts CSV or PDF file, parses it, maps columns, saves transactions to database. Includes rate limiting (max 150 transactions per 5 minutes). |
| `POST` | `/api/simulate` | User | Takes a hypothetical purchase amount and category, injects it into the user's real data as a temporary transaction, runs the full analysis pipeline, and returns the projected health score without saving anything. |
| `POST` | `/api/chat` | User | Sends user message + financial context to Google Gemini. Falls back to local Ollama, then to rule-based responses. |
| `GET` | `/api/goals` | User | Returns user's savings goals |
| `POST` | `/api/goals` | User | Creates a new savings goal |
| `PATCH` | `/api/goals/{id}` | User | Updates saved amount for a goal |
| `DELETE` | `/api/goals/{id}` | User | Deletes a savings goal |
| `GET` | `/api/score-history` | User | Returns historical health scores |
| `GET` | `/api/suggested-budgets` | User | Returns AI-suggested budget limits based on actual spending |
| `GET` | `/api/admin/customers` | Admin | Runs analysis on ALL customers, returns portfolio overview with fraud flags |
| `GET` | `/api/admin/customer/{id}` | Admin | Deep-dive analysis on a specific customer |
| `GET` | `/api/admin/customers/export` | Admin | Downloads customer portfolio as CSV |
| `POST` | `/api/admin/flag/{id}` | Admin | Records a flag against a customer account |

**PDF Parsing (`parse_pdf` function):**
The dual-pass PDF extractor is defined directly in main.py:
- **Pass 1:** Uses pdfplumber to extract structured tables from each page
- **Pass 2:** If tables yield fewer than 2 rows, falls back to regex text extraction. The pattern looks for lines matching `DD/MM/YYYY Description Amount` formats.
- Converts results to a DataFrame with Date, Description, Amount columns.

**Column Mapping:**
After parsing, the upload endpoint runs a fuzzy mapper:
- Checks if columns contain keywords like "date", "desc", "particulars", "amount", "debit", "credit"
- If separate Debit and Credit columns exist, it merges them into a single Amount column (credit positive, debit negative)
- Cleans amount strings by removing commas and currency symbols
- Parses dates into a consistent YYYY-MM-DD format

---

## Frontend Files

---

### `App.jsx` — Root Component

The entry point for the React application. Handles three things:

1. **Authentication State:** Stores the JWT token and user role in React state and localStorage. If no token exists, redirects to login.
2. **Routing:** Uses React Router with four routes: `/login`, `/register`, `/forgot-password`, and `/` (main dashboard).
3. **Data Loading:** The `MainView` component calls `/api/dashboard` (for customers) or `/api/admin/customers` (for managers) on mount. It also handles file upload by posting to `/api/upload` and then refreshing the dashboard.

**Key decision:** The role determines which dashboard component renders. Customers see `<Dashboard>`, managers see `<ManagerDashboard>`.

---

### `Sidebar.jsx` — Navigation Panel

The left-side panel present on every authenticated page.

**Features:**
- **File Upload:** Drag-and-drop or click-to-browse area that accepts .csv and .pdf files
- **Budget Controls:** Four input fields for spending limits (Food, Transport, Shopping, Other) with a "Suggest" button that calls `/api/suggested-budgets`
- **Notification Bell:** Renders the `<NotificationsPanel>` component with real agent data
- **Theme Toggle:** Switches between dark and light mode
- **Role Awareness:** Hides the upload and budget sections when the user is a bank manager

---

### `Dashboard.jsx` — Customer Dashboard

The main view for customers. Uses a tab-based layout with five sections:

**Overview Tab:**
- Three KPI cards: Total Income, Total Expense, Health Score (with fraud verification badge)
- Pie chart showing spending distribution by category (Recharts)
- Area chart showing cashflow forecast with actual vs predicted lines
- Bill reminders from the Subscription Agent
- Budget alerts showing categories that are over or near their limits
- **What-If Simulator**: Input fields for amount and category, "Simulate" button that calls `/api/simulate`, and a results panel showing projected health score change and budget risk
- Wealth Assistant advice cards from the AI agents

**Other Tabs:**
- **Spending Trends** → `<SpendingTrends>` component
- **Health History** → `<ScoreHistory>` component
- **Tax Estimator** → `<TaxEstimator>` component
- **Savings Goals** → `<SavingsGoals>` component

Also includes a first-time onboarding tour that walks new users through the app's features.

---

### `ManagerDashboard.jsx` — Bank Manager Panel

The oversight interface for bank managers. Significantly different from the customer dashboard.

**Portfolio Overview:**
- Four KPI cards: Active Customers, Average Health Score, Risk Alerts Active, Average Data Reliability
- Warning banner if any customer has a health score below 40

**Customer Table:**
- Searchable and filterable list of all customers
- Shows: username, health score (with progress bar), data reliability badge, fraud flags (private — only managers see these), risk anomaly count, transaction count
- "View Details" button opens the Command Center modal
- "Flag" button lets managers mark accounts for internal review

**Command Center Modal (per customer):**
Three tabs:
1. **Financials** — Area chart of monthly income vs expense trend, bar chart of spending forecast
2. **Logic** — Multi-agent reasoning trace (shows each agent's advice), subscription list, savings strategy
3. **Forensics** — Large reliability score display, private fraud flags (Benford's Law violations, round number bias, etc.), tax analysis, anomaly trace

---

### `NotificationsPanel.jsx` — AI Notification Bell

A self-contained dropdown component.

- Shows a bell icon with an unread count badge
- Clicking opens a fixed-position dropdown (positioned at top-left of viewport to avoid clipping)
- Lists each notification with an icon (mapped from agent names), message text, and an "Agent N • Just Now" label
- Empty state shows "All agents are quiet. Your finances look stable!"
- Bottom bar shows "Proactive Monitoring Active"

---

### `ChatWidget.jsx` — AI Chat Assistant

A floating chat interface that connects to Google Gemini.

- Maintains a message history in state (starts with a welcome message)
- Sends user messages to `/api/chat` with the current financial context
- Displays AI responses with Markdown rendering (using `react-markdown`)
- Shows a loading spinner while waiting for AI response
- Auto-scrolls to the latest message

---

### `Login.jsx` — Login Page

Standard login form with:
- Username and password fields (password has show/hide toggle)
- Submits as `application/x-www-form-urlencoded` (required by OAuth2PasswordRequestForm on the backend)
- Stores returned JWT token and role via the `setAuth` callback
- Links to Register and Forgot Password pages
- Shows error messages on failed login

---

### Supporting Components

| File | Purpose |
|------|---------|
| `Register.jsx` | Registration form — same structure as Login, calls `/api/register` |
| `ForgotPassword.jsx` | Password reset form — calls `/api/reset-password` |
| `SpendingTrends.jsx` | Bar chart comparing monthly income vs expenses using Recharts |
| `ScoreHistory.jsx` | Line chart of historical health scores, fetched from `/api/score-history` |
| `TaxEstimator.jsx` | Displays deductible items, total deductions, taxable income, and estimated tax |
| `SavingsGoals.jsx` | CRUD interface for savings goals — create, update progress, delete |

---

## How Everything Connects

```
User clicks "Analyze" in Sidebar
    → Sidebar sends file to App.jsx handleAnalyze()
    → App.jsx POSTs file to /api/upload
    → main.py parses CSV/PDF, maps columns, saves to DB
    → App.jsx GETs /api/dashboard
    → main.py loads user's transactions from DB
    → main.py calls orchestrator.execute(df)
    → Orchestrator runs all 11 agents in sequence
    → Returns combined results to App.jsx
    → App.jsx passes data to Dashboard.jsx
    → Dashboard renders charts, KPIs, and simulator
    → Notifications data flows to Sidebar → NotificationsPanel
```

```
Manager logs in (role = "banker")
    → App.jsx GETs /api/admin/customers
    → main.py verifies admin JWT via get_current_admin()
    → Runs orchestrator.execute() for EACH customer
    → Returns portfolio data to ManagerDashboard.jsx
    → Manager clicks "View Details" on a customer
    → ManagerDashboard GETs /api/admin/customer/{id}
    → Detailed analysis with private fraud flags returned
    → Command Center modal renders Financials/Logic/Forensics tabs
```

---

*This documentation covers every file in the CareBank AI codebase. For a higher-level overview of the project's features and design decisions, see `CareBank_AI_Documentation.md`.*
