import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AdminModuleShell from '../components/AdminModuleShell.jsx';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import useAdminSession from '../hooks/useAdminSession.js';
import { getAdminClaims } from '../services/adminService.js';

const PAGE_SIZE = 20;
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function AdminClaimsPage({ embedded = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const handleUnauthorized = useAdminSession();
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ claims: [], pagination: { total: 0, totalPages: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getAdminClaims({ status, search, sort, page, limit: PAGE_SIZE, signal: controller.signal })
      .then((result) => setData(result))
      .catch(async (requestError) => {
        if (controller.signal.aborted || await handleUnauthorized(requestError)) return;
        setError(requestError.response?.data?.message || 'Unable to load claims.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status, search, sort, page, retry, handleUnauthorized]);

  function updateStatus(value) {
    setStatus(value);
    setPage(1);
    setSearchParams(value ? { status: value } : {});
  }

  const content = <div className="module-panel admin-queue-panel admin-claims-panel">
      <div className="module-panel-heading"><div><p className="admin-eyebrow">Review workspace</p><h2>Claims queue</h2><p className="field-help">{data.pagination.total} claim{data.pagination.total === 1 ? '' : 's'} found</p></div></div>
      <div className="module-filters admin-queue-filters">
        <label className="module-search">Search claims<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Student, email, or item title" /></label>
        <label>Status<select value={status} onChange={(event) => updateStatus(event.target.value)}><option value="">All statuses</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option><option>WITHDRAWN</option></select></label>
        <label>Sort<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="pending">Pending first</option><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
      </div>
      {loading && <ClaimLoading>Loading claims queue…</ClaimLoading>}
      {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}
      {!loading && !error && (data.claims.length ? <div className="responsive-table-wrap"><table className="module-table admin-claims-table"><thead><tr><th scope="col">Claim</th><th scope="col">Student</th><th scope="col">Found item</th><th scope="col">Submitted</th><th scope="col">Status</th><th scope="col">Review</th></tr></thead><tbody>
        {data.claims.map((claim) => <tr className={`admin-claim-row admin-claim-row-${String(claim.status || '').toLowerCase()}`} key={claim.id}><td>#{claim.id}</td><td><strong>{claim.claimant.fullName}</strong><small>{claim.claimant.email}</small></td><td>{claim.report.title}</td><td>{formatDate(claim.submittedAt)}</td><td><ClaimStatusBadge status={claim.status} /></td><td><Link className="text-link" to={`/admin/claims/${claim.id}`}>Review →</Link></td></tr>)}
      </tbody></table></div> : <div className="module-empty"><h3>No claims match these filters</h3><p>Try a different status or search term.</p></div>)}
      {!loading && !error && data.pagination.totalPages > 1 && <nav className="pagination-controls" aria-label="Claims pages"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {data.pagination.totalPages}</span><button type="button" disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
    </div>;
  return embedded ? content : <AdminModuleShell title="Claims management" eyebrow="Administration / Claims">{content}</AdminModuleShell>;
}
