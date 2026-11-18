import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

function formatDate(value) {
  if (!value) return '—';

  const datePart = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);

  if (!match) return '—';

  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  );

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC'
  }).format(date);
}

function ReportCard({ report }) {
  const reportType = String(report.report_type || '').toUpperCase();
  const status = String(report.status || '').toUpperCase();

  return (
    <article className="my-report-card">
      <div className="my-report-card-topline">
        <span className={`my-report-type my-report-type-${reportType.toLowerCase()}`}>
          {reportType}
        </span>
        <span className={`my-report-status my-report-status-${status.toLowerCase()}`}>
          {status}
        </span>
      </div>

      <h2>{report.title}</h2>

      <dl className="my-report-fields">
        <div>
          <dt>Category</dt>
          <dd>{report.category || '—'}</dd>
        </div>
        <div>
          <dt>Location</dt>
          <dd>{report.location || '—'}</dd>
        </div>
        <div>
          <dt>Event date</dt>
          <dd>{formatDate(report.event_date)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDate(report.created_at)}</dd>
        </div>
      </dl>

      {status === 'OPEN' && (
        <div className="my-report-card-actions">
          <Link className="button button-small" to={`/my-reports/${report.id}/edit`}>
            Edit report
          </Link>
        </div>
      )}
    </article>
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
        const response = await api.get('/reports/mine', {
          signal: controller.signal
        });

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
        if (!controller.signal.aborted) {
          setLoading(false);
        }
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

  return (
    <section className="section-shell my-reports-page">
      <header className="my-reports-header">
        <div>
          <p className="section-label">Your activity</p>
          <h1>My Reports</h1>
          <p className="page-intro">
            Keep track of the lost and found items you have reported.
          </p>
        </div>
        <Link className="button my-reports-create" to="/report">
          Create New Report
        </Link>
      </header>

      {!loading && !error && (
        <section className="my-reports-summary" aria-label="Report summary">
          <article className="my-reports-stat">
            <span>Total Reports</span>
            <strong>{summary.total}</strong>
          </article>
          <article className="my-reports-stat">
            <span>Lost Items</span>
            <strong>{summary.lost}</strong>
          </article>
          <article className="my-reports-stat">
            <span>Found Items</span>
            <strong>{summary.found}</strong>
          </article>
          <article className="my-reports-stat">
            <span>Open Reports</span>
            <strong>{summary.open}</strong>
          </article>
        </section>
      )}

      {loading && (
        <p className="my-reports-message" role="status">Loading your reports…</p>
      )}

      {!loading && error && (
        <div className="my-reports-message my-reports-error" role="alert">
          <p>{error}</p>
          <button
            className="button"
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className="my-reports-empty">
          <h2>You have no reports yet</h2>
          <p>Reports you create will appear here so you can keep track of them.</p>
          <Link className="button" to="/report">Create New Report</Link>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <section className="my-reports-list" aria-label="Your reports">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </section>
      )}
    </section>
  );
}
