import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
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
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function RoleBadge({ role }) {
  const isSuperAdmin = role === 'SUPER_ADMIN';
  return (
    <Chip
      size="small"
      label={role}
      variant="outlined"
      color={isSuperAdmin ? 'primary' : 'default'}
      sx={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.02em'
      }}
    />
  );
}

function AccountStatusBadge({ isActive }) {
  return (
    <Chip
      size="small"
      label={isActive ? 'Active' : 'Inactive'}
      color={isActive ? 'success' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
      sx={{ minWidth: 72, fontSize: 10, fontWeight: 700 }}
    />
  );
}

function AdminActionButtons({ admin, isSelf, busy, onUpdateStatus, onUpdateRole }) {
  const actionBusy = busy === `status-${admin.id}` || busy === `role-${admin.id}`;
  const promotionDisabled = admin.role === 'ADMIN' && !admin.isActive;

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={0.75}
      sx={{ alignItems: { xs: 'stretch', sm: 'center' }, minWidth: { sm: 220 } }}
    >
      <Button
        type="button"
        size="small"
        variant="outlined"
        color={admin.isActive ? 'error' : 'primary'}
        disabled={isSelf || actionBusy}
        onClick={() => onUpdateStatus(admin)}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {admin.isActive ? 'Deactivate' : 'Activate'}
      </Button>
      <Button
        type="button"
        size="small"
        variant={admin.role === 'ADMIN' ? 'contained' : 'outlined'}
        disabled={isSelf || actionBusy || promotionDisabled}
        onClick={() => onUpdateRole(admin)}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {admin.role === 'ADMIN' ? 'Promote to Super Admin' : 'Demote to Admin'}
      </Button>
    </Stack>
  );
}

