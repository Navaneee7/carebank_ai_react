import { useState } from 'react';
import axios from 'axios';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChatWidget from './components/ChatWidget';
import {
  BarChart3,
  Brain,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import './index.css';

const API_URL = 'http://localhost:8000';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiContext, setAiContext] = useState('');

  const handleAnalyze = async (file, budgets) => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams({
        food_budget: budgets.Food,
        transport_budget: budgets.Transport,
        shopping_budget: budgets.Shopping,
        other_budget: budgets.Other,
      });

      const res = await axios.post(
        `${API_URL}/api/upload?${params.toString()}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      setData(res.data);
      setAiContext(res.data.ai_context || '');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail ||
        'Failed to connect to backend. Make sure the FastAPI server is running on port 8000.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar onAnalyze={handleAnalyze} loading={loading} />

      <main className="main-content">
        {error && (
          <div
            className="alert-item danger"
            style={{ marginBottom: 20, maxWidth: 600 }}
          >
            <span>{error}</span>
          </div>
        )}

        {data ? (
          <>
            <Dashboard data={data} />
            <ChatWidget aiContext={aiContext} />
          </>
        ) : (
          <div className="welcome-container">
            <div className="welcome-icon">🏦</div>
            <h2 className="welcome-title">Welcome to CareBank AI</h2>
            <p className="welcome-subtitle">
              Upload your transaction CSV and set your budget limits to unlock
              AI-powered financial insights, anomaly detection, and
              personalized advice.
            </p>
            <div className="welcome-features">
              <div className="welcome-feature">
                <Brain size={18} style={{ color: '#8b5cf6' }} />
                Multi-Agent AI
              </div>
              <div className="welcome-feature">
                <ShieldCheck size={18} style={{ color: '#10b981' }} />
                Risk Detection
              </div>
              <div className="welcome-feature">
                <BarChart3 size={18} style={{ color: '#6366f1' }} />
                Smart Forecasting
              </div>
              <div className="welcome-feature">
                <TrendingUp size={18} style={{ color: '#f59e0b' }} />
                Budget Monitoring
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
