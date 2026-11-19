import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { getFoundItems } from '../services/foundItemsService.js';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

export default function FoundItemsPage() {
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getFoundItems({ search, signal: controller.signal })
      .then((items) => setReports(items.filter((item) => item.status === 'OPEN')))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.response?.data?.message || 'Unable to load found items.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, retry]);

  const categories = useMemo(() => [...new Set(reports.map((item) => item.category).filter(Boolean))].sort(), [reports]);
  const visibleReports = category === 'ALL' ? reports : reports.filter((item) => item.category === category);

  return (
    <section className="module-page section-shell">
      <header className="module-heading"><div><p className="section-label">Live campus listings</p><h1>Found items</h1>
        <p className="page-intro">Search current open found reports and submit a claim if you recognize an item.</p></div></header>
      <div className="module-filters">
        <label className="module-search">Search items<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by title, category, or location" /></label>
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">All categories</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      {loading && <ClaimLoading>Loading found items…</ClaimLoading>}
      {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}
      {!loading && !error && (visibleReports.length ? <div className="found-item-grid">
        {visibleReports.map((item) => <article className="found-item-card" key={item.id}>
          <div className="found-item-art" aria-hidden="true"><span>＋</span></div>
          <div className="found-item-body"><div className="found-item-meta"><span>{item.category}</span><span className="claim-status claim-status-open">Open</span></div>
            <h2>{item.title}</h2><p>{item.description}</p>
            <dl><div><dt>Location</dt><dd>{item.location}</dd></div><div><dt>Found</dt><dd>{formatDate(item.event_date)}</dd></div></dl>
            <Link className="button button-small" to={`/found-items/${item.id}`}>View item</Link>
          </div>
        </article>)}
      </div> : <div className="module-empty"><h2>No open found items</h2><p>Try a different search or check again later.</p></div>)}
    </section>
  );
}
