import { useMemo, useState } from 'react';
import ItemCard from '../components/ItemCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { sampleItems } from '../data/sampleItems.js';

const initialFilters = {
  keyword: '',
  report_type: 'ALL',
  category: 'ALL',
  location: 'ALL',
  status: 'ALL',
  event_date: '',
};

export default function BrowsePage() {
  const [filters, setFilters] = useState(initialFilters);
  const [sortBy, setSortBy] = useState('newest');
  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));
  const clearFilters = () => setFilters(initialFilters);

  const results = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const filteredItems = sampleItems.filter((item) => {
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
      if (sortBy === 'title') return left.title.localeCompare(right.title);
      return right.event_date.localeCompare(left.event_date);
    });
  }, [filters, sortBy]);

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => key === 'keyword'
    ? value.trim().length > 0
    : key === 'event_date' ? Boolean(value) : value !== 'ALL').length;

  return (
    <section className="browse-page section-shell">
      <p className="section-label">UCU community listings</p>
      <h1>Browse items</h1>
      <p className="page-intro">Search campus listings by keyword, type, location, date, or status.</p>
      <SearchBar filters={filters} onFilterChange={updateFilter} />
      <p className="sample-note"><span aria-hidden="true">ⓘ</span> Sample listings are fictional demonstrations; no database records are loaded.</p>

      <div className="browse-results-toolbar">
        <p className="browse-result-count" aria-live="polite">Showing <strong>{results.length}</strong> of {sampleItems.length} listings</p>
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
    </section>
  );
}
