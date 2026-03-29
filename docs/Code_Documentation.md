# CareBank AI — Code Documentation

This document walks through every file in our project and explains how it all fits together. We wrote this so that anyone reading our code — whether a judge, a teammate, or a future developer — can quickly understand what each piece does and why we built it the way we did.

---

## How the Project is Organized

```
carebank_ai_react/
├── backend/
│   ├── main.py            ← Where all the API endpoints live
│   ├── agents.py          ← The AI agent classes (this is the core of the app)
│   ├── auth.py            ← Login, JWT tokens, and password security
│   ├── models.py          ← Database table definitions
│   ├── database.py        ← Database connection setup
│   ├── seed_admin.py      ← Creates the default bank manager account
│   ├── requirements.txt   ← Python dependencies
│   └── .env               ← API keys (kept private)
│
├── frontend/src/
│   ├── App.jsx            ← The root component — handles routing and auth
│   ├── main.jsx           ← React entry point
│   ├── index.css          ← All the styling
│   ├── components/
│   │   ├── Dashboard.jsx         ← What customers see
│   │   ├── ManagerDashboard.jsx  ← What bank managers see
│   │   ├── Sidebar.jsx           ← File upload, budgets, navigation
│   │   ├── NotificationsPanel.jsx← The AI notification bell
│   │   ├── ChatWidget.jsx        ← Chat with the AI assistant
│   │   ├── Login.jsx             ← Login page
│   │   ├── Register.jsx          ← Sign-up page
│   │   ├── SpendingTrends.jsx    ← Monthly spending chart
│   │   ├── ScoreHistory.jsx      ← Health score over time
│   │   ├── TaxEstimator.jsx      ← Tax deduction breakdown
│   │   └── SavingsGoals.jsx      ← Savings target tracker
│   └── pages/
│       └── ForgotPassword.jsx    ← Password reset
│
└── docs/                  ← You're reading this right now
```

---

## Backend — The Server Side

### `database.py`

This is the simplest file in the project. It connects our app to a SQLite database file called `carebank.db`.

We went with SQLite because it doesn't need any external setup — no servers to install, no configurations to manage. It's just a file. For a competition demo, that's exactly what we needed. If we ever move to production, we'd swap the connection string to point at PostgreSQL instead. The rest of the code wouldn't need to change.

The `get_db()` function is a FastAPI "dependency" — it creates a database session at the start of each request and closes it when the request finishes. This prevents connection leaks.

---

### `models.py`

This is where we define our database tables. We use SQLAlchemy's ORM, which means we write Python classes instead of SQL — it's cleaner and catches errors earlier.

We have six tables:

- **users** — Stores login credentials and whether someone is a "customer" or "banker." Passwords are never stored as plain text.
- **transactions** — Every row from an uploaded bank statement ends up here, linked to the user who uploaded it.
- **budgets** — The spending limits users set for categories like Food, Transport, and Shopping.
- **savings_goals** — When a user creates a goal like "Emergency Fund — ₹1,00,000 by December," it goes here.
- **health_score_history** — Every time we calculate a health score, we save it so users can track improvement over time.
- **customer_flags** — When a bank manager flags a customer's account for review, the reason and timestamp get recorded here.

All tables link back to the users table through foreign keys. SQLAlchemy relationships let us write things like `user.transactions` to get all transactions for a user in one line.

---

### `auth.py`

This handles everything about identity — who are you, and are you allowed to do this?

**Password hashing:** When someone registers, we don't store their password. We pass it through Bcrypt, which generates a one-way hash. Even if someone got access to our database, they couldn't reverse the passwords. When someone logs in, we hash what they typed and compare it to what's stored.

**JWT tokens:** After a successful login, we create a JSON Web Token — a signed, encoded string containing the username and an expiry timestamp. The frontend sends this token with every API request. Our server decodes it, finds the user, and either proceeds or rejects the request.

**Role checking:** We have a `get_current_admin()` function that wraps `get_current_user()` with an extra check — if your role isn't "banker," you get a 403 Forbidden error. This is what keeps customers out of the manager endpoints.

---

### `agents.py` — The Heart of the App

