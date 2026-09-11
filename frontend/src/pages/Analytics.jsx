import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import API from '../api/axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function makeOptions(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(30, 27, 75, 0.92)',
        titleColor: '#a78bfa',
        bodyColor: '#e2e8f0',
        padding: 12,
        cornerRadius: 10,
        callbacks: { label: (ctx) => ` ${ctx.parsed.y} ${unit}` },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(108, 99, 255, 0.06)' },
        ticks: { color: '#9ca3af', font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }, maxTicksLimit: 12, maxRotation: 0 },
        border: { color: 'rgba(108,99,255,0.1)' },
      },
      y: {
        grid: { color: 'rgba(108, 99, 255, 0.06)' },
        ticks: { color: '#9ca3af', font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }, callback: (v) => `${v}${unit}` },
        border: { color: 'rgba(108,99,255,0.1)' },
      },
    },
    elements: {
      line: { tension: 0.4, borderWidth: 2.5 },
      point: { radius: 3, hitRadius: 8, hoverRadius: 6 },
    },
  };
}


export default function Analytics() {
  const navigate = useNavigate();
  const [history, setHistory]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [latest, setLatest]           = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const intervalRef                   = useRef(null);

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await API.get('/api/sensors/history?limit=48');
      setHistory(data);
      if (data.length > 0) setLatest(data[data.length - 1]);
      setError('');
    } catch {
      setError('Failed to load sensor data. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchHistory();
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchHistory, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchHistory]);

  // Chart datasets
  const labels = history.map((r) =>
    new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  const tempData = {
    labels,
    datasets: [{
      label: 'Temperature',
      data: history.map((r) => r.temperature),
      borderColor: '#f97316',
      backgroundColor: 'rgba(249,115,22,0.10)',
      fill: true,
      pointBackgroundColor: '#f97316',
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
    }],
  };

  const humData = {
    labels,
    datasets: [{
      label: 'Humidity',
      data: history.map((r) => r.humidity),
      borderColor: '#38bdf8',
      backgroundColor: 'rgba(56,189,248,0.10)',
      fill: true,
      pointBackgroundColor: '#38bdf8',
      pointBorderColor: '#fff',
      pointBorderWidth: 1.5,
    }],
  };

  const tempOptions = makeOptions('°C');
  const humOptions  = makeOptions('%');

  // Derived stats
  const avg = (key) => history.length
    ? (history.reduce((s, r) => s + r[key], 0) / history.length).toFixed(1) : '—';
  const max = (key) => history.length ? Math.max(...history.map((r) => r[key])).toFixed(1) : '—';
  const min = (key) => history.length ? Math.min(...history.map((r) => r[key])).toFixed(1) : '—';

  return (
    <div className="dashboard">
      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ─── Sidebar ─── */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo-wrap">🏫</div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">SmartClass</div>
            <div className="sidebar-brand-sub">Automation System</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Items</div>

          <div className="nav-item" id="nav-dashboard"
            onClick={() => { setSidebarOpen(false); navigate('/dashboard'); }}>
            <span className="nav-icon">⚡</span> Dashboard
          </div>

          <div className="nav-item" id="nav-report"
            onClick={() => { setSidebarOpen(false); navigate('/dashboard'); }}>
            <span className="nav-icon">📊</span> Power Report
          </div>

          <div className="nav-item active" id="nav-analytics">
            <span className="nav-icon">🌡️</span> Analytics
          </div>
        </nav>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="dash-main">
        {/* Top Bar */}
        <div className="dash-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              id="hamburger-btn-analytics"
              className="hamburger-btn"
              onClick={() => setSidebarOpen((o) => !o)}
              aria-label="Toggle sidebar"
            >
              <span /><span /><span />
            </button>
            <div className="topbar-title">
              <h1 className="topbar-heading">🌡️ Environment Analytics</h1>
              <p className="topbar-sub">Temperature &amp; humidity trends from classroom sensors</p>
            </div>
          </div>
          <div className="topbar-right">
            {latest && (
              <div className="topbar-badge">
                <div className="live-dot" /> Live · {new Date(latest.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {/* Page body */}
        <div className="analytics-page">


          {error && <div className="alert-error an-error">{error}</div>}

          {/* ── 4 unified stat cards ── */}
          <div className="an-stat-grid">

            {/* Card 1 — Current Temperature */}
            <div className="an-stat-card temp-card">
              <div className="an-stat-header">
                <span className="an-stat-label">Temperature</span>
                <div className="an-stat-icon-wrap">🌡️</div>
              </div>
              <div className="an-stat-value">
                {latest ? latest.temperature : '—'}
                <span className="an-stat-unit">°C</span>
              </div>
              <div className="an-stat-footer">
                <div className="an-stat-meta">
                  <span className="an-meta-label">Avg</span>
                  <span className="an-meta-val">{avg('temperature')}°</span>
                </div>
                <div className="an-stat-meta">
                  <span className="an-meta-label">Max</span>
                  <span className="an-meta-val">{max('temperature')}°</span>
                </div>
                <div className="an-stat-meta">
                  <span className="an-meta-label">Min</span>
                  <span className="an-meta-val">{min('temperature')}°</span>
                </div>
              </div>
            </div>

            {/* Card 2 — Current Humidity */}
            <div className="an-stat-card hum-card">
              <div className="an-stat-header">
                <span className="an-stat-label">Humidity</span>
                <div className="an-stat-icon-wrap">💧</div>
              </div>
              <div className="an-stat-value">
                {latest ? latest.humidity : '—'}
                <span className="an-stat-unit">%</span>
              </div>
              <div className="an-stat-footer">
                <div className="an-stat-meta">
                  <span className="an-meta-label">Avg</span>
                  <span className="an-meta-val">{avg('humidity')}%</span>
                </div>
                <div className="an-stat-meta">
                  <span className="an-meta-label">Max</span>
                  <span className="an-meta-val">{max('humidity')}%</span>
                </div>
                <div className="an-stat-meta">
                  <span className="an-meta-label">Min</span>
                  <span className="an-meta-val">{min('humidity')}%</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── Charts ── */}
          {loading ? (
            <div className="loading-wrap">
              <div className="spinner" />
              <p>Loading sensor data…</p>
            </div>
          ) : (
            <div className="an-charts-grid">
              {/* Temperature */}
              <div className="an-chart-card" id="temp-chart-card">
                <div className="an-chart-header">
                  <div className="an-chart-title-wrap">
                    <span className="an-chart-dot" style={{ background: '#f97316' }} />
                    <h3 className="an-chart-title">Temperature</h3>
                    <span className="an-chart-unit">°C</span>
                  </div>
                  <div className="an-chart-badge temp-badge">
                    {latest ? `${latest.temperature}°C` : '—'}
                  </div>
                </div>
                <div className="an-chart-area">
                  <Line id="temperature-line-chart" data={tempData} options={tempOptions} />
                </div>
              </div>

              {/* Humidity */}
              <div className="an-chart-card" id="hum-chart-card">
                <div className="an-chart-header">
                  <div className="an-chart-title-wrap">
                    <span className="an-chart-dot" style={{ background: '#38bdf8' }} />
                    <h3 className="an-chart-title">Humidity</h3>
                    <span className="an-chart-unit">%</span>
                  </div>
                  <div className="an-chart-badge hum-badge">
                    {latest ? `${latest.humidity}%` : '—'}
                  </div>
                </div>
                <div className="an-chart-area">
                  <Line id="humidity-line-chart" data={humData} options={humOptions} />
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
