import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import useAdminSession from '../hooks/useAdminSession.js';
import {
  createManagedAdmin,
  getAdminAudit,
  getAdminSettings,
  getManagedAdmins,
  setAdminSetting,
  setManagedAdminRole,
  setManagedAdminStatus
} from '../services/adminService.js';

const views = [
  { id: 'admins', label: 'Administrators' },
  { id: 'audit', label: 'Audit log' },
  { id: 'settings', label: 'Settings' }
];

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function SuperAdminManagementPage() {
  const { user } = useAuth();
  const handleUnauthorized = useAdminSession();
  const [view, setView] = useState('admins');
  const [admins, setAdmins] = useState([]);
  const [audit, setAudit] = useState([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState({ page: 1, totalPages: 0 });
  const [settings, setSettings] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refresh, setRefresh] = useState(0);

  const loadAdmins = useCallback(async (signal) => {
    setLoading(true);
    try {
      setAdmins(await getManagedAdmins(search, { signal }));
      setError('');
    } catch (requestError) {
      if (signal?.aborted || await handleUnauthorized(requestError)) return;
      setError(requestError.response?.data?.message || 'Unable to load administrator accounts.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [handleUnauthorized, search]);

  useEffect(() => {
    const controller = new AbortController();
    loadAdmins(controller.signal);
    return () => controller.abort();
  }, [loadAdmins, refresh]);

  useEffect(() => {
    if (view !== 'audit') return undefined;
    const controller = new AbortController();
    getAdminAudit({ page: auditPage, limit: 25, signal: controller.signal })
      .then((data) => { setAudit(data.entries); setAuditPagination(data.pagination); })
      .catch(async (requestError) => {
        if (!controller.signal.aborted && !(await handleUnauthorized(requestError))) {
          setError(requestError.response?.data?.message || 'Unable to load the audit log.');
        }
      });
    return () => controller.abort();
  }, [auditPage, handleUnauthorized, view, refresh]);

  useEffect(() => {
    if (view !== 'settings') return undefined;
    const controller = new AbortController();
    getAdminSettings({ signal: controller.signal })
      .then(setSettings)
      .catch(async (requestError) => {
        if (!controller.signal.aborted && !(await handleUnauthorized(requestError))) {
          setError(requestError.response?.data?.message || 'Unable to load administrative settings.');
        }
      });
    return () => controller.abort();
  }, [handleUnauthorized, view, refresh]);

  async function submitAdmin(event) {
    event.preventDefault();
    setBusy('create');
    setError('');
    setMessage('');
    try {
      await createManagedAdmin(form);
      setForm({ fullName: '', email: '', password: '' });
      setMessage('Administrator account created.');
      setRefresh((value) => value + 1);
    } catch (requestError) {
      if (!(await handleUnauthorized(requestError))) setError(requestError.response?.data?.message || 'Unable to create the administrator account.');
    } finally {
      setBusy('');
    }
  }

  async function updateStatus(admin) {
    setBusy(`status-${admin.id}`);
    setError('');
    setMessage('');
    try {
      await setManagedAdminStatus(admin.id, !admin.isActive);
      setMessage(`${admin.fullName}'s account was ${admin.isActive ? 'deactivated' : 'activated'}.`);
      setRefresh((value) => value + 1);
    } catch (requestError) {
      if (!(await handleUnauthorized(requestError))) setError(requestError.response?.data?.message || 'Unable to update account status.');
    } finally {
      setBusy('');
    }
  }

  async function updateRole(admin) {
    const role = admin.role === 'ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
    setBusy(`role-${admin.id}`);
    setError('');
    setMessage('');
    try {
      await setManagedAdminRole(admin.id, role);
      setMessage(`${admin.fullName}'s role was changed to ${role}.`);
      setRefresh((value) => value + 1);
    } catch (requestError) {
      if (!(await handleUnauthorized(requestError))) setError(requestError.response?.data?.message || 'Unable to update the administrator role.');
    } finally {
      setBusy('');
    }
  }

  async function updateSetting(setting) {
    setBusy(`setting-${setting.key}`);
    setError('');
    setMessage('');
    try {
      await setAdminSetting(setting.key, !setting.value);
      setMessage(`${setting.label} setting updated.`);
      setRefresh((value) => value + 1);
    } catch (requestError) {
      if (!(await handleUnauthorized(requestError))) setError(requestError.response?.data?.message || 'Unable to update the setting.');
    } finally {
      setBusy('');
    }
  }

  if (user?.role !== 'SUPER_ADMIN') return null;

  return <section className="module-panel super-admin-panel">
    <div className="module-panel-heading">
      <div><p className="admin-eyebrow">Super Admin</p><h2>Administrative controls</h2><p className="field-help">Manage administrator access, review sensitive actions, and configure platform controls.</p></div>
    </div>
    <nav className="super-admin-tabs" aria-label="Super Admin sections">
      {views.map((item) => <button key={item.id} type="button" className={view === item.id ? 'active' : ''} aria-pressed={view === item.id} onClick={() => { setError(''); setMessage(''); setView(item.id); }}>{item.label}</button>)}
    </nav>
    {error && <p className="module-feedback module-feedback-error" role="alert">{error}</p>}
    {message && <p className="module-feedback module-feedback-success" role="status">{message}</p>}

    {view === 'admins' && <>
      <form className="super-admin-create-form" onSubmit={submitAdmin}>
        <h3>Create an ADMIN account</h3>
        <label>Full name<input required minLength="2" maxLength="120" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
        <label>Email<input type="email" required maxLength="254" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
        <label>Temporary password<input type="password" required minLength="8" maxLength="128" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" /></label>
        <button className="button button-small" type="submit" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create ADMIN'}</button>
      </form>
      <label className="super-admin-search">Search administrators<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label>
      {loading ? <p role="status">Loading administrator accounts…</p> : admins.length === 0 ? <div className="module-empty"><h3>No administrators found</h3><p>Create an ADMIN account or adjust your search.</p></div> : <div className="responsive-table-wrap"><table className="module-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>
        {admins.map((admin) => {
          const isSelf = Number(admin.id) === Number(user.id);
          const actionBusy = busy === `status-${admin.id}` || busy === `role-${admin.id}`;
          return <tr key={admin.id}>
            <td>{admin.fullName}{isSelf ? ' (you)' : ''}</td><td>{admin.email}</td>
            <td><span className={`role-chip role-chip-${admin.role.toLowerCase()}`}>{admin.role}</span></td>
            <td><span className={`status-pill ${admin.isActive ? 'is-active' : 'is-inactive'}`}>{admin.isActive ? 'Active' : 'Inactive'}</span></td>
            <td className="super-admin-actions">
              <button type="button" disabled={isSelf || actionBusy} onClick={() => updateStatus(admin)}>{admin.isActive ? 'Deactivate' : 'Activate'}</button>
              <button type="button" disabled={isSelf || actionBusy || (admin.role === 'ADMIN' && !admin.isActive)} onClick={() => updateRole(admin)}>{admin.role === 'ADMIN' ? 'Promote to Super Admin' : 'Demote to Admin'}</button>
            </td>
          </tr>;
        })}
      </tbody></table></div>}
    </>}

    {view === 'audit' && <div className="responsive-table-wrap"><table className="module-table"><thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody>
      {audit.map((entry) => <tr key={entry.id}><td>{displayDate(entry.createdAt)}</td><td>{entry.actor.name} · {entry.actor.role}</td><td>{entry.action}</td><td>{entry.target?.name || '—'}</td><td><code>{JSON.stringify(entry.metadata || {})}</code></td></tr>)}
      {!audit.length && <tr><td colSpan="5">No administrative actions recorded yet.</td></tr>}
    </tbody></table></div>}
    {view === 'audit' && auditPagination.totalPages > 1 && <nav className="pagination-controls" aria-label="Audit log pages"><button type="button" disabled={auditPage <= 1} onClick={() => setAuditPage((value) => value - 1)}>Previous</button><span>Page {auditPage} of {auditPagination.totalPages}</span><button type="button" disabled={auditPage >= auditPagination.totalPages} onClick={() => setAuditPage((value) => value + 1)}>Next</button></nav>}

    {view === 'settings' && <div className="super-admin-settings">
      {settings.map((setting) => <article key={setting.key}><div><h3>{setting.label}</h3><p>{setting.description}</p></div><button type="button" className={`status-pill ${setting.value ? 'is-active' : 'is-inactive'}`} aria-pressed={setting.value} disabled={busy === `setting-${setting.key}`} onClick={() => updateSetting(setting)}>{setting.value ? 'Enabled' : 'Disabled'}</button></article>)}
    </div>}
  </section>;
}
