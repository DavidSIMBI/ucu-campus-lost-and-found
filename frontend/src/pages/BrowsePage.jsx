import { useEffect, useMemo, useState } from 'react';
import ItemCard from '../components/ItemCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { api } from '../services/api.js';

const initialFilters = {
  keyword: '',
  report_type: 'ALL',
  category: 'ALL',
  location: 'ALL',
  status: 'ALL',
  event_date: '',
};

export default function BrowsePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    api.get('/reports/public', { signal: controller.signal })
      .then((response) => {
        if (!Array.isArray(response.data?.reports)) {
          throw new Error('The public listings response was not in the expected format.');
        }

        if (active) {
          setItems(response.data.reports.map((report) => ({
            ...report,
            event_date: String(report.event_date ?? '').slice(0, 10)
          })));
        }
      })
      .catch((requestError) => {
        if (active && !controller.signal.aborted) {
          setError(
            requestError.response?.data?.message ||
            requestError.message ||
            'We could not load public listings. Please refresh the page to try again.'
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
  const clearFilters = () => setFilters({ ...initialFilters });

  const filterOptions = useMemo(() => ({
    categories: [...new Set(items.map((item) => item.category).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })),
    locations: [...new Set(items.map((item) => item.location).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' })),
    statuses: [...new Set(items.map((item) => item.status).filter(Boolean))]
      .sort()
  }), [items]);

  const results = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const filteredItems = items.filter((item) => {
      const searchableText = `${item.title} ${item.description ?? ''} ${item.location} ${item.category}`.toLowerCase();
      return searchableText.includes(keyword)
        && (filters.report_type === 'ALL' || item.report_type === filters.report_type)
        && (filters.category === 'ALL' || item.category === filters.category)
        && (filters.location === 'ALL' || item.location === filters.location)
        && (filters.status === 'ALL' || item.status === filters.status)
        && (!filters.event_date || item.event_date === filters.event_date);
    });

    return filteredItems.sort((left, right) => {
      if (sortBy === 'oldest') return left.event_date.localeCompare(right.event_date);
      if (sortBy === 'title') return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' });
      return right.event_date.localeCompare(left.event_date);
    });
  }, [filters, items, sortBy]);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key === 'keyword'
    ? value.trim().length > 0
    : key === 'event_date' ? Boolean(value) : value !== 'ALL').length;

  return (
    <section className="browse-page section-shell">
      <p className="section-label">UCU community listings</p>
      <h1>Browse items</h1>
      <p className="page-intro">Search campus listings by keyword, type, category, location, date, and status.</p>

      <SearchBar
        filters={filters}
        onFilterChange={updateFilter}
        categories={filterOptions.categories}
        locations={filterOptions.locations}
        statuses={filterOptions.statuses}
      />
      <p className="sample-note"><span aria-hidden="true">ⓘ</span> Public lost and found reports are shown here. Closed reports are not listed.</p>

      {loading ? (
        <div className="browse-state" role="status"><span className="loading-indicator" aria-hidden="true" />Loading listings…</div>
      ) : error ? (
        <div className="browse-state browse-state-error" role="alert">
          <strong>Listings could not be loaded</strong>
          <p>{error}</p>
          <button className="button button-small" type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      ) : items.length === 0 ? (
        <div className="browse-state">There are no listings to show yet.</div>
      ) : (
        <>
          <div className="browse-results-toolbar">
            <p className="browse-result-count" aria-live="polite">Showing <strong>{results.length}</strong> of {items.length} listings</p>
            <div className="browse-result-actions">
              <label className="sort-control">Sort by
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title A–Z</option>
                </select>
              </label>
              <button className="clear-filters-button" type="button" onClick={clearFilters} disabled={activeFilterCount === 0}>
                Clear filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </button>
            </div>
          </div>

          {results.length ? (
            <div className="item-grid">
              {results.map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No items match your search criteria.</strong>
              <p>Try changing a filter or clearing them to see all listings.</p>
              <button className="button button-small" type="button" onClick={clearFilters}>Show all items</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
