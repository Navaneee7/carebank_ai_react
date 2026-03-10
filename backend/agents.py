"""
CareBank AI – Multi-Agent System
Implements 5 specialized agents + an Orchestrator for financial analysis.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest


class SpendingMonitorAgent:
    """Tracks transactions and categorizes spending."""

    CATEGORY_MAP = {
        "swiggy": "Food",
        "zomato": "Food",
        "uber": "Transport",
        "amazon": "Shopping",
    }

    def run(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df["Category"] = df["Description"].apply(self._categorize)
        return df

    def _categorize(self, description: str) -> str:
        desc_lower = str(description).lower()
        for keyword, category in self.CATEGORY_MAP.items():
            if keyword in desc_lower:
                return category
        return "Other"


class RiskAgent:
    """Uses IsolationForest to detect anomalous transactions."""

    def run(self, df: pd.DataFrame) -> list[dict]:
        if len(df) < 5:
            return []

        clf = IsolationForest(contamination=0.1, random_state=42)
        labels = clf.fit_predict(df[["Amount"]])
        anomaly_mask = labels == -1
        anomalies = df[anomaly_mask].copy()
        return anomalies.to_dict(orient="records")


class BudgetAgent:
    """Calculates income, expenses, and a financial health score (0-100)."""

    def run(self, df: pd.DataFrame) -> dict:
        income = float(df[df["Amount"] > 0]["Amount"].sum())
        expense = float(abs(df[df["Amount"] < 0]["Amount"].sum()))
        score = int(((income - expense) / income) * 100) if income > 0 else 0
        score = max(0, min(score, 100))
        return {"income": income, "expense": expense, "health_score": score}


class ForecastAgent:
    """Uses a 2-period rolling average on monthly data to predict cash flow."""

    def run(self, df: pd.DataFrame) -> list[dict]:
        df = df.copy()
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df = df.dropna(subset=["Date"])

        # Use "ME" for pandas>=2.2, fall back to "M" for older versions
        try:
            monthly = (
                df.groupby(pd.Grouper(key="Date", freq="ME"))["Amount"]
                .sum()
                .reset_index()
            )
        except ValueError:
            monthly = (
                df.groupby(pd.Grouper(key="Date", freq="M"))["Amount"]
                .sum()
                .reset_index()
            )

        if len(monthly) < 2:
            return []

        monthly["Forecast"] = monthly["Amount"].rolling(2).mean()

        # Predict next month
        last_date = monthly["Date"].max()
        next_month = last_date + pd.DateOffset(months=1)
        next_forecast = monthly["Amount"].iloc[-2:].mean()
        next_row = pd.DataFrame(
            [{"Date": next_month, "Amount": None, "Forecast": next_forecast}]
        )
        monthly = pd.concat([monthly, next_row], ignore_index=True)

        monthly["Date"] = monthly["Date"].dt.strftime("%Y-%m")
        result = monthly.to_dict(orient="records")
        # Convert NaN to None for JSON serialization
        for row in result:
            for key, val in row.items():
                if isinstance(val, float) and np.isnan(val):
                    row[key] = None
        return result


class AdvisorAgent:
    """Evaluates health score and formats financial context for the AI chat."""

    def run(self, health_score: int) -> str:
        if health_score > 75:
            return "🟢 Strong financial stability. Consider diversified investments."
        elif health_score > 50:
            return "🟡 Moderate financial health. Optimize discretionary spending."
        else:
            return "🔴 Financial risk detected. Immediate expense correction advised."

    def build_context(self, budget_summary: dict, category_spending: dict) -> str:
        return (
            f"User Financial Summary:\n"
            f"- Total Income: ₹{budget_summary['income']:,.2f}\n"
            f"- Total Expense: ₹{budget_summary['expense']:,.2f}\n"
            f"- Financial Health Score: {budget_summary['health_score']}/100\n"
            f"- Category-wise Spending: {category_spending}\n"
            f"\nYou are CareBank AI, a personalized financial wellness advisor. "
            f"Use the above data to give specific, actionable advice."
        )


class Orchestrator:
    """Runs all agents in sequence and returns consolidated analysis."""

    def __init__(self):
        self.spending = SpendingMonitorAgent()
        self.risk = RiskAgent()
        self.budget = BudgetAgent()
        self.forecast = ForecastAgent()
        self.advisor = AdvisorAgent()

    def execute(self, df: pd.DataFrame, budgets: dict | None = None) -> dict:
        # 1. Categorize spending
        df = self.spending.run(df)

        # 2. Detect anomalies
        anomalies = self.risk.run(df)

        # 3. Calculate budget summary
        budget_summary = self.budget.run(df)

        # 4. Generate forecast
        forecast = self.forecast.run(df)

        # 5. Get advisor recommendation
        advice = self.advisor.run(budget_summary["health_score"])

        # 6. Category-wise spending breakdown
        expense_df = df[df["Amount"] < 0].copy()
        category_spending = (
            expense_df.groupby("Category")["Amount"]
            .sum()
            .abs()
            .to_dict()
        )

        # 7. Budget alerts
        budget_alerts = []
        if budgets:
            for category, limit in budgets.items():
                spent = category_spending.get(category, 0)
                if spent > limit:
                    budget_alerts.append(
                        {
                            "category": category,
                            "spent": spent,
                            "budget": limit,
                            "severity": "exceeded",
                            "message": f"{category} budget exceeded! Spent ₹{spent:,.0f} of ₹{limit:,.0f} budget.",
                        }
                    )
                elif spent > 0.8 * limit:
                    budget_alerts.append(
                        {
                            "category": category,
                            "spent": spent,
                            "budget": limit,
                            "severity": "warning",
                            "message": f"{category} nearing budget limit. Spent ₹{spent:,.0f} of ₹{limit:,.0f} budget.",
                        }
                    )

        # Build context for chat
        ai_context = self.advisor.build_context(budget_summary, category_spending)

        return {
            "budget_summary": budget_summary,
            "category_spending": category_spending,
            "anomalies": anomalies,
            "forecast": forecast,
            "advice": advice,
            "budget_alerts": budget_alerts,
            "ai_context": ai_context,
        }
