import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ClaimStatusBadge from '../components/ClaimStatusBadge.jsx';
import { ClaimError, ClaimLoading } from '../components/ClaimState.jsx';
import { getFoundItems } from '../services/foundItemsService.js';
import { getReportPhotoUrl } from '../services/reportPhoto.js';

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const datePart = String(value).slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return 'Date unavailable';

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(date);
}

function FoundItemPhoto({ item }) {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = getReportPhotoUrl(item.photo_path);

  useEffect(() => {
    setImageFailed(false);
  }, [item.photo_path]);

  if (!item.photo_path || !photoUrl || imageFailed) {
    return <div className="found-item-photo-fallback" role="img" aria-label={item.photo_path ? 'Item photo unavailable' : 'No item photo provided'}>
      <span>{item.photo_path ? 'Photo unavailable' : 'No photo provided'}</span>
    </div>;
  }

  return <img
    className="found-item-photo"
    src={photoUrl}
    alt={`Found item: ${item.title}`}
    loading="lazy"
    decoding="async"
    onError={() => setImageFailed(true)}
  />;
}

function FoundItemCard({ item }) {
  return <article className="found-item-card">
    <FoundItemPhoto item={item} />
    <div className="found-item-body">
      <div className="found-item-card-topline">
        <span className="found-item-category">{item.category || 'Category not listed'}</span>
        <ClaimStatusBadge status={item.status} />
      </div>
      <h2>{item.title}</h2>
      {item.description && <p className="found-item-description">{item.description}</p>}
      <dl className="found-item-facts">
        <div><dt>Location found</dt><dd>{item.location || 'Not listed'}</dd></div>
        <div><dt>Date found</dt><dd>{formatDate(item.event_date)}</dd></div>
        <div><dt>Reported</dt><dd>{formatDate(item.created_at)}</dd></div>
      </dl>
      <div className="found-item-actions">
        <Link className="button button-small" to={`/found-items/${item.id}`}>View item details</Link>
      </div>
    </div>
  </article>;
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
  const hasActiveFilters = Boolean(search.trim()) || category !== 'ALL';

  return (
    <section className="module-page section-shell found-items-page">
      <header className="module-heading found-items-heading">
        <div>
          <p className="section-label">Campus lost and found</p>
          <h1>Found items</h1>
          <p className="page-intro">Browse open items reported on campus. If you recognize an item, review its details to submit a claim.</p>
        </div>
      </header>

      <div className="module-filters found-items-filters" role="search" aria-label="Search found items">
        <label className="module-search found-items-search">Search items
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title, category or location" aria-label="Search by title, category or location" />
        </label>
        <label className="found-items-category">Category
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="ALL">All categories</option>
            {categories.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        {hasActiveFilters && <button className="found-items-clear" type="button" onClick={() => { setSearch(''); setCategory('ALL'); }}>Clear filters</button>}
      </div>

      {loading && <ClaimLoading>Loading found items…</ClaimLoading>}
      {!loading && error && <ClaimError message={error} onRetry={() => setRetry((value) => value + 1)} />}
      {!loading && !error && <div className="found-items-results" aria-live="polite">
        {visibleReports.length > 0 && <p className="found-items-result-count">{visibleReports.length} {visibleReports.length === 1 ? 'open item' : 'open items'}</p>}
        {visibleReports.length > 0
          ? <div className="found-item-grid">{visibleReports.map((item) => <FoundItemCard item={item} key={item.id} />)}</div>
          : <div className="module-empty found-items-empty">
            <h2>{hasActiveFilters ? 'No matching items' : 'No open found items'}</h2>
            <p>{hasActiveFilters ? 'Try another search or category, or clear the filters to see all open found items.' : 'There are no open found items to browse right now. Check again later.'}</p>
            {hasActiveFilters && <button className="button button-small" type="button" onClick={() => { setSearch(''); setCategory('ALL'); }}>Clear filters</button>}
          </div>}
      </div>}
    </section>
  );
}
