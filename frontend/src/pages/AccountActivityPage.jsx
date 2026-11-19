import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { api } from '../services/api.js';
import { getMyClaims } from '../services/claimsService.js';

function activityDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function AccountActivityPage() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([
      api.get('/reports/mine', { signal: controller.signal }),
      getMyClaims({ signal: controller.signal })
    ]).then(([reportResponse, claims]) => {
      const reports = Array.isArray(reportResponse.data?.reports) ? reportResponse.data.reports : [];
      setActivity([
        ...reports.map((report) => ({ kind: 'report', id: report.id, title: report.title, status: report.status, date: report.created_at, path: '/account?section=reports' })),
        ...claims.map((claim) => ({ kind: 'claim', id: claim.id, title: claim.report?.title || `Claim #${claim.id}`, status: claim.status, date: claim.submittedAt, path: `/my-claims/${claim.id}` }))
      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
    }).catch((requestError) => {
      if (!controller.signal.aborted) setError(requestError.response?.data?.message || 'Unable to load recent activity.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  return <section className="account-activity" aria-labelledby="account-activity-title">
    <header className="account-subheading"><div><p className="section-label">Your activity</p><h2 id="account-activity-title">Recent activity</h2><p className="page-intro">Your latest reports and claims, in one timeline.</p></div></header>
    {loading && <ClaimLoading>Loading your activity…</ClaimLoading>}
    {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}
    {!loading && !error && activity.length === 0 && <div className="module-empty"><h3>No recent activity</h3><p>Your reports and claims will appear here.</p><Link className="button button-small" to="/report">Create a report</Link></div>}
    {!loading && !error && activity.length > 0 && <ol className="account-activity-list">{activity.slice(0, 20).map((entry) => <li key={`${entry.kind}-${entry.id}`}><span className="account-activity-marker" aria-hidden="true">{entry.kind === 'claim' ? 'C' : 'R'}</span><div className="account-activity-copy"><Link to={entry.path}>{entry.title}</Link><small>{entry.kind === 'claim' ? 'Claim submitted' : 'Report created'} · {activityDate(entry.date)}</small></div><ClaimStatusBadge status={entry.status} /></li>)}</ol>}
  </section>;
}
