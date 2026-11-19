import { useEffect, useState } from 'react';
import AdminModuleShell from '../components/AdminModuleShell.jsx';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import useAdminSession from '../hooks/useAdminSession.js';
import { getAdminUsers } from '../services/adminService.js';

const PAGE_SIZE = 25;
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function AdminUsersPage({ embedded = false }) {
  const handleUnauthorized = useAdminSession();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], pagination: { total: 0, totalPages: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getAdminUsers({ search, role, page, limit: PAGE_SIZE, signal: controller.signal })
      .then(setData)
      .catch(async (requestError) => {
        if (controller.signal.aborted || await handleUnauthorized(requestError)) return;
        setError(requestError.response?.data?.message || 'Unable to load registered users.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, role, page, retry, handleUnauthorized]);

  const content = <section className="module-panel admin-queue-panel admin-users-panel"><div className="module-panel-heading"><div><p className="admin-eyebrow">Read-only directory</p><h2>User management</h2><p className="field-help">{data.pagination.total} registered account{data.pagination.total === 1 ? '' : 's'}</p></div></div>
      <div className="module-filters admin-queue-filters"><label className="module-search">Search users<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Name or email" /></label><label>Role<select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }}><option value="">All roles</option><option>STUDENT</option><option>ADMIN</option></select></label></div>
      {loading && <ClaimLoading>Loading users…</ClaimLoading>}
      {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}
      {!loading && !error && (data.users.length ? <div className="responsive-table-wrap"><table className="module-table admin-users-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Registered</th></tr></thead><tbody>{data.users.map((user) => <tr key={user.id}><td><strong>{user.fullName}</strong></td><td><a href={`mailto:${user.email}`}>{user.email}</a></td><td><span className={`role-chip role-chip-${user.role.toLowerCase()}`}>{user.role}</span></td><td>{formatDate(user.registeredAt)}</td></tr>)}</tbody></table></div> : <div className="module-empty"><h3>No users found</h3><p>Try another search or role filter.</p></div>)}
      {!loading && !error && data.pagination.totalPages > 1 && <nav className="pagination-controls" aria-label="User pages"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {data.pagination.totalPages}</span><button type="button" disabled={page >= data.pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
    </section>;
  return embedded ? content : <AdminModuleShell title="Registered users" eyebrow="Administration / Users">{content}</AdminModuleShell>;
}