function AdminMobileCard({ admin, user, busy, onUpdateStatus, onUpdateRole }) {
  const isSelf = Number(admin.id) === Number(user.id);
  return (
    <Card key={admin.id} variant="outlined">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', mb: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              bgcolor: 'primary.light',
              color: 'primary.main',
              fontSize: 13,
              fontWeight: 700
            }}
          >
            {admin.fullName.trim().slice(0, 1).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ color: 'text.primary', fontSize: 13, fontWeight: 700 }}>
              {admin.fullName}
              {isSelf && <Typography component="span" color="text.secondary" sx={{ ml: 0.75, fontSize: 10, fontWeight: 500 }}>You</Typography>}
            </Typography>
            <Typography sx={{ overflowWrap: 'anywhere', color: 'text.secondary', fontSize: 11 }}>
              {admin.email}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.75 }}>
          <RoleBadge role={admin.role} />
          <AccountStatusBadge isActive={admin.isActive} />
        </Stack>
        <AdminActionButtons
          admin={admin}
          isSelf={isSelf}
          busy={busy}
          onUpdateStatus={onUpdateStatus}
          onUpdateRole={onUpdateRole}
        />
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'grid',
        minHeight: 160,
        placeContent: 'center',
        gap: 0.75,
        p: 3,
        textAlign: 'center',
        bgcolor: '#fbfcfe'
      }}
    >
      <Typography component="h3" sx={{ color: 'text.primary', fontSize: 14, fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
        {description}
      </Typography>
    </Paper>
  );
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
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
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
    setAuditLoading(true);
    getAdminAudit({ page: auditPage, limit: 25, signal: controller.signal })
      .then((data) => {
        setAudit(data.entries);
        setAuditPagination(data.pagination);
        setError('');
      })
      .catch(async (requestError) => {
        if (!controller.signal.aborted && !(await handleUnauthorized(requestError))) {
          setError(requestError.response?.data?.message || 'Unable to load the audit log.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAuditLoading(false);
      });
    return () => controller.abort();
  }, [auditPage, handleUnauthorized, view, refresh]);

  useEffect(() => {
    if (view !== 'settings') return undefined;
    const controller = new AbortController();
    setSettingsLoading(true);
    getAdminSettings({ signal: controller.signal })
      .then((data) => {
        setSettings(data);
        setError('');
      })
      .catch(async (requestError) => {
        if (!controller.signal.aborted && !(await handleUnauthorized(requestError))) {
          setError(requestError.response?.data?.message || 'Unable to load administrative settings.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettingsLoading(false);
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

  const filteredAdmins = admins.filter((admin) => (
    (roleFilter === 'ALL' || admin.role === roleFilter) &&
    (statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? admin.isActive : !admin.isActive))
  ));

  const administratorTable = (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="Administrator directory" size="medium">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell sx={{ minWidth: 230 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredAdmins.map((admin) => {
            const isSelf = Number(admin.id) === Number(user.id);
            return (
              <TableRow key={admin.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 150 }}>
                    <Avatar
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        fontSize: 11,
                        fontWeight: 700
                      }}
                    >
                      {admin.fullName.trim().slice(0, 1).toUpperCase()}
                    </Avatar>
                    <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 650 }}>
                      {admin.fullName}{isSelf ? ' (you)' : ''}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{admin.email}</TableCell>
                <TableCell><RoleBadge role={admin.role} /></TableCell>
                <TableCell><AccountStatusBadge isActive={admin.isActive} /></TableCell>
                <TableCell>
                  <AdminActionButtons
                    admin={admin}
                    isSelf={isSelf}
                    busy={busy}
                    onUpdateStatus={updateStatus}
                    onUpdateRole={updateRole}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 } }}>
      <Paper
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          p: { xs: 2, sm: 2.75 },
          borderRadius: 2.5,
          background: 'linear-gradient(115deg, #ffffff 0%, #f8fafd 100%)'
        }}
      >
        <Stack direction="row" spacing={1.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar
            variant="rounded"
            sx={{
              width: { xs: 44, sm: 52 },
              height: { xs: 44, sm: 52 },
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontSize: 13,
              fontWeight: 800
            }}
          >
            SA
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              sx={{ color: 'primary.main', fontSize: 9, fontWeight: 800, letterSpacing: '0.11em' }}
            >
              Governance workspace
            </Typography>
            <Typography component="h2" sx={{ color: 'text.primary', fontSize: { xs: 18, sm: 21 }, fontWeight: 750 }}>
              Administrative controls
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.4, fontSize: 12, lineHeight: 1.6 }}>
              Manage administrator access, review sensitive actions, and configure platform controls.
            </Typography>
          </Box>
        </Stack>
        <Chip
          label="SUPER ADMIN"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ display: { xs: 'none', sm: 'inline-flex' }, flexShrink: 0, fontSize: 9, fontWeight: 750 }}
        />
      </Paper>

      <Paper variant="outlined" sx={{ p: { xs: 0.75, sm: 1 }, borderRadius: 2 }}>
        <Tabs
          value={view}
          onChange={(_, nextView) => {
            setError('');
            setMessage('');
            setView(nextView);
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="Super Admin management sections"
        >
          {views.map((item) => <Tab key={item.id} value={item.id} label={item.label} />)}
        </Tabs>
      </Paper>

      {error && <Alert severity="error" role="alert">{error}</Alert>}
      {message && <Alert severity="success" role="status">{message}</Alert>}

      {view === 'admins' && (
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Card variant="outlined">
            <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography component="h3" sx={{ color: 'text.primary', fontSize: 15, fontWeight: 700 }}>
                    Create an ADMIN account
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 11 }}>
                    Provide account details to grant administrator access.
                  </Typography>
                </Box>
                <Chip label="ADMIN role" size="small" variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontSize: 10 }} />
              </Stack>
              <Divider sx={{ mb: 2 }} />
              <Box
                component="form"
                onSubmit={submitAdmin}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                  gap: 1.5
                }}
              >
                <TextField
                  label="Full name"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  required
                  slotProps={{ htmlInput: { minLength: 2, maxLength: 120 } }}
                  autoComplete="name"
                  size="small"
                />
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                  slotProps={{ htmlInput: { maxLength: 254 } }}
                  autoComplete="email"
                  size="small"
                />
                <TextField
                  label="Temporary password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                  slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
                  autoComplete="new-password"
                  helperText="Use 8–128 characters."
                  size="small"
                />
                <Stack sx={{ justifyContent: 'flex-end' }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={busy === 'create'}
                    startIcon={busy === 'create' ? <CircularProgress color="inherit" size={15} /> : null}
                    sx={{ alignSelf: { xs: 'stretch', md: 'flex-start' }, minHeight: 42 }}
                  >
                    {busy === 'create' ? 'Creating account…' : 'Create administrator'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
              <Stack
                direction={{ xs: 'column', lg: 'row' }}
                spacing={1.5}
                sx={{ alignItems: { xs: 'stretch', lg: 'center' }, justifyContent: 'space-between', mb: 2 }}
              >
                <Box>
                  <Typography component="h3" sx={{ color: 'text.primary', fontSize: 15, fontWeight: 700 }}>
                    Administrator directory
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 11 }}>
                    {loading
                      ? 'Loading administrator accounts…'
                      : `${filteredAdmins.length} shown · ${admins.length} matching search`}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'minmax(210px, 1fr) repeat(2, minmax(135px, 160px))' },
                    gap: 1,
                    width: { lg: 'min(100%, 700px)' }
                  }}
                >
                  <TextField
                    label="Search administrators"
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Name or email"
                    size="small"
                  />
                  <TextField
                    select
                    label="Role"
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    size="small"
                  >
                    <MenuItem value="ALL">All roles</MenuItem>
                    <MenuItem value="ADMIN">Admin</MenuItem>
                    <MenuItem value="SUPER_ADMIN">Super Admin</MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    size="small"
                  >
                    <MenuItem value="ALL">All statuses</MenuItem>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                  </TextField>
                </Box>
              </Stack>

              {loading && (
                <Box role="status" aria-label="Loading administrator directory">
                  <LinearProgress sx={{ mb: 1.5, borderRadius: 99 }} />
                  <Skeleton variant="rounded" height={56} />
                  <Skeleton variant="rounded" height={56} sx={{ mt: 1 }} />
                </Box>
              )}
              {!loading && filteredAdmins.length === 0 && (
                <EmptyState
                  title="No administrators found"
                  description="Try another search or adjust the role and status filters."
                />
              )}
              {!loading && filteredAdmins.length > 0 && (
                <>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    {administratorTable}
                  </Box>
                  <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1.25 }}>
                    {filteredAdmins.map((admin) => (
                      <AdminMobileCard
                        key={admin.id}
                        admin={admin}
                        user={user}
                        busy={busy}
                        onUpdateStatus={updateStatus}
                        onUpdateRole={updateRole}
                      />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {view === 'audit' && (
        <Card variant="outlined">
          <CardContent sx={{ p: { xs: 1.5, sm: 2.5 }, '&:last-child': { pb: { xs: 1.5, sm: 2.5 } } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Typography component="h3" sx={{ color: 'text.primary', fontSize: 15, fontWeight: 700 }}>
                  Administrative activity
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 11 }}>
                  Review sensitive administrator actions and their recorded details.
                </Typography>
              </Box>
              <Chip label="Audit log" size="small" variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontSize: 10 }} />
            </Stack>
            {auditLoading && (
              <Box role="status" aria-label="Loading audit log">
                <LinearProgress sx={{ mb: 1.5, borderRadius: 99 }} />
                <Skeleton variant="rounded" height={220} />
              </Box>
            )}
            {!auditLoading && audit.length === 0 && (
              <EmptyState
                title="No administrative activity yet"
                description="Recorded administrator actions will appear here."
              />
            )}
            {!auditLoading && audit.length > 0 && (
              <TableContainer component={Paper} variant="outlined">
                <Table aria-label="Administrative audit log" size="small" sx={{ minWidth: 760 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>When</TableCell>
                      <TableCell>Administrator</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Target</TableCell>
                      <TableCell>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {audit.map((entry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell sx={{ minWidth: 165, color: 'text.secondary', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {displayDate(entry.createdAt)}
                        </TableCell>
                        <TableCell sx={{ minWidth: 190 }}>
                          <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 650 }}>
                            {entry.actor.name}
                          </Typography>
                          <Box sx={{ mt: 0.5 }}><RoleBadge role={entry.actor.role} /></Box>
                        </TableCell>
                        <TableCell sx={{ minWidth: 160 }}>
                          <Chip
                            label={entry.action}
                            size="small"
                            variant="outlined"
                            color="primary"
                            sx={{ maxWidth: 210, fontSize: 9, fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 130, color: 'text.secondary', fontSize: 11 }}>
                          {entry.target?.name || '—'}
                        </TableCell>
                        <TableCell sx={{ minWidth: 220, maxWidth: 340 }}>
                          <Box
                            component="code"
                            sx={{
                              display: 'block',
                              maxHeight: 88,
                              overflow: 'auto',
                              color: 'text.secondary',
                              fontSize: 10,
                              overflowWrap: 'anywhere',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {JSON.stringify(entry.metadata || {}, null, 2)}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {!auditLoading && auditPagination.totalPages > 1 && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 2 }}
              >
                <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                  Page {auditPage} of {auditPagination.totalPages}
                </Typography>
                <Pagination
                  count={auditPagination.totalPages}
                  page={auditPage}
                  onChange={(_, page) => setAuditPage(page)}
                  color="primary"
                  size="small"
                  aria-label="Audit log pages"
                  showFirstButton
                  showLastButton
                />
              </Stack>
            )}
          </CardContent>
        </Card>
      )}

      {view === 'settings' && (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
            <Box>
              <Typography component="h3" sx={{ color: 'text.primary', fontSize: 15, fontWeight: 700 }}>
                Platform settings
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 11 }}>
                Toggle the administrative controls available to the platform.
              </Typography>
            </Box>
            <Chip label="Configuration" size="small" variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontSize: 10 }} />
          </Stack>
          {settingsLoading && (
            <Box role="status" aria-label="Loading platform settings" sx={{ display: 'grid', gap: 1.25 }}>
              <LinearProgress sx={{ borderRadius: 99 }} />
              <Skeleton variant="rounded" height={84} />
              <Skeleton variant="rounded" height={84} />
            </Box>
          )}
          {!settingsLoading && settings.length === 0 && (
            <EmptyState
              title="No settings available"
              description="There are no administrative settings to display."
            />
          )}
          {!settingsLoading && settings.map((setting) => {
            const settingBusy = busy === `setting-${setting.key}`;
            return (
              <Card key={setting.key} variant="outlined">
                <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography component="h4" sx={{ color: 'text.primary', fontSize: 13, fontWeight: 700 }}>
                        {setting.label}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 11, lineHeight: 1.6 }}>
                        {setting.description}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                      <Chip
                        label={setting.value ? 'Enabled' : 'Disabled'}
                        size="small"
                        color={setting.value ? 'success' : 'default'}
                        variant={setting.value ? 'filled' : 'outlined'}
                        sx={{ minWidth: 76, fontSize: 10, fontWeight: 700 }}
                      />
                      <FormControlLabel
                        sx={{ m: 0 }}
                        label={settingBusy ? <CircularProgress size={16} aria-label="Saving setting" /> : ''}
                        control={(
                          <Switch
                            checked={Boolean(setting.value)}
                            disabled={settingBusy}
                            onChange={() => updateSetting(setting)}
                            slotProps={{ input: { 'aria-label': `Toggle ${setting.label}` } }}
                          />
                        )}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
