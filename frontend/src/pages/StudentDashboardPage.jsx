import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyClaims } from '../services/claimsService.js';

const statusCards = [
  { key: 'total', label: 'Total claims', tone: 'green' },
  { key: 'pending', label: 'Pending review', tone: 'gold' },
  { key: 'approved', label: 'Approved', tone: 'blue' },
  { key: 'rejected', label: 'Rejected', tone: 'rose' }
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getMyClaims({ signal: controller.signal })
      .then(setClaims)
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.response?.data?.message || 'Unable to load your claims.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const counts = useMemo(() => ({
    total: claims.length,
    pending: claims.filter((claim) => claim.status === 'PENDING').length,
    approved: claims.filter((claim) => claim.status === 'APPROVED').length,
    rejected: claims.filter((claim) => claim.status === 'REJECTED').length
  }), [claims]);

  return (
    <section className="module-page section-shell">
      <header className="module-heading">
        <div><p className="section-label">Student workspace</p><h1>Welcome, {user?.fullName?.split(' ')[0] || 'student'}</h1>
          <p className="page-intro">Track your claims and find a path to reunite with your belongings.</p></div>
        <Link className="button" to="/found-items">Find an item</Link>
      </header>

      {loading && <ClaimLoading>Loading your dashboard…</ClaimLoading>}
      {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}
      {!loading && !error && <>
        <div className="module-stat-grid">
          {statusCards.map(({ key, label, tone }) => <article className={`module-stat module-stat-${tone}`} key={key}>
            <span>{label}</span><strong>{counts[key]}</strong>
          </article>)}
        </div>

        <div className="module-two-column">
          <section className="module-panel" aria-labelledby="recent-claims-title">
            <div className="module-panel-heading"><div><p className="section-label">Your activity</p><h2 id="recent-claims-title">Recent claims</h2></div>
              <Link className="text-link" to="/my-claims">View all</Link></div>
            {claims.length === 0 ? <div className="module-empty"><h3>No claims yet</h3><p>Claims you submit for found items will appear here.</p><Link className="button button-small" to="/found-items">Explore found items</Link></div> :
              <div className="claim-list">{claims.slice(0, 5).map((claim) => <Link className="claim-list-row" to={`/my-claims/${claim.id}`} key={claim.id}>
                <span><strong>{claim.report?.title || `Claim #${claim.id}`}</strong><small>Submitted {formatDate(claim.submittedAt)}</small></span>
                <ClaimStatusBadge status={claim.status} />
              </Link>)}</div>}
          </section>

          <aside className="module-panel module-quick-actions">
            <p className="section-label">Get started</p><h2>Quick actions</h2>
            <Link to="/found-items">Browse found items <span aria-hidden="true">↗</span></Link>
            <Link to="/my-claims">Track my claims <span aria-hidden="true">↗</span></Link>
            <Link to="/report">Report an item <span aria-hidden="true">↗</span></Link>
          </aside>
        </div>
      </>}
    </section>
  );
}
