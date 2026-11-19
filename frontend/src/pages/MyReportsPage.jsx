import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Skeleton,
  Stack,
  Typography
} from '@mui/material';
import { api } from '../services/api.js';
import { getReportPhotoUrl } from '../services/reportPhoto.js';
import ReportManagementPage from '../components/reports/ReportManagementPage.jsx';
import ReportPageHeader from '../components/reports/ReportPageHeader.jsx';

function formatDate(value) {
  if (!value) return '—';

  const datePart = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return '—';

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC'
  }).format(date);
}

function getTypeStyles(type) {
  return type === 'FOUND'
    ? { backgroundColor: '#e7f0e8', color: '#356344' }
    : { backgroundColor: '#f5eddb', color: '#806522' };
}

function getStatusStyles(status) {
  if (status === 'RETURNED') return { backgroundColor: '#e8eef5', color: '#405f7b' };
  if (status === 'CLOSED') return { backgroundColor: '#eef0ee', color: '#58635c' };
  return { backgroundColor: '#e9f3eb', color: '#2f6840' };
}

function ReportPhoto({ report }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = getReportPhotoUrl(report.photo_path);

  useEffect(() => {
    setImageFailed(false);
  }, [report.photo_path]);

  if (!report.photo_path) return null;

  if (!photoUrl || imageFailed) {
    return (
      <Box
        role="status"
        sx={{
          minHeight: 155,
          display: 'grid',
          placeItems: 'center',
          px: 2,
          backgroundColor: '#f4f7f3',
          color: 'text.secondary',
          fontSize: 13
        }}
      >
        Report photo unavailable.
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={photoUrl}
      alt={`Photo for ${report.title}`}
      loading="lazy"
      decoding="async"
      onError={() => setImageFailed(true)}
      sx={{ display: 'block', width: '100%', height: 185, objectFit: 'cover', backgroundColor: '#f4f7f3' }}
    />
  );
}

function ReportCard({ report }) {
  const reportType = String(report.report_type || '').toUpperCase();
  const status = String(report.status || '').toUpperCase();

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <ReportPhoto report={report} />
      <CardContent sx={{ p: { xs: 2, sm: 2.5 }, flex: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} sx={{ mb: 1.75 }}>
          <Chip
            size="small"
            label={reportType || 'REPORT'}
            sx={{ ...getTypeStyles(reportType), fontSize: 11, fontWeight: 800, letterSpacing: '0.03em' }}
          />
          <Chip
            size="small"
            label={status || 'UNKNOWN'}
            sx={{ ...getStatusStyles(status), fontSize: 10, fontWeight: 800, letterSpacing: '0.03em' }}
          />
        </Stack>

        <Typography component="h2" variant="h3" sx={{ fontSize: 19, mb: 1, overflowWrap: 'anywhere' }}>
          {report.title}
        </Typography>
        {report.description && (
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{
              mb: 2,
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {report.description}
          </Typography>
        )}

        <Box
          component="dl"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '14px 18px',
            m: 0
          }}
        >
          {[
            ['Category', report.category || '—'],
            ['Location', report.location || '—'],
            ['Event date', formatDate(report.event_date)],
            ['Created', formatDate(report.created_at)]
          ].map(([label, value]) => (
            <Box component="div" key={label} sx={{ minWidth: 0 }}>
              <Typography component="dt" variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.35, fontWeight: 700 }}>
                {label}
              </Typography>
              <Typography component="dd" variant="body2" sx={{ m: 0, overflowWrap: 'anywhere' }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </CardContent>

      {status === 'OPEN' && (
        <CardActions sx={{ justifyContent: 'flex-end', px: { xs: 2, sm: 2.5 }, pb: 2 }}>
          <Button component={Link} to={`/my-reports/${report.id}/edit`} variant="outlined">
            Edit report
          </Button>
        </CardActions>
      )}
    </Card>
  );
}

function LoadingState() {
  return (
    <Box role="status" aria-label="Loading your reports">
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 3 }}>
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} variant="rounded" height={108} />)}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
        {Array.from({ length: 2 }, (_, index) => <Skeleton key={index} variant="rounded" height={295} />)}
      </Box>
    </Box>
  );
}

