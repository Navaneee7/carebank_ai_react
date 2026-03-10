import { useRef, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Utensils,
  Car,
  ShoppingCart,
  MoreHorizontal,
  Zap,
  CheckCircle,
} from 'lucide-react';

const CATEGORIES = [
  { key: 'Food', label: 'Food', icon: Utensils, default: 4000 },
  { key: 'Transport', label: 'Transport', icon: Car, default: 2000 },
  { key: 'Shopping', label: 'Shopping', icon: ShoppingCart, default: 3000 },
  { key: 'Other', label: 'Other', icon: MoreHorizontal, default: 2000 },
];

export default function Sidebar({ onAnalyze, loading }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [budgets, setBudgets] = useState(
    Object.fromEntries(CATEGORIES.map((c) => [c.key, c.default]))
  );

  const handleFileSelect = (f) => {
    if (f && f.name.endsWith('.csv')) {
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

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">💳</div>
          <h1>CareBank</h1>
        </div>
        <p className="sidebar-subtitle">AI Financial Wellness</p>
      </div>

      {/* Upload Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Transaction Data</div>
        <div
          className={`upload-area ${dragOver ? 'drag-over' : ''} ${file ? 'uploaded' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="upload-icon">
            {file ? <CheckCircle size={36} /> : <Upload size={36} />}
          </div>
          <p className="upload-text">
            {file ? (
              <>File ready for analysis</>
            ) : (
              <>
                <strong>Click to upload</strong> or drag & drop
                <br />
                CSV files only
              </>
            )}
          </p>
          {file && <p className="uploaded-filename">{file.name}</p>}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            hidden
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </div>
      </div>

      {/* Budget Settings */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Budget Limits (₹)</div>
        <div className="budget-grid">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <div className="budget-item" key={cat.key}>
                <label className="budget-label">
                  <Icon size={13} />
                  {cat.label}
                </label>
                <input
                  className="budget-input"
                  type="number"
                  value={budgets[cat.key]}
                  onChange={(e) =>
                    setBudgets((prev) => ({
                      ...prev,
                      [cat.key]: Number(e.target.value),
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Analyze Button */}
      <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: 0 }}>
        <button
          className="analyze-btn"
          onClick={handleSubmit}
          disabled={!file || loading}
        >
          {loading ? (
            <>
              <div className="spinner" />
              Analyzing...
            </>
          ) : (
            <>
              <Zap size={18} />
              Run AI Analysis
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