This file is where most of the intelligence lives. We built 11 separate agent classes, each responsible for one specific type of analysis, plus an Orchestrator that runs them all together.

The idea was that no single agent tries to do everything. Each one is small, focused, and easy to understand on its own.

**SpendingMonitorAgent** — Goes through each transaction and assigns a category based on keywords in the description. "Swiggy" becomes Food, "Uber" becomes Transport, "Amazon" becomes Shopping. Anything it can't match goes into "Other." We kept this intentionally simple because it runs on every single transaction.

**RiskAgent** — Uses an algorithm called Isolation Forest (from scikit-learn) to find transactions that look unusual compared to the rest. If you normally spend ₹200–₹500 at restaurants and one day there's a ₹15,000 charge, this agent will flag it. We set the contamination rate at 10%, meaning it expects roughly 1 in 10 transactions to be anomalous.

**BudgetAgent** — The simplest agent. It adds up all income (positive amounts) and all expenses (negative amounts), then calculates a health score: `((income - expense) / income) × 100`. We clamp it between 0 and 100 so the number always makes sense on the UI.

**ForecastAgent** — Groups transactions by month, calculates a two-period rolling average, and uses it to predict next month's cash flow. The math is straightforward, but the visual impact on the dashboard is significant — users can see where their money is heading.

**SubscriptionAgent** — Scans descriptions for words like "Netflix," "Spotify," "gym," or "subscription." When it finds a match, it estimates the next payment date by adding 30 days to the last occurrence. This powers the "Bill Reminders" section on the dashboard.

**MultiMonthAgent** — Breaks transactions into monthly buckets and sums income and expenses separately. The manager dashboard uses this data for its trend charts.

**TaxAgent** — Looks for transactions that might be tax-deductible — insurance payments, charitable donations, education fees, medical expenses. It totals them up, subtracts from income, and applies a simplified 15% tax rate. It's not meant to replace a CA, but it gives users a rough idea.

**PersonalizedBudgetAgent** — Takes the user's actual spending per category and suggests budget limits that are 10% higher than their current average, rounded to the nearest ₹100. The idea is to give people targets that are realistic, not arbitrary.

**SavingsGoalAgent** — Checks if income exceeds expenses, and if so, splits the surplus into three buckets: 50% emergency fund, 30% investments, 20% guilt-free spending. If there's no surplus, it tells the user.

**FraudDetectionAgent** — This is the one we're most proud of. It runs four checks:

1. **Duplicates** — Counts rows that are exactly identical (same date, description, and amount). A few duplicates might be normal, but if more than 10% of the data is duplicated, something's off.

2. **Round numbers** — Checks how many amounts are perfectly divisible by 100. Real bank transactions tend to have odd amounts (₹247, ₹1,349). If 80%+ of your data is round numbers like ₹500 or ₹1,000, it suggests someone typed them in manually.

3. **Benford's Law** — In real financial data, the digit "1" appears as the leading digit about 30% of the time, while "9" appears only about 5%. When people make up numbers, they tend to spread digits evenly. If the "1" frequency is below 20% or above 45%, we flag it as a statistical anomaly.

4. **Temporal consistency** — Real spending is irregular — you buy groceries on random days, pay bills on different dates. If the gaps between transactions are suspiciously uniform (standard deviation less than 0.5 days), it could mean the data was generated by a script.

Each check deducts points from a starting score of 100. The result is a "Reliability Score" — above 80 is "Verified," 50-80 is "Suspicious," below 50 is "Likely Manipulated." The agent also separates its findings into "public flags" (safe to show users) and "private flags" (only visible to managers).

**WealthAssistantAgent** — Looks at the overall picture — health score, budget alerts, subscriptions — and generates human-readable advice with emoji prefixes. It also builds a structured text summary that we send to Google Gemini as context for the chat assistant, so the AI can reference the user's actual financial data.

**Orchestrator** — This is the conductor. It initializes all 11 agents and has a single `execute()` method that runs them in the right order, collects all their outputs, and returns one combined dictionary. Every endpoint that needs financial analysis calls `orchestrator.execute()`.

---

### `main.py` — The API

This is the biggest file. It defines all the HTTP endpoints and wires everything together.

