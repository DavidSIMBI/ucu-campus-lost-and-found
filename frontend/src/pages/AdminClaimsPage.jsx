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
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import AdminClaimStatusBadge from '../components/AdminClaimStatusBadge.jsx';
import AdminModuleShell from '../components/AdminModuleShell.jsx';
import useAdminSession from '../hooks/useAdminSession.js';
import { getAdminClaims, getAdminDashboardStatistics } from '../services/adminService.js';

const PAGE_SIZE = 20;
const statisticsCards = [
  { key: 'totalClaims', label: 'Total claims', color: 'primary' },
  { key: 'pendingClaims', label: 'Pending review', color: 'warning' },
  { key: 'approvedClaims', label: 'Approved', color: 'success' },
  { key: 'rejectedClaims', label: 'Rejected', color: 'error' }
];
const statisticKeys = statisticsCards.map(({ key }) => key);

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function formatCount(value) {
  return new Intl.NumberFormat().format(Number(value));
}

function isValidStatistics(value) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    statisticKeys.every((key) => Number.isFinite(Number(value[key])) && Number(value[key]) >= 0)
  );
}

function StatisticCard({ metric, value }) {
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        minWidth: 0,
        borderTop: `3px solid ${theme.palette[metric.color].main}`,
        transition: 'transform 160ms ease, box-shadow 160ms ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: theme.shadows[3] }
      })}
    >
      <CardContent sx={{ p: { xs: 1.75, sm: 2.25 }, '&:last-child': { pb: { xs: 1.75, sm: 2.25 } } }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography color="text.secondary" sx={{ fontSize: 11, fontWeight: 600, lineHeight: 1.4 }}>
            {metric.label}
          </Typography>
          <Chip
            label={metric.label.toUpperCase()}
            size="small"
            variant="outlined"
            sx={{ display: { xs: 'none', sm: 'inline-flex' }, height: 22, fontSize: 8, fontWeight: 750 }}
          />
        </Stack>
        <Typography component="p" sx={{ mt: 1.75, mb: 0, color: 'text.primary', fontSize: { xs: 25, sm: 30 }, fontWeight: 750, lineHeight: 1 }}>
          {formatCount(value)}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 0.75, fontSize: 10 }}>
          Current total
        </Typography>
      </CardContent>
    </Card>
  );
}

function ClaimantIdentity({ claimant }) {
  const initials = String(claimant.fullName || '')
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
          width: 34,
          height: 34,
          bgcolor: 'primary.light',
          color: 'primary.main',
          fontSize: 10,
          fontWeight: 750
        }}
      >
        {initials || '?'}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 700, overflowWrap: 'anywhere' }}>
          {claimant.fullName}
        </Typography>
        <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 10, overflowWrap: 'anywhere' }}>
          {claimant.email}
        </Typography>
      </Box>
    </Stack>
  );
}

