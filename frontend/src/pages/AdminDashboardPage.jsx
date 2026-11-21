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
  Link as MuiLink,
  Paper,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import useAdminSession from '../hooks/useAdminSession.js';
import { getAdminDashboardStatistics } from '../services/adminService.js';
import AdminModuleShell from '../components/AdminModuleShell.jsx';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';

const statisticCards = [
  { key: 'totalUsers', label: 'Registered users', marker: 'USERS', tone: 'primary' },
  { key: 'totalReports', label: 'Total reports', marker: 'REPORTS', tone: 'secondary' },
  { key: 'lostItems', label: 'Lost items', marker: 'LOST', tone: 'warning' },
  { key: 'foundItems', label: 'Found items', marker: 'FOUND', tone: 'success' },
  { key: 'totalClaims', label: 'Total claims', marker: 'CLAIMS', tone: 'primary' },
  { key: 'pendingClaims', label: 'Pending claims', marker: 'PENDING', tone: 'warning' },
  { key: 'approvedClaims', label: 'Approved claims', marker: 'APPROVED', tone: 'success' },
  { key: 'rejectedClaims', label: 'Rejected claims', marker: 'REJECTED', tone: 'error' },
  { key: 'returnedItems', label: 'Returned items', marker: 'RETURNED', tone: 'secondary' }
];

function displayName(user) {
  return user?.fullName || user?.email || 'Administrator';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function DashboardStatisticCard({ metric, value }) {
  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        minWidth: 0,
        overflow: 'hidden',
        borderTop: `3px solid ${theme.palette[metric.tone].main}`,
        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[3]
        }
      })}
    >
      <CardContent sx={{ p: { xs: 2, sm: 2.25 }, '&:last-child': { pb: { xs: 2, sm: 2.25 } } }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Typography color="text.secondary" sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>
            {metric.label}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={metric.marker}
            sx={{
              flexShrink: 0,
              height: 23,
              borderColor: 'divider',
              color: 'text.secondary',
              fontSize: 9,
              fontWeight: 750,
              letterSpacing: '0.04em'
            }}
          />
        </Stack>
        <Typography
          component="p"
          sx={{
            mt: 2,
            mb: 0,
            color: 'text.primary',
            fontSize: { xs: 28, sm: 32 },
            fontWeight: 750,
            letterSpacing: '-0.045em',
            lineHeight: 1
          }}
        >
          {value}
        </Typography>
        <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
          Current total
        </Typography>
      </CardContent>
    </Card>
  );
}

