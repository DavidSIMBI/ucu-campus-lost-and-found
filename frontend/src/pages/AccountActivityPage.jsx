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

function reportActivityLabel(reportType) {
  if (reportType === 'LOST') return 'Lost report';
  if (reportType === 'FOUND') return 'Found report';
  return 'Report';
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
      const reportActivity = reports.map((report) => ({
        kind: 'report',
        id: report.id,
        title: report.title || `Report #${report.id}`,
        status: report.status,
        date: report.created_at,
        reportType: report.report_type,
        path: report.report_type === 'FOUND' ? `/found-items/${report.id}` : '/account?section=reports'
      }));
      const claimActivity = claims.map((claim) => ({
        kind: 'claim',
        id: claim.id,
        title: claim.report?.title || `Claim #${claim.id}`,
        status: claim.status,
        date: claim.submittedAt,
        path: `/my-claims/${claim.id}`
      }));

      setActivity([...reportActivity, ...claimActivity].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)));
    }).catch((requestError) => {
      if (!controller.signal.aborted) setError(requestError.response?.data?.message || 'Unable to load recent activity.');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [retry]);

  return <section className="account-activity account-activity-timeline" aria-labelledby="account-activity-title">
    <header className="account-subheading account-activity-header">
      <div>
        <p className="section-label">Your activity</p>
        <h2 id="account-activity-title">Recent activity</h2>
        <p className="page-intro">Your latest reports and claims, in one timeline.</p>
      </div>
      {!loading && !error && activity.length > 0 && <span className="account-activity-count">{activity.length > 20 ? `Showing 20 of ${activity.length} activities` : `${activity.length} ${activity.length === 1 ? 'activity' : 'activities'}`}</span>}
    </header>

    {loading && <ClaimLoading>Loading your activity…</ClaimLoading>}
    {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}
    {!loading && !error && activity.length === 0 && <div className="module-empty account-activity-empty"><h3>No recent activity</h3><p>Your reports and claims will appear here.</p><Link className="button button-small" to="/report">Create a report</Link></div>}
    {!loading && !error && activity.length > 0 && <ol className="account-activity-list" aria-label="Recent reports and claims">
      {activity.slice(0, 20).map((entry) => {
        const typeLabel = entry.kind === 'claim' ? 'Claim' : reportActivityLabel(entry.reportType);
        const actionLabel = entry.kind === 'claim'
          ? 'Claim submitted'
          : entry.reportType === 'LOST'
            ? 'Lost report created'
            : entry.reportType === 'FOUND'
              ? 'Found report created'
              : 'Report created';
        return <li className={`account-activity-entry account-activity-entry-${entry.kind}`} key={`${entry.kind}-${entry.id}`}>
          <span className={`account-activity-marker account-activity-marker-${entry.kind}`} aria-hidden="true">{entry.kind === 'claim' ? 'C' : 'R'}</span>
          <div className="account-activity-body">
            <div className="account-activity-heading">
              <div className="account-activity-title">
                <span className={`account-activity-kind account-activity-kind-${entry.kind}`}>{typeLabel}</span>
                <Link to={entry.path}>{entry.title}</Link>
              </div>
              <ClaimStatusBadge status={entry.status} />
            </div>
            <div className="account-activity-meta">
              <span>{actionLabel}</span>
              <time dateTime={entry.date || undefined}>{activityDate(entry.date)}</time>
            </div>
          </div>
        </li>;
      })}
    </ol>}
  </section>;
}