function ClaimCard({ claim }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack spacing={1.5}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700 }}>
              Claim #{claim.id}
            </Typography>
            <AdminClaimStatusBadge status={claim.status} />
          </Stack>
          <ClaimantIdentity claimant={claim.claimant} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: 8, fontWeight: 750, letterSpacing: '0.08em' }}>
              Found item
            </Typography>
            <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 650, overflowWrap: 'anywhere' }}>
              {claim.report.title}
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
            <Typography color="text.secondary" sx={{ fontSize: 10 }}>
              Submitted {formatDate(claim.submittedAt)}
            </Typography>
            <Button component={RouterLink} to={`/admin/claims/${claim.id}`} variant="contained" size="small">
              Review claim
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ClaimsTable({ claims }) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table aria-label="Claims review queue" sx={{ minWidth: 850 }}>
        <TableHead>
          <TableRow>
            <TableCell>Claim</TableCell>
            <TableCell>Student</TableCell>
            <TableCell>Found item</TableCell>
            <TableCell>Submitted</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Review</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {claims.map((claim) => (
            <TableRow key={claim.id} hover>
              <TableCell sx={{ color: 'text.secondary', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                #{claim.id}
              </TableCell>
              <TableCell sx={{ minWidth: 190 }}>
                <ClaimantIdentity claimant={claim.claimant} />
              </TableCell>
              <TableCell sx={{ minWidth: 180, color: 'text.primary', fontSize: 12, overflowWrap: 'anywhere' }}>
                {claim.report.title}
              </TableCell>
              <TableCell sx={{ minWidth: 130, color: 'text.secondary', fontSize: 11, whiteSpace: 'nowrap' }}>
                {formatDate(claim.submittedAt)}
              </TableCell>
              <TableCell><AdminClaimStatusBadge status={claim.status} /></TableCell>
              <TableCell align="right">
                <Button component={RouterLink} to={`/admin/claims/${claim.id}`} variant="outlined" size="small">
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function EmptyState({ hasFilters }) {
  return (
    <Paper
      variant="outlined"
      sx={{ display: 'grid', minHeight: 170, placeContent: 'center', gap: 0.75, p: 3, textAlign: 'center', bgcolor: '#fbfcfe' }}
    >
      <Typography component="h3" sx={{ color: 'text.primary', fontSize: 14, fontWeight: 700 }}>
        {hasFilters ? 'No claims match these filters' : 'No claims to review'}
      </Typography>
      <Typography color="text.secondary" sx={{ fontSize: 12 }}>
        {hasFilters
          ? 'Try another search term or adjust the status and sort filters.'
          : 'New claim submissions will appear in this queue.'}
      </Typography>
    </Paper>
  );
}

export default function AdminClaimsPage({ embedded = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const handleUnauthorized = useAdminSession();
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('pending');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ claims: [], pagination: { total: 0, totalPages: 0 } });
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statisticsLoading, setStatisticsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statisticsError, setStatisticsError] = useState('');
  const [retry, setRetry] = useState(0);
  const [statisticsRetry, setStatisticsRetry] = useState(0);

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

  useEffect(() => {
    const controller = new AbortController();
    setStatisticsLoading(true);
    setStatisticsError('');
    getAdminDashboardStatistics({ signal: controller.signal })
      .then((result) => {
        if (!isValidStatistics(result?.statistics)) {
          throw new Error('The claims statistics response is incomplete.');
        }
        setStatistics(result.statistics);
      })
      .catch(async (requestError) => {
        if (controller.signal.aborted || await handleUnauthorized(requestError)) return;
        setStatisticsError(requestError.response?.data?.message || requestError.message || 'Unable to load claim statistics.');
      })
      .finally(() => { if (!controller.signal.aborted) setStatisticsLoading(false); });
    return () => controller.abort();
  }, [statisticsRetry, handleUnauthorized]);

  function updateStatus(value) {
    setStatus(value);
    setPage(1);
    setSearchParams(value ? { status: value } : {});
  }

  const claims = data.claims || [];
  const total = data.pagination?.total ?? 0;
  const totalPages = data.pagination?.totalPages ?? 0;
  const hasFilters = Boolean(search.trim() || status);
  const content = (
    <Box sx={{ display: 'grid', gap: { xs: 2, md: 2.5 } }}>
      <Paper
        component="section"
        aria-labelledby="admin-claims-title"
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
          <Typography variant="overline" sx={{ color: 'primary.main', fontSize: 9, fontWeight: 800, letterSpacing: '0.11em' }}>
            Review workspace
          </Typography>
          <Typography id="admin-claims-title" component="h2" sx={{ color: 'text.primary', fontSize: { xs: 20, sm: 24 }, fontWeight: 750 }}>
            Claims management
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, maxWidth: 600, fontSize: 12, lineHeight: 1.65 }}>
            Review student claims for found items, record decisions, and track completed handovers.
          </Typography>
        </Box>
        <Chip label="ADMIN WORKSPACE" color="primary" variant="outlined" size="small" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontSize: 9, fontWeight: 750 }} />
      </Paper>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.5} sx={{ alignItems: { xs: 'flex-start', sm: 'baseline' }, justifyContent: 'space-between' }}>
        <Typography component="h3" sx={{ color: 'text.primary', fontSize: 14, fontWeight: 700 }}>
          Claim statistics
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: 10 }}>
          Platform-wide current totals; unaffected by queue filters.
        </Typography>
      </Stack>

      {statisticsError && (
        <Alert
          severity="error"
          role="alert"
          action={<Button color="inherit" size="small" onClick={() => setStatisticsRetry((value) => value + 1)}>Retry statistics</Button>}
        >
          {statisticsError}
        </Alert>
      )}
      {!statisticsError && (
        <Box
          aria-label="Claim statistics"
          sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: { xs: 1, sm: 1.5 } }}
        >
          {statisticsLoading || !statistics
            ? statisticsCards.map((metric) => (
              <Card key={metric.key} variant="outlined" role="status" aria-label={`Loading ${metric.label}`}>
                <CardContent sx={{ p: 2 }}>
                  <Skeleton width="70%" />
                  <Skeleton width="45%" height={38} sx={{ mt: 1 }} />
                </CardContent>
              </Card>
            ))
            : statisticsCards.map((metric) => (
              <StatisticCard key={metric.key} metric={metric} value={statistics[metric.key]} />
            ))}
        </Box>
      )}

      <Card variant="outlined">
        <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mb: 1.75 }}>
            <Box>
              <Typography component="h3" sx={{ color: 'text.primary', fontSize: 14, fontWeight: 700 }}>
                Claims queue
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.4, fontSize: 11 }}>
                {loading ? 'Loading claim submissions…' : `${formatCount(total)} matching claim${total === 1 ? '' : 's'}`}
              </Typography>
            </Box>
            <Chip label="Review and handover" size="small" variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontSize: 9 }} />
          </Stack>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) repeat(2, minmax(150px, 190px))' },
              gap: 1.25
            }}
          >
            <TextField
              fullWidth
              label="Search claims"
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Student, email, or item title"
              size="small"
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <TextField
              fullWidth
              select
              label="Status"
              value={status}
              onChange={(event) => updateStatus(event.target.value)}
              size="small"
            >
              <MenuItem value="">All statuses</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
              <MenuItem value="WITHDRAWN">Withdrawn</MenuItem>
            </TextField>
            <TextField
              fullWidth
              select
              label="Sort by"
              value={sort}
              onChange={(event) => {
                setSort(event.target.value);
                setPage(1);
              }}
              size="small"
            >
              <MenuItem value="pending">Pending first</MenuItem>
              <MenuItem value="newest">Newest first</MenuItem>
              <MenuItem value="oldest">Oldest first</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {error && !loading && (
        <Alert
          severity="error"
          role="alert"
          action={<Button color="inherit" size="small" onClick={() => setRetry((value) => value + 1)}>Try again</Button>}
        >
          {error}
        </Alert>
      )}

      {loading && (
        <Box role="status" aria-label="Loading claims queue" sx={{ display: 'grid', gap: 1 }}>
          <LinearProgress sx={{ borderRadius: 99 }} />
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1 }}>
            <Skeleton variant="rounded" height={150} />
            <Skeleton variant="rounded" height={150} />
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <Skeleton variant="rounded" height={320} />
          </Box>
        </Box>
      )}

      {!loading && !error && claims.length === 0 && <EmptyState hasFilters={hasFilters} />}
      {!loading && !error && claims.length > 0 && (
        <>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            <ClaimsTable claims={claims} />
          </Box>
          <Box sx={{ display: { xs: 'grid', md: 'none' }, gap: 1 }}>
            {claims.map((claim) => <ClaimCard key={claim.id} claim={claim} />)}
          </Box>
          {totalPages > 1 && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.5 }}>
              <Typography color="text.secondary" sx={{ fontSize: 11 }}>
                Page {page} of {totalPages}
              </Typography>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, nextPage) => setPage(nextPage)}
                color="primary"
                size="small"
                aria-label="Claims queue pages"
                showFirstButton
                showLastButton
              />
            </Stack>
          )}
        </>
      )}
    </Box>
  );

  return embedded
    ? content
    : <AdminModuleShell title="Claims management" eyebrow="Administration / Claims">{content}</AdminModuleShell>;
}
