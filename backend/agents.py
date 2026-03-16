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


class SubscriptionAgent:
    """Identifies potential recurring subscriptions based on keywords."""
    SUB_KEYWORDS = ["netflix", "spotify", "gym", "aws", "prime", "subscription", "membership"]

    def run(self, df: pd.DataFrame) -> list[dict]:
        subs = []
        for _, row in df.iterrows():
            desc = str(row["Description"]).lower()
            if any(k in desc for k in self.SUB_KEYWORDS):
                # Simple logic for reminder: assume it's roughly monthly from the last date
                subs.append({
                    "date": str(row["Date"]),
                    "description": row["Description"],
                    "amount": float(row["Amount"]),
                    "next_due": (pd.to_datetime(row["Date"]) + pd.DateOffset(months=1)).strftime("%Y-%m-%d")
                })
        return subs

class MultiMonthAgent:
    """Groups transactions by month and analyzes performance monthly."""
    def run(self, df: pd.DataFrame) -> list[dict]:
        df = df.copy()
        df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
        df = df.dropna(subset=["Date"])
        
        try:
            monthly = df.groupby(df["Date"].dt.to_period("M"))
        except:
            return []

        results = []
        for period, group in monthly:
            results.append({
                "month": str(period),
                "income": float(group[group["Amount"] > 0]["Amount"].sum()),
                "expense": float(abs(group[group["Amount"] < 0]["Amount"].sum())),
            })
        return results

class TaxAgent:
    """Identifies potential tax-deductible expenses and estimates tax."""
    DEDUCTION_KEYWORDS = ["insurance", "investment", "charity", "education", "donation", "medical"]

    def run(self, df: pd.DataFrame) -> dict:
        deductibles = []
        total_income = float(df[df["Amount"] > 0]["Amount"].sum())
        
        for _, row in df.iterrows():
            desc = str(row["Description"]).lower()
            if any(k in desc for k in self.DEDUCTION_KEYWORDS):
                deductibles.append({"description": row["Description"], "amount": float(abs(row["Amount"]))})
        
        total_deductions = sum(d["amount"] for d in deductibles)
        taxable_income = max(0, total_income - total_deductions)
        # Simplified 15% tax estimate
        estimated_tax = taxable_income * 0.15
        
        return {
            "deductibles": deductibles,
            "total_deductions": total_deductions,
            "estimated_tax": estimated_tax,
            "taxable_income": taxable_income
        }

class PersonalizedBudgetAgent:
    """Analyzes historical category spending to suggest realistic limits."""
    def run(self, category_spending: dict) -> dict:
        suggested = {}
        for cat, amount in category_spending.items():
            # Suggest a limit 10% higher than average or current
            suggested[cat] = round(amount * 1.1, -2) # Round to nearest 100
        return suggested


class SavingsGoalAgent:
    """Analyzes budget surplus to recommend dynamic savings allocation."""
    def run(self, budget_summary: dict) -> dict:
        surplus = budget_summary["income"] - budget_summary["expense"]
        if surplus <= 0:
            return {"status": "No Surplus", "emergency": 0, "investment": 0, "guilt_free": 0}
        
        return {
            "status": "Surplus Available",
            "emergency": surplus * 0.50,
            "investment": surplus * 0.30,
            "guilt_free": surplus * 0.20,
            "total_surplus": surplus
        }


class WealthAssistantAgent:
    """Evaluates health score and formats financial context for the chat assistant."""

    def run(self, budget_summary: dict, budget_alerts: list, subs: list) -> list[str]:
        recommendations = []
        health_score = budget_summary.get("health_score", 0)

        # Health Level
        if health_score > 75:
            recommendations.append("🟢 Your financial health is excellent. Focus on long-term wealth building.")
        elif health_score > 50:
            recommendations.append("🟡 Your finances are stable, but there is room to optimize discretionary spending.")
        else:
            recommendations.append("🔴 Financial risk detected. We recommend immediate review of high-cost categories.")

        # Specific Insights
        if budget_alerts:
            overspent = [a['category'] for a in budget_alerts if a['severity'] == 'exceeded']
            if overspent:
                recommendations.append(f"⚠️ You've exceeded your budget in: {', '.join(overspent)}. Try to cut back here next month.")
        
        if len(subs) > 3:
            recommendations.append(f"🔍 You have {len(subs)} recurring subscriptions. Reviewing these could save you significant monthly costs.")

        if budget_summary['income'] > budget_summary['expense'] * 1.5:
             recommendations.append("💰 Pro Tip: You have a healthy surplus. Consider increasing your SIP or Emergency Fund allocation.")

        return recommendations

    def build_context(self, budget_summary: dict, category_spending: dict, subs: list, savings: dict) -> str:
        return (
            f"User Financial Summary:\n"
            f"- Total Income: ₹{budget_summary['income']:,.2f}\n"
            f"- Total Expense: ₹{budget_summary['expense']:,.2f}\n"
            f"- Financial Health Score: {budget_summary['health_score']}/100\n"
            f"- Category-wise Spending: {category_spending}\n"
            f"- Identified Subscriptions: {len(subs)} found. Examples: {[s['description'] for s in subs[:3]]}\n"
            f"- Recommended Savings Plan: {savings}\n"
            f"\nYou are CareBank AI, a personalized financial wellness advisor. "
            f"Use the above data to give specific, actionable advice in a friendly, professional tone."
        )


class Orchestrator:
    """Runs all agents in sequence and returns consolidated analysis."""

    def __init__(self):
        self.spending = SpendingMonitorAgent()
        self.risk = RiskAgent()
        self.budget = BudgetAgent()
        self.forecast = ForecastAgent()
        self.assistant = WealthAssistantAgent()
        self.subscription = SubscriptionAgent()
        self.savings = SavingsGoalAgent()
        self.multimonth = MultiMonthAgent()
        self.tax = TaxAgent()
        self.personal_budget = PersonalizedBudgetAgent()

    def execute(self, df: pd.DataFrame, budgets: dict | None = None) -> dict:
        # 1. Categorize spending
        df = self.spending.run(df)

        # 2. Detect anomalies
        anomalies = self.risk.run(df)

        # 3. Calculate budget summary
        budget_summary = self.budget.run(df)

        # 4. Generate forecast
        forecast = self.forecast.run(df)

        # 5. New Agents: Subscriptions and Savings Goal
        subs = self.subscription.run(df)
        savings_plan = self.savings.run(budget_summary)

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

        # 8. Get advisor recommendations 
        advice = self.assistant.run(budget_summary, budget_alerts, subs)
 
         # Build context for chat
        ai_context = self.assistant.build_context(budget_summary, category_spending, subs, savings_plan)

        # 9. Multi-month trends
        monthly_trends = self.multimonth.run(df)

        # 10. Tax Estimation
        tax_info = self.tax.run(df)

        # 11. Personalized Budgets
        suggested_budgets = self.personal_budget.run(category_spending)

        return {
            "budget_summary": budget_summary,
            "category_spending": category_spending,
            "anomalies": anomalies,
            "forecast": forecast,
            "advice": advice,
            "budget_alerts": budget_alerts,
            "ai_context": ai_context,
            "subscriptions": subs,
            "savings_plan": savings_plan,
            "monthly_trends": monthly_trends,
            "tax_info": tax_info,
            "suggested_budgets": suggested_budgets
        }