export default function MyReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadReports() {
      setLoading(true);
      setError('');

      try {
        const response = await api.get('/reports/mine', { signal: controller.signal });
        if (!Array.isArray(response.data?.reports)) {
          throw new Error('The reports response was not in the expected format.');
        }
        setReports(response.data.reports);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError.response?.data?.message ||
            requestError.message ||
            'Unable to load your reports. Please try again.'
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadReports();
    return () => controller.abort();
  }, [retryCount]);

  const summary = useMemo(() => ({
    total: reports.length,
    lost: reports.filter((report) => report.report_type?.toUpperCase() === 'LOST').length,
    found: reports.filter((report) => report.report_type?.toUpperCase() === 'FOUND').length,
    open: reports.filter((report) => report.status?.toUpperCase() === 'OPEN').length
  }), [reports]);

  const stats = [
    { label: 'Total reports', value: summary.total, note: 'Your reports on campus' },
    { label: 'Lost items', value: summary.lost, note: 'Items you are looking for' },
    { label: 'Found items', value: summary.found, note: 'Items you have found' },
    { label: 'Open reports', value: summary.open, note: 'Still active' }
  ];

  return (
    <ReportManagementPage>
      <ReportPageHeader
        eyebrow="Your campus reports"
        title="My Reports"
        description="Keep track of the lost and found items you have reported to the UCU community."
        action={(
          <Button component={Link} to="/report" variant="contained" size="large" sx={{ flex: '0 0 auto' }}>
            Create new report
          </Button>
        )}
      />

      {!loading && !error && (
        <Box
          component="section"
          aria-label="Report summary"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
            gap: 1.5,
            mb: { xs: 3, md: 4 }
          }}
        >
          {stats.map((stat, index) => (
            <Box
              key={stat.label}
              sx={{
                p: { xs: 1.75, sm: 2.25 },
                minHeight: 112,
                border: '1px solid',
                borderColor: 'divider',
                borderTop: '3px solid',
                borderTopColor: index === 0 ? 'primary.main' : 'secondary.light',
                borderRadius: 2,
                backgroundColor: 'background.paper'
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={700}>
                {stat.label}
              </Typography>
              <Typography variant="h2" sx={{ mt: 1, color: 'primary.main', fontSize: 30, lineHeight: 1 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                {stat.note}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {loading && <LoadingState />}

      {!loading && error && (
        <Alert
          severity="error"
          action={(
            <Button color="inherit" size="small" onClick={() => setRetryCount((count) => count + 1)}>
              Retry
            </Button>
          )}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && reports.length === 0 && (
        <Box
          sx={{
            py: { xs: 5, sm: 7 },
            px: 3,
            textAlign: 'center',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            backgroundColor: '#fff'
          }}
        >
          <Typography variant="h2" sx={{ fontSize: 24, mb: 1 }}>
            No reports yet
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 470, mx: 'auto', mb: 2.5, lineHeight: 1.7 }}>
            When you report a lost or found item, it will appear here so you can keep track of it.
          </Typography>
          <Button component={Link} to="/report" variant="contained">
            Create your first report
          </Button>
        </Box>
      )}

      {!loading && !error && reports.length > 0 && (
        <Box component="section" aria-label="Your reports">
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.75 }}>
            <Typography variant="h2" sx={{ fontSize: { xs: 20, sm: 22 } }}>
              All reports
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {reports.length} {reports.length === 1 ? 'report' : 'reports'}
            </Typography>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
            {reports.map((report) => <ReportCard key={report.id} report={report} />)}
          </Box>
        </Box>
      )}
    </ReportManagementPage>
  );
}
