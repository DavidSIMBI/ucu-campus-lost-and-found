import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getAdminDashboardStatistics } from '../services/adminService.js';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';

const statisticCards = [
  { key: 'totalUsers', label: 'Registered users', marker: 'USERS', tone: 'green' },
  { key: 'totalReports', label: 'Total reports', marker: 'REPORTS', tone: 'slate' },
  { key: 'lostItems', label: 'Lost items', marker: 'LOST', tone: 'gold' },
  { key: 'foundItems', label: 'Found items', marker: 'FOUND', tone: 'sage' },
  { key: 'totalClaims', label: 'Total claims', marker: 'CLAIMS', tone: 'blue' },
  { key: 'pendingClaims', label: 'Pending claims', marker: 'PENDING', tone: 'rose' },
  { key: 'approvedClaims', label: 'Approved claims', marker: 'APPROVED', tone: 'sage' },
  { key: 'rejectedClaims', label: 'Rejected claims', marker: 'REJECTED', tone: 'gold' },
  { key: 'returnedItems', label: 'Returned items', marker: 'RETURNED', tone: 'slate' }
];

function displayName(user) { return user?.fullName || user?.email || 'Administrator'; }
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function AdminDashboardPage({ embedded = false }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const result = await getAdminDashboardStatistics({ signal: controller.signal });
        if (!result?.statistics || !Array.isArray(result.recentClaims) || !Array.isArray(result.recentReports)) {
          throw new Error('The dashboard response is incomplete.');
        }
        setDashboard(result);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        if (requestError.response?.status === 401) {
          await logout();
          navigate('/login', { replace: true, state: { from: '/admin/dashboard' } });
          return;
        }
        setError(requestError.response?.status === 403
          ? 'Your account is not authorized to view the admin dashboard.'
          : requestError.response?.data?.message || requestError.message || 'Unable to load dashboard data.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    loadDashboard();
    return () => controller.abort();
  }, [retryCount, logout, navigate]);

  const statistics = dashboard?.statistics;
  const claimMax = Math.max(1, Number(statistics?.pendingClaims || 0), Number(statistics?.approvedClaims || 0), Number(statistics?.rejectedClaims || 0));

  return <section className={`admin-dashboard${embedded ? ' admin-dashboard-embedded' : ''}`} aria-label="Admin dashboard">
    <aside className="admin-sidebar">
      <Link className="admin-sidebar-brand" to="/" aria-label="UCU Lost and Found home"><span className="brand-mark" aria-hidden="true">U</span><span>UCU <strong>Administration</strong></span></Link>
      <p className="admin-sidebar-label">Workspace</p>
      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        <NavLink to="/admin/dashboard" end className="admin-sidebar-link"><span className="admin-nav-mark">01</span>Overview</NavLink>
        <NavLink to="/admin/claims" className="admin-sidebar-link"><span className="admin-nav-mark">02</span>Claims</NavLink>
        <NavLink to="/admin/users" className="admin-sidebar-link"><span className="admin-nav-mark">03</span>Users</NavLink>
        <NavLink to="/items" className="admin-sidebar-link"><span className="admin-nav-mark">04</span>Browse items</NavLink>
        <NavLink to="/my-reports" className="admin-sidebar-link"><span className="admin-nav-mark">05</span>My reports</NavLink>
      </nav>
      <div className="admin-sidebar-account"><span className="admin-account-avatar" aria-hidden="true">{displayName(user).trim().slice(0, 1).toUpperCase()}</span>
        <span className="admin-account-copy"><strong>{displayName(user)}</strong><small>Administrator</small></span>
        <button className="admin-sidebar-logout" type="button" onClick={logout}>Log out</button></div>
    </aside>

    <div className="admin-dashboard-main">
      <header className="admin-dashboard-header"><div><p className="admin-eyebrow">Administration / Overview</p><h1>Admin Dashboard</h1></div>
        <div className="admin-header-user"><span className="admin-header-avatar" aria-hidden="true">{displayName(user).trim().slice(0, 1).toUpperCase()}</span><span><strong>{displayName(user)}</strong><small>Administrator</small></span></div>
      </header>
      <div className="admin-dashboard-content">
        <section className="admin-welcome-card"><div><p className="admin-eyebrow">System overview</p><h2>Welcome back, {displayName(user)}</h2><p>Live activity and claim workload across the UCU Lost and Found platform.</p></div><span className="admin-welcome-seal" aria-hidden="true">UCU</span></section>
        <section className="admin-statistics-section" aria-labelledby="admin-statistics-title" aria-busy={loading}>
          <div className="admin-section-heading"><div><p className="admin-eyebrow">Live system data</p><h2 id="admin-statistics-title">Platform statistics</h2></div>{dashboard && !loading && <span className="admin-data-status">Updated from API</span>}</div>
          {loading && <p className="admin-state-message" role="status">Loading dashboard data…</p>}
          {!loading && error && <div className="admin-state-message admin-state-error" role="alert"><p>{error}</p><button className="button button-small" type="button" onClick={() => setRetryCount((value) => value + 1)}>Try again</button></div>}
          {!loading && !error && statistics && <div className="admin-stat-grid">{statisticCards.map(({ key, label, marker, tone }) => <article className="admin-stat-card" key={key}>
            <div className="admin-stat-card-topline"><span>{label}</span><span className={`admin-stat-marker admin-stat-marker-${tone}`}>{marker}</span></div>
            <strong className="admin-stat-value">{new Intl.NumberFormat().format(Number(statistics[key] || 0))}</strong><span className="admin-stat-caption">Current total</span>
          </article>)}</div>}
        </section>

        {!loading && !error && dashboard && <>
          <section className="module-panel admin-claim-chart" aria-labelledby="claim-status-chart-title"><div className="module-panel-heading"><div><p className="admin-eyebrow">Live workload</p><h2 id="claim-status-chart-title">Claims by status</h2></div><Link className="text-link" to="/admin/claims">Open claims queue →</Link></div>
            {[['Pending', statistics.pendingClaims, 'pending'], ['Approved', statistics.approvedClaims, 'approved'], ['Rejected', statistics.rejectedClaims, 'rejected']].map(([label, value, tone]) => <div className="claim-chart-row" key={tone}><span>{label}</span><progress className={`claim-chart-${tone}`} max={claimMax} value={Number(value || 0)} /><strong>{Number(value || 0)}</strong></div>)}
          </section>
          <div className="module-two-column admin-recent-grid">
            <section className="module-panel"><div className="module-panel-heading"><div><p className="admin-eyebrow">Review workload</p><h2>Recent claims</h2></div><Link className="text-link" to="/admin/claims">View all</Link></div>
              {dashboard.recentClaims.length ? <div className="admin-recent-list">{dashboard.recentClaims.map((claim) => <Link to={`/admin/claims/${claim.id}`} className="admin-recent-row" key={claim.id}><span><strong>{claim.report?.title || `Claim #${claim.id}`}</strong><small>{claim.claimantName} · {formatDate(claim.submittedAt)}</small></span><ClaimStatusBadge status={claim.status} /></Link>)}</div> : <p className="module-empty-copy">No claims have been submitted yet.</p>}
            </section>
            <section className="module-panel"><div className="module-panel-heading"><div><p className="admin-eyebrow">Campus activity</p><h2>Recent reports</h2></div><Link className="text-link" to="/found-items">Found items</Link></div>
              {dashboard.recentReports.length ? <div className="admin-recent-list">{dashboard.recentReports.map((report) => <div className="admin-recent-row" key={report.id}><span><strong>{report.title}</strong><small>{report.reportType} · {report.reporterName} · {formatDate(report.createdAt)}</small></span><ClaimStatusBadge status={report.status} /></div>)}</div> : <p className="module-empty-copy">No reports are available.</p>}
            </section>
          </div>
          <section className="module-quick-actions admin-quick-actions"><p className="admin-eyebrow">Quick actions</p><Link to="/admin/claims?status=PENDING">Review pending claims ↗</Link><Link to="/admin/users">Browse registered users ↗</Link><Link to="/found-items">View found items ↗</Link></section>
        </>}
      </div>
    </div>
  </section>;
}
