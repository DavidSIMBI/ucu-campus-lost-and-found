import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { getMyClaims } from '../services/claimsService.js';

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function MyClaimsPage() {
  const location = useLocation();
  const [claims, setClaims] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getMyClaims({ signal: controller.signal })
      .then(setClaims)
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError.response?.data?.message || 'Unable to load your claims.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  const visibleClaims = useMemo(() => status === 'ALL' ? claims : claims.filter((claim) => claim.status === status), [claims, status]);

  return <section className="module-page section-shell">
    <header className="module-heading"><div><p className="section-label">Your claim history</p><h1>My Claims</h1>
      <p className="page-intro">Review your submissions, decisions, and handover progress.</p></div>
      <Link className="button" to="/found-items">Find an item</Link></header>
    {location.state?.notice && <p className="module-feedback module-feedback-success" role="status">{location.state.notice}</p>}
    <div className="module-filters"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>
      <option value="ALL">All statuses</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option><option>WITHDRAWN</option>
    </select></label></div>
    {loading && <ClaimLoading>Loading your claims…</ClaimLoading>}
    {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}
    {!loading && !error && (visibleClaims.length ? <div className="claim-list-page">
      {visibleClaims.map((claim) => <article className="claim-summary-card" key={claim.id}>
        <div className="claim-summary-heading"><div><span className="claim-reference">Claim #{claim.id}</span><h2>{claim.report?.title || 'Found item'}</h2></div><ClaimStatusBadge status={claim.status} /></div>
        <p className="claim-summary-copy">{claim.justification}</p>
        <dl className="claim-summary-meta"><div><dt>Submitted</dt><dd>{formatDate(claim.submittedAt)}</dd></div><div><dt>Location</dt><dd>{claim.report?.location || '—'}</dd></div><div><dt>Handover</dt><dd>{claim.status === 'APPROVED' ? (claim.report?.status === 'RETURNED' ? 'Completed' : 'Pending') : '—'}</dd></div></dl>
        <Link className="text-link" to={`/my-claims/${claim.id}`}>View claim details →</Link>
      </article>)}
    </div> : <div className="module-empty"><h2>{claims.length ? 'No claims in this status' : 'You have not submitted a claim'}</h2><p>Claims for found items will appear here with their latest status.</p><Link className="button button-small" to="/found-items">Browse found items</Link></div>)}
  </section>;
}
