import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { getPublicReport } from '../services/foundItemsService.js';
import { getReportPhotoUrl } from '../services/reportPhoto.js';

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setReport(null);
    setImageFailed(false);
    getPublicReport(id, { signal: controller.signal })
      .then(setReport)
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.response?.data?.message || requestError.message || 'Unable to load this report.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  const photoUrl = getReportPhotoUrl(report?.photo_path);

  return <section className="module-page section-shell">
    <Link className="text-link" to="/items">← Back to listings</Link>
    {loading && <ClaimLoading>Loading report details…</ClaimLoading>}
    {!loading && error && <ClaimError message={error} />}
    {!loading && !error && report && <article className="found-item-detail module-panel">
      <p className="section-label">{report.report_type === 'FOUND' ? 'Found item' : 'Lost item'} · {report.category}</p>
      <h1>{report.title}</h1>
      {photoUrl && !imageFailed && <img className="my-report-photo" src={photoUrl} alt={report.title} onError={() => setImageFailed(true)} />}
      <p className="page-intro">{report.description}</p>
      <dl className="detail-grid">
        <div><dt>Location</dt><dd>{report.location}</dd></div>
        <div><dt>Event date</dt><dd>{String(report.event_date).slice(0, 10)}</dd></div>
        <div><dt>Status</dt><dd>{report.status}</dd></div>
      </dl>
      {report.report_type === 'FOUND' && report.status === 'OPEN' && <Link className="button" to={`/found-items/${report.id}/claim`}>Submit a claim</Link>}
    </article>}
  </section>;
}