When the server starts, it loads environment variables, creates the database tables (if they don't exist), sets up CORS to allow requests from our frontend, and creates a single Orchestrator instance.

Here are the key endpoints and what they do:

**Authentication:**
- `POST /api/register` — Creates a new user, hashes the password, returns a JWT
- `POST /api/login` — Validates credentials, returns JWT and role
- `POST /api/reset-password` — Changes a user's password

**Customer endpoints (need a valid user token):**
- `GET /api/dashboard` — The main one. Loads all the user's transactions, runs the entire agent pipeline, saves the new health score to history, and returns everything. Before responding, it strips out the private fraud flags so customers never see them.
- `POST /api/upload` — Accepts a CSV or PDF, parses it, maps the columns to our standard format, and saves the transactions. Has a basic rate limiter to prevent abuse.
- `POST /api/simulate` — Takes a hypothetical purchase (amount + category), adds it to the user's real data as a temporary row, runs the full pipeline, and returns the projected health score. Nothing is saved — it's purely a "what if" calculation.
- `POST /api/chat` — Sends the user's question plus their financial context to Google Gemini. If Gemini is unavailable, it tries a local Ollama instance. If that also fails, it falls back to simple rule-based responses.
- Goal management endpoints (`GET/POST/PATCH/DELETE /api/goals`)
- `GET /api/score-history` — Returns historical health scores for charting
- `GET /api/suggested-budgets` — Returns AI-recommended budget limits

**Manager endpoints (need an admin token):**
- `GET /api/admin/customers` — Runs analysis on every customer and returns a portfolio overview including fraud flags
- `GET /api/admin/customer/{id}` — Deep-dive analysis on one customer, including private forensic data
- `GET /api/admin/customers/export` — Downloads the portfolio as a CSV file
- `POST /api/admin/flag/{id}` — Records a flag against a customer's account

**The PDF parser** deserves special mention. We built a two-step approach:
- First, it tries to extract structured tables directly from the PDF using pdfplumber. This works well for statements that have clean table layouts.
- If that yields fewer than two rows (which means the PDF probably doesn't have proper tables), it falls back to a regex pattern that scans the raw text for lines that look like "date description amount."

**The column mapper** handles the fact that every bank names their columns differently. It fuzzy-matches headers like "Particulars" or "Narrative" to "Description," and "Value Date" to "Date." If it finds separate "Debit" and "Credit" columns, it merges them into a single "Amount" column automatically.

---

## Frontend — What Users See

### `App.jsx`

The root of the React application. It manages three things:

1. **Auth state** — Keeps the JWT token and user role in React state and localStorage. If there's no token, you get redirected to login.
2. **Routing** — Four routes: login, register, forgot password, and the main dashboard.
3. **Data loading** — When authenticated, it fetches dashboard data from the API. For customers, it calls `/api/dashboard`. For managers, it calls `/api/admin/customers`. It also handles file upload by posting to `/api/upload` and refreshing the dashboard.

The role determines which dashboard renders — customers see `Dashboard`, managers see `ManagerDashboard`.

---

### `Sidebar.jsx`

The left panel that's always visible when you're logged in.

For customers, it has a drag-and-drop upload area (accepts .csv and .pdf), four budget input fields with a "Suggest" button that fetches AI-recommended limits, and an "Analyze Finances" button that triggers the full pipeline.

For bank managers, the upload and budget sections are hidden — managers don't upload their own data.

Both roles see the notification bell (renders `NotificationsPanel` with real agent data), a theme toggle (dark/light mode), and a logout button.

---

### `Dashboard.jsx`

This is what customers spend most of their time looking at. It uses a tab layout with five sections:

The **Overview tab** is the densest. It shows three KPI cards (income, expense, health score with a fraud verification badge), a pie chart of spending by category, an area chart of cashflow forecast, bill reminders, budget alerts, the What-If Simulator (input an amount and category, hit "Simulate," and see your projected health score change), and advice cards from the AI agents.

The other tabs are **Spending Trends** (monthly income vs expense bars), **Health History** (line chart of scores over time), **Tax Estimator** (deductible items and estimated tax), and **Savings Goals** (create and track savings targets).

There's also a first-time onboarding tour that walks new users through the app.

---

### `ManagerDashboard.jsx`

Completely different from the customer dashboard — this is built for oversight, not personal finance.

At the top, four KPI cards show portfolio-level metrics: total customers, average health score, active risk alerts, and average data reliability.

Below that, a searchable table lists every customer with their health score (shown as a colored progress bar), data reliability badge, private fraud flags (only managers see these), risk anomaly count, and total transactions.

Clicking "View Details" opens the **Command Center modal** — a full-screen overlay with three tabs:
- **Financials** — Area charts of monthly income vs expense, bar charts of spending forecast
- **Logic** — The AI's reasoning chain (what each agent concluded), subscription list, savings strategy
- **Forensics** — The big reliability percentage, private fraud flag details (Benford's Law violations, round number bias, temporal issues), tax analysis, and anomaly traces

Managers can also flag accounts by clicking the flag icon and entering a reason.

---

### `NotificationsPanel.jsx`

A self-contained component that lives in the Sidebar. It shows a bell icon with a red badge showing the count of active notifications.

Clicking the bell opens a fixed-position dropdown (we had to use `position: fixed` because absolute positioning caused clipping inside the sidebar's overflow container). Each notification shows an icon matching the agent type, the message text, and a label like "Agent 1 • Just Now."

If there are no notifications, it shows a friendly "All agents are quiet" message.

---

### `ChatWidget.jsx`

A chat interface at the bottom of the customer dashboard. It maintains a conversation history starting with a welcome message.

When you type a question and hit send, it posts your message along with your financial context to `/api/chat`. The AI (Gemini) responds with advice that references your actual data. Responses are rendered with Markdown formatting. There's a loading spinner while waiting and auto-scroll to keep the latest message visible.

---

### `Login.jsx`

A straightforward login form — username field, password field (with a show/hide toggle), and a submit button. It sends credentials as form-urlencoded data (which is what FastAPI's OAuth2 scheme expects). On success, it stores the JWT and role and redirects to the dashboard. Links to Register and Forgot Password are at the bottom.

The other auth pages (`Register.jsx` and `ForgotPassword.jsx`) follow the same pattern with minor variations.

---

### Supporting Components

- **SpendingTrends.jsx** — Takes monthly trend data and renders side-by-side bars for income vs expenses using Recharts.
- **ScoreHistory.jsx** — Fetches `/api/score-history` and draws a line chart so users can see if their financial habits are improving.
- **TaxEstimator.jsx** — Displays a list of deductible transactions, total deductions, taxable income, and the estimated tax amount.
- **SavingsGoals.jsx** — Full CRUD interface for savings goals. Users can create goals (name, target, deadline), update their saved amount, and delete completed goals.

---

## How It All Fits Together

Here's the flow when a customer uploads a bank statement:

```
1. User drags a file into the Sidebar upload area
2. Sidebar passes the file to App.jsx
3. App.jsx POSTs the file to /api/upload
4. main.py parses the CSV or PDF
5. The column mapper standardizes headers
6. Transactions are saved to the database
7. App.jsx then GETs /api/dashboard
8. main.py loads the user's transactions
9. The Orchestrator runs all 11 agents in sequence
10. Results are sent back to App.jsx
11. Dashboard.jsx renders everything — charts, KPIs, simulator
12. Notification data flows to Sidebar → NotificationsPanel
```

And when a bank manager opens the Command Center:

```
1. Manager logs in (role = "banker")
2. App.jsx GETs /api/admin/customers
3. Backend verifies admin JWT
4. Orchestrator runs on every customer's data
5. Portfolio overview renders in ManagerDashboard
6. Manager clicks "View Details" on a customer
7. Frontend GETs /api/admin/customer/{id}
8. Full analysis with private fraud flags is returned
9. Command Center modal shows Financials / Logic / Forensics
```

---

We tried to keep each file focused on one responsibility. The backend agents don't know about HTTP or databases — they just process DataFrames. The API endpoints don't know about math — they just call the Orchestrator. And the frontend components don't know about data processing — they just render what the API sends them. This separation made the codebase much easier to debug and extend as we added features.
