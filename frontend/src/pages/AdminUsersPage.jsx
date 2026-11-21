import { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import AdminModuleShell from '../components/AdminModuleShell.jsx';
import useAdminSession from '../hooks/useAdminSession.js';
import { getAdminUsers } from '../services/adminService.js';

const PAGE_SIZE = 25;

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function RoleBadge({ role }) {
  const isAdmin = role === 'ADMIN';
  return (
    <Chip
      label={isAdmin ? 'Administrator' : 'Student'}
      size="small"
      variant={isAdmin ? 'filled' : 'outlined'}
      color={isAdmin ? 'primary' : 'default'}
      sx={{ fontSize: 10, fontWeight: 700 }}
    />
  );
}

function AccountStatusBadge({ isActive }) {
  return (
    <Chip
      label={isActive ? 'Active' : 'Inactive'}
      size="small"
      color={isActive ? 'success' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
      sx={{ minWidth: 72, fontSize: 10, fontWeight: 700 }}
    />
  );
}

function UserIdentity({ user, compact = false }) {
  const initials = user.fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase();

  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar
        sx={{
          width: compact ? 40 : 34,
          height: compact ? 40 : 34,
          bgcolor: 'primary.light',
          color: 'primary.main',
          fontSize: compact ? 12 : 11,
          fontWeight: 750
        }}
      >
        {initials || '?'}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 700, overflowWrap: 'anywhere' }}>
          {user.fullName}
        </Typography>
        {compact && (
          <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 11, overflowWrap: 'anywhere' }}>
            {user.email}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}

function UserCard({ user }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <UserIdentity user={user} compact />
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <RoleBadge role={user.role} />
            <AccountStatusBadge isActive={user.isActive} />
          </Stack>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Typography color="text.secondary" sx={{ fontSize: 11 }}>
              Registered {formatDate(user.registeredAt)}
            </Typography>
            <Button
              component="a"
              href={`mailto:${user.email}`}
              variant="outlined"
              size="small"
              sx={{ alignSelf: { xs: 'stretch', sm: 'center' }, whiteSpace: 'nowrap' }}
            >
              Email user
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'grid',
        minHeight: 180,
        placeContent: 'center',
        gap: 0.75,
        p: 3,
        textAlign: 'center',
        bgcolor: '#fbfcfe'
      }}
    >
      <Typography component="h3" sx={{ color: 'text.primary', fontSize: 14, fontWeight: 700 }}>
        {hasFilters ? 'No matching users' : 'No registered users yet'}
      </Typography>
      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
        {hasFilters
          ? 'Try another search or choose a different role.'
          : 'Registered accounts will appear in this directory.'}
      </Typography>
    </Paper>
  );
}

function UserTable({ users }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="Registered user directory" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Registered</TableCell>
            <TableCell align="right">Contact</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} hover>
              <TableCell sx={{ minWidth: 180 }}>
                <UserIdentity user={user} />
              </TableCell>
              <TableCell sx={{ minWidth: 210, color: 'text.secondary', fontSize: 12, overflowWrap: 'anywhere' }}>
                {user.email}
              </TableCell>
              <TableCell><RoleBadge role={user.role} /></TableCell>
              <TableCell><AccountStatusBadge isActive={user.isActive} /></TableCell>
              <TableCell sx={{ minWidth: 130, color: 'text.secondary', fontSize: 11, whiteSpace: 'nowrap' }}>
                {formatDate(user.registeredAt)}
              </TableCell>
              <TableCell align="right">
                <Button component="a" href={`mailto:${user.email}`} variant="outlined" size="small">
                  Email
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
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

  const users = data.users || [];
  const total = data.pagination?.total ?? 0;
  const totalPages = data.pagination?.totalPages ?? 0;
  const hasFilters = Boolean(search.trim() || role);
  const content = (
    <Box sx={{ display: 'grid', gap: { xs: 2, md: 2.5 } }}>
      <Paper
        component="section"
        aria-labelledby="admin-users-title"
        variant="outlined"
        sx={{
          display: 'flex',
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          p: { xs: 2, sm: 2.75 },
          borderRadius: 2.5,
          background: 'linear-gradient(115deg, #ffffff 0%, #f8fafd 100%)'
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', fontSize: 9, fontWeight: 800, letterSpacing: '0.11em' }}
          >
            Read-only directory
          </Typography>
          <Typography id="admin-users-title" component="h2" sx={{ color: 'text.primary', fontSize: { xs: 20, sm: 24 }, fontWeight: 750 }}>
            User management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 580, fontSize: 12, lineHeight: 1.65 }}>
            Browse registered student and administrator accounts. This directory displays account roles and status without changing them.
          </Typography>
        </Box>
        <Paper
          variant="outlined"
          sx={{
            minWidth: { sm: 150 },
            p: 1.5,
            borderRadius: 2,
            bgcolor: 'background.paper'
          }}
          aria-live="polite"
        >
          <Typography color="text.secondary" sx={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.04em' }}>
            MATCHING ACCOUNTS
          </Typography>
          <Typography component="p" sx={{ mt: 0.25, color: 'text.primary', fontSize: 22, fontWeight: 750, lineHeight: 1.2 }}>
            {loading || error ? '—' : total}
          </Typography>
        </Paper>
      </Paper>

      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ justifyContent: 'space-between', mb: 1.75 }}>
            <Box>
              <Typography component="h3" sx={{ color: 'text.primary', fontSize: 14, fontWeight: 700 }}>
                Find users
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.4, fontSize: 11 }}>
                Search by name or email, or narrow the directory by role.
              </Typography>
            </Box>
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(180px, 240px)' },
              gap: 1.25
            }}
          >
            <TextField
              fullWidth
              label="Search users"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Name or email"
              size="small"
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <TextField
              fullWidth
              select
              label="Role"
              value={role}
              onChange={(event) => {
                setRole(event.target.value);
                setPage(1);
              }}
              size="small"
            >
              <MenuItem value="">All roles</MenuItem>
              <MenuItem value="STUDENT">Student</MenuItem>
              <MenuItem value="ADMIN">Administrator</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {error && !loading && (
        <Alert
          severity="error"
          role="alert"
          action={(
            <Button color="inherit" size="small" onClick={() => setRetry((value) => value + 1)}>
              Try again
            </Button>
          )}
        >
          {error}
        </Alert>
      )}

      {loading && (
        <Box role="status" aria-label="Loading users" sx={{ display: 'grid', gap: 1 }}>
          <LinearProgress sx={{ borderRadius: 99 }} />
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1 }}>
            <Skeleton variant="rounded" height={116} />
            <Skeleton variant="rounded" height={116} />
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Skeleton variant="rounded" height={300} />
          </Box>
        </Box>
      )}

      {!loading && !error && users.length === 0 && <EmptyState hasFilters={hasFilters} />}

      {!loading && !error && users.length > 0 && (
        <>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <UserTable users={users} />
          </Box>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1 }}>
            {users.map((user) => <UserCard key={user.id} user={user} />)}
          </Box>
          {totalPages > 1 && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}
            >
              <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                Page {page} of {totalPages}
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, nextPage) => setPage(nextPage)}
                color="primary"
                size="small"
                aria-label="User directory pages"
                showFirstButton
                showLastButton
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  );

  return embedded ? content : <AdminModuleShell title="Registered users" eyebrow="Administration / Users">{content}</AdminModuleShell>;
}
