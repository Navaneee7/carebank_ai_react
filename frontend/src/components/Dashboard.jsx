import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  PieChart as PieIcon,
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Bot,
  Calendar,
  Layers,
  Calculator,
  Target,
  ChevronRight,
  X
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis
} from 'recharts';

import SpendingTrends from './SpendingTrends';
import TaxEstimator from './TaxEstimator';
import ScoreHistory from './ScoreHistory';
import SavingsGoals from './SavingsGoals';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const formatCurrency = (val) =>
  val != null ? `₹${Number(val).toLocaleString('en-IN')}` : '—';

export default function Dashboard({ data, token }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showTour, setShowTour] = useState(localStorage.getItem('onboarding_done') !== 'true');
  const [tourStep, setTourStep] = useState(0);

  const tourSteps = [
    { title: 'Welcome to CareBank AI', content: 'Your personal financial wellness companion. Let\'s get you started!', icon: '💳' },
    { title: 'Analyze Finances', content: 'Use the sidebar to sync your CSV or PDF bank statements for a deep dive.', icon: '📤' },
    { title: 'Personalized Budgets', content: 'Set your spending limits or use "Suggest" to see optimized recommendations.', icon: '📊' },
    { title: 'Wealth Insights', content: 'Check your health score, trends, and tax estimations in the tabs below.', icon: '💡' },
    { title: 'Smart Assistant', content: 'Use the chat widget to ask any questions about your financial path.', icon: '🤖' }
  ];

  const nextStep = () => {
    if (tourStep < tourSteps.length - 1) setTourStep(tourStep + 1);
    else closeTour();
  };

  const closeTour = () => {
    setShowTour(false);
    localStorage.setItem('onboarding_done', 'true');
  };

  const {
    budget_summary,
    category_spending,
    anomalies,
    forecast,
    advice,
    budget_alerts,
    subscriptions,
    monthly_trends,
    tax_info,
    savings_plan
  } = data;

  // Pie data
  const pieData = Object.entries(category_spending || {}).map(([name, value]) => ({
    name,
    value: Math.abs(value),
  }));

  // Forecast data
  const forecastData = (forecast || []).map((row) => ({
    date: row.Date,
    actual: row.Amount,
    forecast: row.Forecast,
  }));

  const renderOverview = () => (
    <>
      <div className="kpi-grid">
        <div className="kpi-card income">
          <div className="kpi-header">
            <span className="kpi-label">Total Income</span>
            <div className="kpi-icon income"><TrendingUp size={20} /></div>
          </div>
          <div className="kpi-value income">{formatCurrency(budget_summary?.income)}</div>
        </div>

        <div className="kpi-card expense">
          <div className="kpi-header">
            <span className="kpi-label">Total Expense</span>
            <div className="kpi-icon expense"><TrendingDown size={20} /></div>
          </div>
          <div className="kpi-value expense">{formatCurrency(budget_summary?.expense)}</div>
        </div>

        <div className="kpi-card score">
          <div className="kpi-header">
            <span className="kpi-label">Health Score</span>
            <div className="kpi-icon score"><Activity size={20} /></div>
          </div>
          <div className="kpi-value score">
            {budget_summary?.health_score ?? '—'}
            <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.6 }}>/100</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-title"><PieIcon size={18} style={{ color: '#8b5cf6' }} /> Spending Distribution</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={4} dataKey="value" stroke="none">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.8rem' }} formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Amount']} />
                <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#94a3b8' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No spending data available.</p>}
        </div>

        <div className="chart-card">
          <div className="chart-title"><BarChart3 size={18} style={{ color: '#10b981' }} /> Cashflow Forecast</div>
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(99,102,241,0.15)' }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={{ stroke: 'rgba(99,102,241,0.15)' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#f1f5f9', fontSize: '0.8rem' }} formatter={(v) => v != null ? [`₹${v.toLocaleString('en-IN')}`, ''] : ['—', '']} />
                <Legend wrapperStyle={{ fontSize: '0.78rem', color: '#94a3b8' }} />
                <Area type="monotone" dataKey="actual" stroke="#6366f1" strokeWidth={2} fill="url(#colorActual)" name="Actual" dot={{ r: 4, fill: '#6366f1' }} />
                <Area type="monotone" dataKey="forecast" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorForecast)" name="Forecast" dot={{ r: 4, fill: '#10b981' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Not enough data for forecasting.</p>}
        </div>
      </div>

      <div className="alerts-grid">
        <div className="alerts-card">
          <div className="alerts-card-title"><Calendar size={18} style={{ color: '#6366f1' }} /> Bill Reminders</div>
          {subscriptions && subscriptions.length > 0 ? (
            subscriptions.slice(0, 3).map((sub, i) => (
              <div key={i} className="alert-item warning">
                <span className="alert-icon"><Calendar size={16} /></span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span><strong>{sub.description}</strong> — ₹{Math.abs(sub.amount).toLocaleString()}</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Next Due: {sub.next_due}</span>
                </div>
              </div>
            ))
          ) : <div className="alert-item success">No upcoming bill payments detected.</div>}
        </div>

        <div className="alerts-card">
          <div className="alerts-card-title"><AlertTriangle size={18} style={{ color: '#f59e0b' }} /> Budget Alerts</div>
          {budget_alerts && budget_alerts.length > 0 ? (
            budget_alerts.map((alert, i) => (
              <div key={i} className={`alert-item ${alert.severity === 'exceeded' ? 'danger' : 'warning'}`}>
                <span className="alert-icon"><AlertTriangle size={16} /></span>
                <span>{alert.message}</span>
              </div>
            ))
          ) : <div className="alert-item success">All spending is within budget limits.</div>}
        </div>
      </div>

      <div className="advisor-card">
        <div className="chart-title" style={{ marginBottom: 16 }}><Bot size={18} style={{ color: '#a78bfa' }} /> Wealth Assistant – Key Insights</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.isArray(advice) ? advice.map((item, i) => (
            <div key={i} className="advisor-badge" style={{ display: 'block', width: '100%' }}>{item}</div>
          )) : <div className="advisor-badge">{advice}</div>}
        </div>
      </div>
    </>
  );

  return (
    <div>
      <div className="tabs-header">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          <Layers size={16} /> Overview
        </button>
        <button className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`} onClick={() => setActiveTab('trends')}>
          <TrendingUp size={16} /> Spending Trends
        </button>
        <button className={`tab-btn ${activeTab === 'score' ? 'active' : ''}`} onClick={() => setActiveTab('score')}>
          <Activity size={16} /> Health History
        </button>
        <button className={`tab-btn ${activeTab === 'tax' ? 'active' : ''}`} onClick={() => setActiveTab('tax')}>
          <Calculator size={16} /> Tax Estimator
        </button>
        <button className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`} onClick={() => setActiveTab('goals')}>
          <Target size={16} /> Savings Goals
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'trends' && <SpendingTrends monthlyData={monthly_trends} />}
        {activeTab === 'score' && <ScoreHistory token={token} />}
        {activeTab === 'tax' && <TaxEstimator taxInfo={tax_info} />}
        {activeTab === 'goals' && <SavingsGoals token={token} />}
      </div>

      {showTour && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: 20 }}>
          <div className="chart-card" style={{ width: '100%', maxWidth: 400, textAlign: 'center', padding: 40 }}>
            <button onClick={closeTour} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
            </button>
            <div style={{ fontSize: '3rem', marginBottom: 20 }}>{tourSteps[tourStep].icon}</div>
            <h2 style={{ marginBottom: 12 }}>{tourSteps[tourStep].title}</h2>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 30 }}>{tourSteps[tourStep].content}</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
                {tourSteps.map((_, i) => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === tourStep ? 'var(--accent-primary)' : 'var(--bg-glass)' }} />
                ))}
            </div>

            <button className="primary-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={nextStep}>
                {tourStep === tourSteps.length - 1 ? 'Get Started' : 'Next Step'} <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
