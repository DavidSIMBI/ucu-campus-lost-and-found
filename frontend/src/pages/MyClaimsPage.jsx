import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { getMyClaims } from '../services/claimsService.js';

const statusSummary = [
  { key: 'total', label: 'Total claims', tone: 'total' },
  { key: 'PENDING', label: 'Pending review', tone: 'pending' },
  { key: 'APPROVED', label: 'Approved', tone: 'approved' },
  { key: 'REJECTED', label: 'Rejected', tone: 'rejected' },
  { key: 'WITHDRAWN', label: 'Withdrawn', tone: 'withdrawn' }
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function getHandoverStatus(claim) {
  if (claim.status !== 'APPROVED') return '—';
  return claim.report?.status === 'RETURNED' ? 'Completed' : 'Pending';
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
      .catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError.response?.data?.message || 'Unable to load your claims.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);

  const counts = useMemo(() => ({
    total: claims.length,
    PENDING: claims.filter((claim) => claim.status === 'PENDING').length,
    APPROVED: claims.filter((claim) => claim.status === 'APPROVED').length,
    REJECTED: claims.filter((claim) => claim.status === 'REJECTED').length,
    WITHDRAWN: claims.filter((claim) => claim.status === 'WITHDRAWN').length
  }), [claims]);

  const visibleClaims = useMemo(
    () => status === 'ALL' ? claims : claims.filter((claim) => claim.status === status),
    [claims, status]
  );

  return (
    <section className="module-page section-shell my-claims-page" aria-labelledby="my-claims-title">
      <header className="module-heading my-claims-heading">
        <div>
          <p className="section-label">Your claim history</p>
          <h1 id="my-claims-title">My Claims</h1>
          <p className="page-intro">Review your submissions, decisions, and handover progress.</p>
        </div>
        <Link className="button" to="/found-items">Find an item</Link>
      </header>

      {location.state?.notice && (
        <p className="module-feedback module-feedback-success my-claims-notice" role="status">
          {location.state.notice}
        </p>
      )}

      {!loading && !error && (
        <section className="my-claims-summary" aria-labelledby="claim-status-summary-title">
          <header className="my-claims-section-heading">
            <div>
              <p className="section-label">Your submissions</p>
              <h2 id="claim-status-summary-title">Claim status summary</h2>
            </div>
            <p>Counts are based on the claims in your account.</p>
          </header>
          <div className="my-claims-stat-grid">
            {statusSummary.map(({ key, label, tone }) => (
              <article className={`my-claims-stat my-claims-stat-${tone}`} key={key}>
                <span>{label}</span>
                <strong>{counts[key]}</strong>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="my-claims-toolbar">
        <div>
          <h2>Your claims</h2>
          {!loading && !error && (
            <p>
              {visibleClaims.length} {visibleClaims.length === 1 ? 'claim' : 'claims'} shown
            </p>
          )}
        </div>
        <label className="my-claims-filter" htmlFor="my-claims-status">
          <span>Filter by status</span>
          <select
            id="my-claims-status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </select>
        </label>
      </div>

      {loading && <ClaimLoading>Loading your claims…</ClaimLoading>}
      {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}

      {!loading && !error && visibleClaims.length > 0 && (
        <section className="claim-list-page my-claims-list" aria-label="Your claims">
          {visibleClaims.map((claim) => (
            <article className="claim-summary-card my-claims-card" key={claim.id}>
              <div className="claim-summary-heading my-claims-card-heading">
                <div>
                  <span className="claim-reference">Claim #{claim.id}</span>
                  <h2>{claim.report?.title || 'Found item'}</h2>
                </div>
                <ClaimStatusBadge status={claim.status} />
              </div>

              {claim.justification && <p className="claim-summary-copy">{claim.justification}</p>}

              <dl className="claim-summary-meta my-claims-meta">
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDate(claim.submittedAt)}</dd>
                </div>
                <div>
                  <dt>Item location</dt>
                  <dd>{claim.report?.location || '—'}</dd>
                </div>
                <div>
                  <dt>Handover</dt>
                  <dd>{getHandoverStatus(claim)}</dd>
                </div>
              </dl>

              <Link className="text-link my-claims-details-link" to={`/my-claims/${claim.id}`}>
                View claim details
              </Link>
            </article>
          ))}
        </section>
      )}

      {!loading && !error && visibleClaims.length === 0 && (
        <div className="module-empty my-claims-empty">
          {claims.length === 0 ? (
            <>
              <h2>You have not submitted a claim</h2>
              <p>Claims you submit for found items will appear here with their latest status.</p>
              <Link className="button button-small" to="/found-items">Browse found items</Link>
            </>
          ) : (
            <>
              <h2>No claims match this status</h2>
              <p>Choose another status or show all of your claims.</p>
              <button className="button button-small" type="button" onClick={() => setStatus('ALL')}>
                Show all claims
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
