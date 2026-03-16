# 🏦 CareBank AI – Next-Gen Financial Intelligence 🚀

CareBank is a premium, AI-driven financial wellness platform designed for both **Customers** and **Bank Managers**. It transforms raw transaction data into actionable insights using a multi-agent AI system powered by **Gemini 2.0 Flash**.

![CareBank Banner](https://img.shields.io/badge/AI-Agentic%20Finance-blueviolet?style=for-the-badge) ![React](https://img.shields.io/badge/Frontend-React%20%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![FastAPI](https://img.shields.io/badge/Backend-FastAPI-005571?style=for-the-badge&logo=fastapi)

---

## 🌟 Key Features

### 👤 For Customers (Financial Wellness)
*   **Savings Goals Tracker**: Set financial targets with real-time progress bars and AI timelines.
*   **Spending Trends**: Visual month-over-month comparisons of income vs. expenses.
*   **Tax Estimator**: Automatic detection of deductible expenses (Section 80C/80D) and estimated tax liability.
*   **Health Score History**: Track your financial well-being over time with interactive line charts.
*   **Smart Bill Reminders**: Detects recurring payments and notifies you before they are due.
*   **AI Wealth Advisor**: A conversational agent that knows your specific budget and transaction history.
*   **Dark/Light Mode**: Premium glassmorphic UI with a seamless theme toggle.

### 💼 For Bank Managers (Portfolio Management)
*   **Customer Search & Filter**: Instant filtering by Health Score, risk level, or customer name.
*   **Flag for Review**: Mark high-risk customers for manual follow-up with internal notes.
*   **Portfolio Export**: One-click CSV export of the entire customer portfolio.
*   **System-wide Alerts**: Real-time notifications when a customer's score drops below a critical threshold.

---

## 🧠 The AI Agent Engine
CareBank uses a coordinated **Multi-Agent Orchestrator**:
1.  **Spending Agent**: Categorizes transactions using fuzzy logic and keyword matching.
2.  **Risk Agent**: Uses `IsolationForest` to detect anomalous spending patterns.
3.  **Tax Agent**: identifies tax-deductible investments and expenses.
4.  **Multi-Month Agent**: Analyzes long-term trends across multiple statements.
5.  **Personalized Advisor**: A Gemini-powered LLM that provides human-like financial coaching.

---

## 🏗️ Technical Stack
*   **Frontend**: React, Vite, Recharts (Charts), Lucide (Icons), Framer Motion.
*   **Backend**: Python, FastAPI, SQLAlchemy (SQLite), Pandas.
*   **AI**: Google Gemini Pro / Flash API.

---

## 🚀 Getting Started

### 1. Prerequisites
*   Python 3.10+
*   Node.js 18+
*   Gemini API Key ([Get it here](https://aistudio.google.com/))

### 2. Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Create a .env file:
# GEMINI_API_KEY=your_key_here
python main.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📂 Sample Data
You can test the platform using the `transactions.csv` file located in the root directory. It contains pre-categorized spending and income to showcase the **Health History** and **Tax Estimator** features.

---

## 🔒 Security
*   JWT-based Authentication for both Customers and Managers.
*   Local SQLite database for data privacy.
*   Graceful fallback for AI services if quota limit is reached.

---
*Created with ❤️ by Antigravity AI for CareBank.*
