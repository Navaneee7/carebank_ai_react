import { useState } from 'react';
import axios from 'axios';
import { Users, Activity, ShieldAlert, Flag, Download, Search, Filter, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function ManagerDashboard({ data, token }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [flaggingUser, setFlaggingUser] = useState(null);
  const [flagReason, setFlagReason] = useState('');

  const totalUsers = data.length;
  const avgHealth = data.length > 0 
    ? Math.round(data.reduce((acc, curr) => acc + curr.health_score, 0) / totalUsers) 
    : 0;
  const riskSystems = data.filter(u => u.risk_alerts > 0).length;

  const filteredData = data.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) &&
    user.health_score >= minScore
  );

  const handleExport = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/customers/export`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'customers_export.csv');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleFlag = async () => {
    if (!flaggingUser || !flagReason) return;
    try {
      await axios.post(`${API_URL}/api/admin/flag/${flaggingUser.id}`, 
        { reason: flagReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Customer ${flaggingUser.username} has been flagged.`);
      setFlaggingUser(null);
      setFlagReason('');
    } catch (err) {
      console.error('Flagging failed', err);
    }
  };

  return (
    <div className="manager-dashboard">
      <div className="dashboard-header" style={{ marginBottom: 30, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>🏦 Bank Management Oversight</h2>
          <p style={{ opacity: 0.7 }}>Real-time financial health monitoring across all bank customers.</p>
        </div>
        <button className="primary-btn" onClick={handleExport}>
          <Download size={18} /> Export Portfolio
        </button>
      </div>

      {minScore < 40 && data.some(u => u.health_score < 40) && (
        <div className="alert-item danger" style={{ marginBottom: 24, padding: '16px 20px' }}>
          <ShieldAlert size={20} />
          <span>
            <strong>Attention:</strong> {data.filter(u => u.health_score < 40).length} customers currently have a health score below 40.
          </span>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card score">
          <div className="kpi-header">
            <span className="kpi-label">Active Customers</span>
            <Users size={20} />
          </div>
          <div className="kpi-value score">{totalUsers}</div>
        </div>

        <div className="kpi-card score">
          <div className="kpi-header">
            <span className="kpi-label">Average Health Score</span>
            <Activity size={20} />
          </div>
          <div className="kpi-value score">
            {avgHealth}
            <span style={{ fontSize: '1rem', fontWeight: 400, opacity: 0.6 }}>/100</span>
          </div>
        </div>

        <div className="kpi-card expense">
          <div className="kpi-header">
            <span className="kpi-label">Risk Alerts Active</span>
            <ShieldAlert size={20} />
          </div>
          <div className="kpi-value expense" style={{ color: riskSystems > 0 ? '#fca5a5' : '#88f4be' }}>
            {riskSystems}
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ marginTop: 30 }}>
        <div className="section-header" style={{ marginBottom: 20 }}>
          <div className="chart-title">
            <Users size={18} style={{ color: '#6366f1' }} />
            Customer Portfolio Analysis
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
             <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  className="budget-input" 
                  style={{ paddingLeft: 36, width: 220 }}
                  placeholder="Search customers..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Min Score:</span>
                <input 
                  type="range" min="0" max="100" value={minScore} 
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  style={{ width: 100 }}
                />
                <span style={{ fontSize: '0.8rem', width: 25 }}>{minScore}</span>
             </div>
          </div>
        </div>
        
        <table className="manager-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px' }}>Customer</th>
              <th>Health Score</th>
              <th>Health Analysis</th>
              <th>Risk Anomalies</th>
              <th>Activity</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((user) => (
              <tr key={user.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                <td style={{ padding: '16px 12px', fontWeight: 500 }}>{user.username}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ width: `${user.health_score}%`, height: '100%', background: user.health_score > 70 ? '#10b981' : user.health_score > 40 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    {user.health_score}
                  </div>
                </td>
                <td>
                   <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: user.status.includes('🟢') ? '#88f4be' : user.status.includes('🟡') ? '#fde68a' : '#fca5a5' }}>
                     {user.status.replace(/[🟢🟡🔴] /, '')}
                   </span>
                </td>
                <td style={{ color: user.risk_alerts > 0 ? '#fca5a5' : 'inherit' }}>
                  {user.risk_alerts > 0 ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ShieldAlert size={14} /> {user.risk_alerts} Detected</span> : 'None'}
                </td>
                <td style={{ opacity: 0.6 }}>{user.total_transactions} txns</td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    onClick={() => setFlaggingUser(user)}
                    style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 8 }}
                    title="Flag customer for review"
                  >
                    <Flag size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>No customers match your search criteria.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {flaggingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div className="chart-card" style={{ width: '100%', maxWidth: 450 }}>
            <h3>Flag Customer: {flaggingUser.username}</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 20 }}>Enter the reason for flagging this account for internal review.</p>
            <textarea 
              className="budget-input" 
              style={{ width: '100%', height: 100, marginBottom: 20 }}
              placeholder="e.g. Unusual high-value transactions detected..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="primary-btn" style={{ background: 'transparent', border: '1px solid var(--border-color)' }} onClick={() => setFlaggingUser(null)}>Cancel</button>
              <button className="primary-btn" style={{ background: '#ef4444' }} onClick={handleFlag}>Confirm Flag</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
