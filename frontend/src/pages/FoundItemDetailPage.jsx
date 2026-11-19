import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { getFoundItem } from '../services/foundItemsService.js';

export default function FoundItemDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getFoundItem(id, { signal: controller.signal })
      .then((item) => {
        if (item?.report_type !== 'FOUND') throw new Error('This listing is not a found item.');
        setReport(item);
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.response?.data?.message || requestError.message || 'Unable to load this item.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  return <section className="module-page section-shell">
    <Link className="text-link" to="/found-items">← Back to found items</Link>
    {loading && <ClaimLoading>Loading item details…</ClaimLoading>}
    {!loading && error && <ClaimError message={error} />}
    {!loading && !error && report && <article className="found-item-detail module-panel">
      <p className="section-label">Found item · {report.category}</p><h1>{report.title}</h1>
      <p className="page-intro">{report.description}</p>
      <dl className="detail-grid"><div><dt>Location found</dt><dd>{report.location}</dd></div><div><dt>Event date</dt><dd>{String(report.event_date).slice(0, 10)}</dd></div><div><dt>Status</dt><dd>{report.status}</dd></div><div><dt>Reported by</dt><dd>{report.reporter_name}</dd></div></dl>
      <p className="private-detail-note">Private identifying details are kept confidential. Include details only you would know in your claim.</p>
      {report.status === 'OPEN' ? <Link className="button" to={`/found-items/${report.id}/claim`}>Submit a claim</Link> : <p className="claim-state">This item is no longer accepting claims.</p>}
    </article>}
  </section>;
}
