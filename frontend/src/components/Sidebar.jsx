import { useRef, useState } from 'react';
import axios from 'axios';
import {
  Upload,
  Utensils,
  Car,
  ShoppingCart,
  MoreHorizontal,
  Zap,
  CheckCircle,
  LogOut,
  Sparkles,
  ChevronRight,
  Sun,
  Moon,
  Bell,
  Menu
} from 'lucide-react';
import NotificationsPanel from './NotificationsPanel';

const API_URL = 'http://localhost:8000';
const CATEGORIES = [
  { key: 'Food', label: 'Food', icon: Utensils, default: 4000 },
  { key: 'Transport', label: 'Transport', icon: Car, default: 2000 },
  { key: 'Shopping', label: 'Shopping', icon: ShoppingCart, default: 3000 },
  { key: 'Other', label: 'Other', icon: MoreHorizontal, default: 2000 },
];

export default function Sidebar({ onAnalyze, loading, onLogout, role = 'customer', token, theme, toggleTheme }) {
  const [showNotifs, setShowNotifs] = useState(false);
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [budgets, setBudgets] = useState(
    Object.fromEntries(CATEGORIES.map((c) => [c.key, c.default]))
  );
  const [suggestLoading, setSuggestLoading] = useState(false);

  const handleFileSelect = (f) => {
    const name = f.name.toLowerCase();
    if (f && (name.endsWith('.csv') || name.endsWith('.pdf'))) {
      setFile(f);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFileSelect(f);
  };

  const handleSubmit = () => {
    if (!file) return;
    onAnalyze(file, budgets);
  };

  const handleSuggestBudgets = async () => {
    setSuggestLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/suggested-budgets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Merge suggested with defaults for missing categories
      const newBudgets = { ...budgets };
      Object.entries(res.data).forEach(([cat, suggested]) => {
        if (newBudgets.hasOwnProperty(cat)) {
          newBudgets[cat] = suggested;
        }
      });
      setBudgets(newBudgets);
    } catch (err) {
      console.error('Failed to get suggestions', err);
    } finally {
      setSuggestLoading(false);
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">💳</div>
          <h1>CareBank</h1>
        </div>
        <p className="sidebar-subtitle">Financial Wellness Platform</p>
        
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-btn" onClick={() => setShowNotifs(true)} title="Notifications">
            <Bell size={18} />
          </button>
        </div>

        <NotificationsPanel 
          isOpen={showNotifs} 
          onClose={() => setShowNotifs(false)} 
          notifications={[
            { type: 'warning', title: 'Low Health Score', message: 'Your health score dropped below 50. Review spending.', time: '2h ago' },
            { type: 'success', title: 'Goal Progress', message: 'You reached 80% of your "New Car" goal!', time: '1d ago' }
          ]}
        />

        {role === 'banker' && (
          <div style={{ marginTop: 8, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', padding: '4px 8px', background: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc', borderRadius: 4, display: 'inline-block' }}>
            Bank Manager Access
          </div>
        )}
      </div>

      {role !== 'banker' && (
        <div className="sidebar-section">
          <div className="sidebar-section-title">Data Source</div>
          <div
            className={`upload-area ${dragOver ? 'drag-over' : ''} ${file ? 'uploaded' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="upload-icon">
              {file ? <CheckCircle size={32} /> : <Upload size={32} />}
            </div>
            <p className="upload-text" style={{ fontSize: '0.8rem' }}>
              {file ? <>{file.name}</> : <><strong>Upload Statement</strong><br/>CSV / PDF</>}
            </p>
            <input ref={fileInputRef} type="file" accept=".csv,.pdf" hidden onChange={(e) => handleFileSelect(e.target.files[0])} />
          </div>
        </div>
      )}

      {role !== 'banker' && (
        <div className="sidebar-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="sidebar-section-title" style={{ margin: 0 }}>Budget Limits (₹)</div>
            <button 
              className="accent-text-btn" 
              onClick={handleSuggestBudgets}
              disabled={suggestLoading}
              style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Sparkles size={12} /> {suggestLoading ? '...' : 'Suggest'}
            </button>
          </div>
          <div className="budget-grid">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div className="budget-item" key={cat.key}>
                  <label className="budget-label"><Icon size={12} /> {cat.label}</label>
                  <input
                    className="budget-input"
                    type="number"
                    value={budgets[cat.key]}
                    onChange={(e) => setBudgets((prev) => ({ ...prev, [cat.key]: Number(e.target.value) }))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginTop: 'auto' }}>
        {role !== 'banker' && (
          <div className="sidebar-section">
            <button className="analyze-btn" onClick={handleSubmit} disabled={!file || loading}>
              {loading ? <><div className="spinner" /> Analyzing...</> : <><Zap size={18} /> Analyze Finances</>}
            </button>
          </div>
        )}

        <div className="sidebar-section" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button className="analyze-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#fca5a5' }} onClick={onLogout}>
            <LogOut size={18} /> Logout Securely
          </button>
        </div>
      </div>
    </aside>
  );
}