function RecentActivityPanel({ eyebrow, title, action, emptyMessage, children }) {
  return (
    <Card variant="outlined" sx={{ minWidth: 0, height: '100%' }}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          sx={{
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            mb: 1.5
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', fontSize: 9, fontWeight: 750, letterSpacing: '0.09em' }}
            >
              {eyebrow}
            </Typography>
            <Typography component="h3" sx={{ color: 'text.primary', fontSize: 16, fontWeight: 700 }}>
              {title}
            </Typography>
          </Box>
          {action}
        </Stack>
        {children || (
          <Typography color="text.secondary" sx={{ py: 3, fontSize: 13, textAlign: 'center' }}>
            {emptyMessage}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivityRow({ to, marker, title, description, status }) {
  const content = (
    <>
      <Avatar
        variant="rounded"
        sx={{
          flexShrink: 0,
          width: 36,
          height: 36,
          bgcolor: 'primary.light',
          color: 'primary.main',
          fontSize: 10,
          fontWeight: 800
        }}
      >
        {marker}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="p"
          sx={{
            overflow: 'hidden',
            mb: 0.4,
            color: 'text.primary',
            fontSize: 12,
            fontWeight: 700,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {title}
        </Typography>
        <Typography
          component="p"
          sx={{
            overflow: 'hidden',
            mb: 0,
            color: 'text.secondary',
            fontSize: 10,
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {description}
        </Typography>
      </Box>
      {status && <ClaimStatusBadge status={status} />}
    </>
  );

  const rowStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: 1.25,
    minWidth: 0,
    px: 1,
    py: 1.25,
    borderTop: '1px solid',
    borderColor: 'divider',
    textDecoration: 'none',
    transition: 'background-color 140ms ease',
    '&:hover': { bgcolor: '#f8fafd' },
    '&:focus-visible': {
      outline: '3px solid',
      outlineColor: 'primary.main',
      outlineOffset: 1,
      borderRadius: 1
    }
  };

  if (to) {
    return (
      <Box component={RouterLink} to={to} sx={rowStyles}>
        {content}
      </Box>
    );
  }

  return <Box sx={rowStyles}>{content}</Box>;
}

function ClaimsStatusPanel({ statistics, claimMax }) {
  const statuses = [
    { label: 'Pending', key: 'pendingClaims', tone: 'warning' },
    { label: 'Approved', key: 'approvedClaims', tone: 'success' },
    { label: 'Rejected', key: 'rejectedClaims', tone: 'error' }
  ];

  return (
    <Card variant="outlined">
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'space-between',
            mb: 2.5
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', fontSize: 9, fontWeight: 750, letterSpacing: '0.09em' }}
            >
              Review workload
            </Typography>
            <Typography component="h2" sx={{ color: 'text.primary', fontSize: 17, fontWeight: 700 }}>
              Claims by status
            </Typography>
          </Box>
          <MuiLink
            component={RouterLink}
            to="/admin/claims"
            underline="none"
            sx={{ fontSize: 12, fontWeight: 700 }}
          >
            Open claims queue →
          </MuiLink>
        </Stack>
        <Stack spacing={2}>
          {statuses.map((status) => {
            const count = Number(statistics[status.key] || 0);
            return (
              <Box
                key={status.key}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '76px minmax(0, 1fr) 38px', sm: '100px minmax(0, 1fr) 46px' },
                  alignItems: 'center',
                  gap: { xs: 1, sm: 1.5 }
                }}
              >
                <Typography color="text.secondary" sx={{ fontSize: 11, fontWeight: 600 }}>
                  {status.label}
                </Typography>
                <LinearProgress
                  aria-label={`${status.label} claims`}
                  variant="determinate"
                  color={status.tone}
                  value={(count / claimMax) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 99,
                    bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': { borderRadius: 99 }
                  }}
                />
                <Typography
                  component="span"
                  sx={{ color: 'text.primary', fontSize: 12, fontWeight: 700, textAlign: 'right' }}
                >
                  {new Intl.NumberFormat().format(count)}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function DashboardLoadingState() {
  return (
    <Box
      role="status"
      aria-label="Loading dashboard statistics"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' },
        gap: 2
      }}
    >
      {statisticCards.map((metric) => (
        <Card key={metric.key} variant="outlined">
          <CardContent sx={{ p: 2.25 }}>
            <Skeleton width="58%" />
            <Skeleton width="35%" height={42} sx={{ mt: 1 }} />
            <Skeleton width="42%" />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default function AdminDashboardPage({ embedded = false }) {
  const { user } = useAuth();
  const handleUnauthorized = useAdminSession();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const result = await getAdminDashboardStatistics({ signal: controller.signal });
        if (!result?.statistics || !Array.isArray(result.recentClaims) || !Array.isArray(result.recentReports)) {
          throw new Error('The dashboard response is incomplete.');
        }
        setDashboard(result);
      } catch (requestError) {
        if (controller.signal.aborted) return;
        if (await handleUnauthorized(requestError)) return;
        setError(requestError.response?.status === 403
          ? 'Your account is not authorized to view the admin dashboard.'
          : requestError.response?.data?.message || requestError.message || 'Unable to load dashboard data.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadDashboard();
    return () => controller.abort();
  }, [retryCount, handleUnauthorized]);

  const statistics = dashboard?.statistics;
  const claimMax = Math.max(
    1,
    Number(statistics?.pendingClaims || 0),
    Number(statistics?.approvedClaims || 0),
    Number(statistics?.rejectedClaims || 0)
  );
  const name = displayName(user);
  const dashboardContent = (
    <Box sx={{ display: 'grid', gap: { xs: 2.5, md: 3 } }}>
      <Paper
        component="section"
        elevation={0}
        aria-labelledby="admin-dashboard-welcome"
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 3,
          minHeight: { xs: 168, sm: 188 },
          overflow: 'hidden',
          border: 0,
          borderRadius: { xs: 2.5, sm: 3 },
          background: 'linear-gradient(115deg, #172b45 0%, #203e5f 100%)',
          color: '#fff',
          p: { xs: 2.5, sm: 3.5, lg: 4 }
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.25 }}>
            <Box
              aria-hidden="true"
              sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#a9cfbb' }}
            />
            <Typography
              sx={{
                color: '#d1dfeb',
                fontSize: 10,
                fontWeight: 750,
                letterSpacing: '0.12em',
                textTransform: 'uppercase'
              }}
            >
              Administration overview
            </Typography>
          </Stack>
          <Typography
            id="admin-dashboard-welcome"
            component="h2"
            sx={{
              mb: 0.75,
              color: 'inherit',
              fontSize: { xs: 22, sm: 27, lg: 30 },
              fontWeight: 700,
              letterSpacing: '-0.035em',
              lineHeight: 1.2
            }}
          >
            Welcome back, {name}
          </Typography>
          <Typography sx={{ maxWidth: 600, color: '#d7e1eb', fontSize: 13, lineHeight: 1.65 }}>
            Monitor campus reports and claim reviews from one place.
          </Typography>
        </Box>
        <Box
          aria-hidden="true"
          sx={{
            display: { xs: 'none', sm: 'grid' },
            flex: '0 0 auto',
            width: { sm: 88, lg: 104 },
            height: { sm: 88, lg: 104 },
            placeItems: 'center',
            border: '1px solid rgba(255,255,255,0.28)',
            borderRadius: '50%',
            color: '#d6c18d',
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: '0.1em',
            boxShadow: '0 0 0 14px rgba(255,255,255,0.035), 0 0 0 28px rgba(255,255,255,0.025)'
          }}
        >
          UCU
        </Box>
      </Paper>

      <Box component="section" aria-labelledby="admin-statistics-title" aria-busy={loading}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            alignItems: { xs: 'flex-start', sm: 'flex-end' },
            justifyContent: 'space-between',
            mb: 1.5
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', fontSize: 9, fontWeight: 750, letterSpacing: '0.09em' }}
            >
              Live system data
            </Typography>
            <Typography
              id="admin-statistics-title"
              component="h2"
              sx={{ color: 'text.primary', fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em' }}
            >
              Platform snapshot
            </Typography>
          </Box>
          {dashboard && !loading && (
            <Chip
              size="small"
              label="Updated from API"
              variant="outlined"
              sx={{ borderColor: 'divider', color: 'text.secondary', fontSize: 10, fontWeight: 600 }}
            />
          )}
        </Stack>
        {loading && <DashboardLoadingState />}
        {!loading && error && (
          <Alert
            severity="error"
            role="alert"
            action={(
              <Button
                color="inherit"
                size="small"
                onClick={() => setRetryCount((value) => value + 1)}
              >
                Try again
              </Button>
            )}
          >
            {error}
          </Alert>
        )}
        {!loading && !error && statistics && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                xl: 'repeat(3, minmax(0, 1fr))'
              },
              gap: { xs: 1.25, sm: 1.5, lg: 2 }
            }}
          >
            {statisticCards.map((metric) => (
              <DashboardStatisticCard
                key={metric.key}
                metric={metric}
                value={new Intl.NumberFormat().format(Number(statistics[metric.key] || 0))}
              />
            ))}
          </Box>
        )}
      </Box>

      {!loading && !error && dashboard && (
        <>
          <ClaimsStatusPanel statistics={statistics} claimMax={claimMax} />
          <Box
            component="section"
            aria-label="Recent activity"
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'repeat(2, minmax(0, 1fr))' },
              gap: 2
            }}
          >
            <RecentActivityPanel
              eyebrow="Review workload"
              title="Recent claims"
              emptyMessage="No claims have been submitted yet."
              action={(
                <MuiLink
                  component={RouterLink}
                  to="/admin/claims"
                  underline="none"
                  sx={{ fontSize: 11, fontWeight: 700 }}
                >
                  View all
                </MuiLink>
              )}
            >
              {dashboard.recentClaims.length > 0 && (
                <Box>
                  {dashboard.recentClaims.map((claim) => (
                    <RecentActivityRow
                      key={claim.id}
                      to={`/admin/claims/${claim.id}`}
                      marker="CL"
                      title={claim.report?.title || `Claim #${claim.id}`}
                      description={`${claim.claimantName} · ${formatDate(claim.submittedAt)}`}
                      status={claim.status}
                    />
                  ))}
                </Box>
              )}
            </RecentActivityPanel>

            <RecentActivityPanel
              eyebrow="Campus activity"
              title="Recent reports"
              emptyMessage="No reports are available."
              action={(
                <MuiLink
                  component={RouterLink}
                  to="/found-items"
                  underline="none"
                  sx={{ fontSize: 11, fontWeight: 700 }}
                >
                  Found items
                </MuiLink>
              )}
            >
              {dashboard.recentReports.length > 0 && (
                <Box>
                  {dashboard.recentReports.map((report) => (
                    <RecentActivityRow
                      key={report.id}
                      marker={report.reportType === 'FOUND' ? 'FD' : 'LS'}
                      title={report.title}
                      description={`${report.reportType} · ${report.reporterName} · ${formatDate(report.createdAt)}`}
                      status={report.status}
                    />
                  ))}
                </Box>
              )}
            </RecentActivityPanel>
          </Box>

          <Paper
            component="section"
            variant="outlined"
            aria-label="Dashboard quick actions"
            sx={{
              display: 'flex',
              alignItems: { xs: 'stretch', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              flexWrap: 'wrap',
              gap: 1,
              p: { xs: 1.5, sm: 2 },
              borderRadius: 2
            }}
          >
            <Typography
              sx={{
                flex: { sm: '1 0 100%', lg: '0 0 auto' },
                mr: { lg: 1 },
                color: 'text.secondary',
                fontSize: 10,
                fontWeight: 750,
                letterSpacing: '0.09em',
                textTransform: 'uppercase'
              }}
            >
              Quick actions
            </Typography>
            <Button component={RouterLink} to="/admin/claims?status=PENDING" variant="text" size="small">
              Review pending claims
            </Button>
            <Button component={RouterLink} to="/admin/users" variant="text" size="small">
              Browse registered users
            </Button>
            <Button component={RouterLink} to="/found-items" variant="text" size="small">
              View found items
            </Button>
          </Paper>
        </>
      )}
    </Box>
  );

  return embedded
    ? dashboardContent
    : <AdminModuleShell title="Admin Dashboard" eyebrow="Administration / Overview">{dashboardContent}</AdminModuleShell>;
}
