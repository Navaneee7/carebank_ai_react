# CareBank – Personalized Banking & Financial Wellness System

CareBank is an AI-powered financial wellness dashboard that leverages Generative and Agentic AI to help users track spending, detect risks, forecast cash flow, and get personalized financial advice.

## 🌟 Features

*   **Multi-Agent AI Analysis**:
    *   **Spending Monitor Agent**: Categorizes your raw transaction data.
    *   **Risk Agent**: Uses machine learning (`IsolationForest`) to detect anomalies and flag risky spending behavior.
    *   **Budget Agent**: Calculates your total income, total expenses, and assigns a Financial Health Score (0-100).
    *   **Forecast Agent**: Uses a rolling average to predict next month's cash flow.
*   **Conversational AI Advisor**: Chat directly with a Gemini-powered financial advisor that understands your specific budget and transaction history.
*   **Interactive Dashboard**: Upload your CSV, adjust budget limits, and view beautiful charts of your financial health.

---

## 🏗️ Tech Stack

*   **Frontend**: React + Vite, Material UI (MUI), Recharts, Lucide React.
*   **Backend**: Python + FastAPI, Pandas, Scikit-learn.
*   **AI Integration**: Google GenAI (`gemini-2.5-flash`).

---

## 🚀 How to Run the App

The project is split into two separate servers. You need to run both concurrently in separate terminal windows.

### 1. Backend (FastAPI + AI Agents)

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file inside the `backend` folder and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the FastAPI server:
   ```bash
   python main.py
   ```
   *The backend will be running at `http://localhost:8000`.*

### 2. Frontend (React + Vite)

1. Open a **new** terminal window and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install the Node.js packages:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The frontend will be running at `http://localhost:5173`.*

---

## 💡 How to Use the Dashboard

1. Open `http://localhost:5173` in your browser.
2. In the **Sidebar**, upload your bank statement. (A sample `transactions.csv` is provided in the root folder).
3. **Important:** The CSV must contain the columns: `Date`, `Description`, and `Amount`.
4. Adjust your monthly budget limits for Food, Transport, Shopping, and Other.
5. Click **"Run AI Analysis"**.
6. View your dashboard, charts, and Risk Alerts. 
7. Use the chat widget on the bottom to ask the AI for custom financial advice!

---

## 🔒 Notes on the AI Chat

If the Gemini API reaches its free-tier rate limit (Quota Exceeded), the chat will automatically and gracefully fall back to a rule-based advisor to ensure the app continues working without crashing.
