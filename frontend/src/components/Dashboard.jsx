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
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

const formatCurrency = (val) =>
  val != null ? `₹${Number(val).toLocaleString('en-IN')}` : '—';

export default function Dashboard({ data }) {
  const {
    budget_summary,
    category_spending,
    anomalies,
    forecast,
    advice,
    budget_alerts,
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

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card income">
          <div className="kpi-header">
            <span className="kpi-label">Total Income</span>
            <div className="kpi-icon income">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="kpi-value income">
            {formatCurrency(budget_summary?.income)}
          </div>
        </div>

        <div className="kpi-card expense">
          <div className="kpi-header">
            <span className="kpi-label">Total Expense</span>
            <div className="kpi-icon expense">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="kpi-value expense">
            {formatCurrency(budget_summary?.expense)}
          </div>
        </div>

        <div className="kpi-card score">
          <div className="kpi-header">
            <span className="kpi-label">Health Score</span>
            <div className="kpi-icon score">
              <Activity size={20} />
            </div>
          </div>
          <div className="kpi-value score">
            {budget_summary?.health_score ?? '—'}
            <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.6 }}>
              /100
            </span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-grid">
        {/* Pie Chart */}
        <div className="chart-card">
          <div className="chart-title">
            <PieIcon size={18} style={{ color: '#8b5cf6' }} />
            Spending Distribution
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '0.8rem',
                  }}
                  formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Amount']}
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.78rem', color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No spending data available.
            </p>
          )}
        </div>

        {/* Cashflow Forecast */}
        <div className="chart-card">
          <div className="chart-title">
            <BarChart3 size={18} style={{ color: '#10b981' }} />
            Cashflow Forecast
          </div>
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={forecastData}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(99,102,241,0.1)"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(99,102,241,0.15)' }}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: 'rgba(99,102,241,0.15)' }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid rgba(99,102,241,0.3)',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '0.8rem',
                  }}
                  formatter={(v) =>
                    v != null ? [`₹${v.toLocaleString('en-IN')}`, ''] : ['—', '']
                  }
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.78rem', color: '#94a3b8' }}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorActual)"
                  name="Actual"
                  dot={{ r: 4, fill: '#6366f1' }}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill="url(#colorForecast)"
                  name="Forecast"
                  dot={{ r: 4, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Not enough data for forecasting.
            </p>
          )}
        </div>
      </div>

      {/* Alerts */}
      <div className="alerts-grid">
        {/* Budget Alerts */}
        <div className="alerts-card">
          <div className="alerts-card-title">
            <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
            Budget Alerts
          </div>
          {budget_alerts && budget_alerts.length > 0 ? (
            budget_alerts.map((alert, i) => (
              <div
                key={i}
                className={`alert-item ${alert.severity === 'exceeded' ? 'danger' : 'warning'}`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="alert-icon">
                  <AlertTriangle size={16} />
                </span>
                <span>{alert.message}</span>
              </div>
            ))
          ) : (
            <div className="alert-item success">
              <span className="alert-icon">
                <ShieldCheck size={16} />
              </span>
              <span>All spending is within budget limits. Great job!</span>
            </div>
          )}
        </div>

        {/* Anomalies */}
        <div className="alerts-card">
          <div className="alerts-card-title">
            <ShieldAlert size={18} style={{ color: '#ef4444' }} />
            Risk Anomalies
          </div>
          {anomalies && anomalies.length > 0 ? (
            anomalies.map((a, i) => (
              <div
                key={i}
                className="alert-item danger"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="alert-icon">
                  <ShieldAlert size={16} />
                </span>
                <span>
                  <strong>{a.Description}</strong> — ₹
                  {Math.abs(a.Amount).toLocaleString('en-IN')} on {a.Date}
                </span>
              </div>
            ))
          ) : (
            <div className="alert-item success">
              <span className="alert-icon">
                <ShieldCheck size={16} />
              </span>
              <span>No major anomalies detected. Your spending is normal.</span>
            </div>
          )}
        </div>
      </div>

      {/* Advisor */}
      <div className="advisor-card">
        <div className="chart-title" style={{ marginBottom: 14 }}>
          <Bot size={18} style={{ color: '#a78bfa' }} />
          AI Advisor Recommendation
        </div>
        <div className="advisor-badge">{advice}</div>
      </div>
    </div>
  );
}
