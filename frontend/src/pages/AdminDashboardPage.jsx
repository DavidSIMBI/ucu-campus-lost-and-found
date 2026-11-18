import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getAdminDashboardStatistics } from '../services/adminService.js';

const statisticCards = [
  { key: 'totalUsers', label: 'Total users', marker: 'USERS', tone: 'green' },
  { key: 'totalStudents', label: 'Total students', marker: 'STUDENTS', tone: 'blue' },
  { key: 'lostItems', label: 'Lost items', marker: 'LOST', tone: 'gold' },
  { key: 'foundItems', label: 'Found items', marker: 'FOUND', tone: 'sage' },
  { key: 'pendingClaims', label: 'Pending claims', marker: 'CLAIMS', tone: 'rose' },
  { key: 'totalReports', label: 'Total reports', marker: 'REPORTS', tone: 'slate' }
];

function isCount(value) {
  return (typeof value === 'number' && Number.isFinite(value) && value >= 0) ||
    (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0);
}

function displayName(user) {
  return user?.fullName || user?.email || 'Administrator';
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatistics() {
      setLoading(true);
      setError('');

      try {
        const result = await getAdminDashboardStatistics({ signal: controller.signal });
        const hasValidStatistics = result && statisticCards.every(({ key }) => isCount(result[key]));

        if (!hasValidStatistics) {
          throw new Error('The dashboard response did not include valid statistics.');
        }

        setStatistics(result);
      } catch (requestError) {
        if (controller.signal.aborted) return;

        if (requestError.response?.status === 401) {
          await logout();
          navigate('/login', { replace: true, state: { from: '/admin/dashboard' } });
          return;
        }

        setError(
          requestError.response?.status === 403
            ? 'Your account is not authorized to view the admin dashboard.'
            : requestError.response?.data?.message ||
              requestError.message ||
              'Unable to load dashboard statistics.'
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadStatistics();
    return () => controller.abort();
  }, [retryCount, logout, navigate]);

  return (
    <section className="admin-dashboard" aria-label="Admin dashboard">
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-brand" to="/" aria-label="UCU Lost and Found home">
          <span className="brand-mark" aria-hidden="true">U</span>
          <span>UCU <strong>Administration</strong></span>
        </Link>

        <p className="admin-sidebar-label">Workspace</p>
        <nav className="admin-sidebar-nav" aria-label="Admin navigation">
          <NavLink to="/admin/dashboard" end className="admin-sidebar-link">
            <span className="admin-nav-mark" aria-hidden="true">01</span>
            Overview
          </NavLink>
          <NavLink to="/items" className="admin-sidebar-link">
            <span className="admin-nav-mark" aria-hidden="true">02</span>
            Browse items
          </NavLink>
          <NavLink to="/my-reports" className="admin-sidebar-link">
            <span className="admin-nav-mark" aria-hidden="true">03</span>
            My reports
          </NavLink>
        </nav>

        <div className="admin-sidebar-account">
          <span className="admin-account-avatar" aria-hidden="true">
            {displayName(user).trim().slice(0, 1).toUpperCase()}
          </span>
          <span className="admin-account-copy">
            <strong>{displayName(user)}</strong>
            <small>Administrator</small>
          </span>
          <button className="admin-sidebar-logout" type="button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="admin-dashboard-main">
        <header className="admin-dashboard-header">
          <div>
            <p className="admin-eyebrow">Administration / Overview</p>
            <h1>Admin Dashboard</h1>
          </div>
          <div className="admin-header-user">
            <span className="admin-header-avatar" aria-hidden="true">
              {displayName(user).trim().slice(0, 1).toUpperCase()}
            </span>
            <span><strong>{displayName(user)}</strong><small>Administrator</small></span>
          </div>
        </header>

        <div className="admin-dashboard-content">
          <section className="admin-welcome-card">
            <div>
              <p className="admin-eyebrow">System overview</p>
              <h2>Welcome back, {displayName(user)}</h2>
              <p>Here is the latest overview of activity across the UCU Lost and Found system.</p>
            </div>
            <span className="admin-welcome-seal" aria-hidden="true">UCU</span>
          </section>

          <section className="admin-statistics-section" aria-labelledby="admin-statistics-title" aria-busy={loading}>
            <div className="admin-section-heading">
              <div>
                <p className="admin-eyebrow">Live system data</p>
                <h2 id="admin-statistics-title">Platform statistics</h2>
              </div>
              {statistics && !loading && <span className="admin-data-status">Updated from API</span>}
            </div>

            {loading && (
              <p className="admin-state-message" role="status">Loading dashboard statistics…</p>
            )}

            {!loading && error && (
              <div className="admin-state-message admin-state-error" role="alert">
                <p>{error}</p>
                <button className="button button-small" type="button" onClick={() => setRetryCount(value => value + 1)}>
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && statistics && (
              <div className="admin-stat-grid">
                {statisticCards.map(({ key, label, marker, tone }) => (
                  <article className="admin-stat-card" key={key}>
                    <div className="admin-stat-card-topline">
                      <span>{label}</span>
                      <span className={`admin-stat-marker admin-stat-marker-${tone}`} aria-hidden="true">{marker}</span>
                    </div>
                    <strong className="admin-stat-value">{new Intl.NumberFormat().format(Number(statistics[key]))}</strong>
                    <span className="admin-stat-caption">Current total</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="admin-overview-note" aria-label="Dashboard data information">
            <div className="admin-overview-indicator" aria-hidden="true" />
            <div>
              <h2>System overview</h2>
              <p>These totals come from the current dashboard API response. Recent activity is not available from the admin API yet.</p>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
