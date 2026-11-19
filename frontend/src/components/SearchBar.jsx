export default function SearchBar({ value, onChange, filters, onFilterChange = () => {} }) {
  const keyword = value ?? filters?.keyword ?? '';
  const updateKeyword = (nextValue) => {
    if (onChange) onChange(nextValue);
    else onFilterChange('keyword', nextValue);
  };

  return (
    <div className={filters ? 'browse-filters' : 'browse-filters browse-filters-keyword-only'}>
      <label className="search-box">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <span className="visually-hidden">Search items</span>
        <input value={keyword} onChange={(event) => updateKeyword(event.target.value)} placeholder="Search title, description, category, or location" />
      </label>
      {filters && <>
        <label className="filter-control">
          <span>Type</span>
          <select value={filters.report_type ?? 'ALL'} onChange={(event) => onFilterChange('report_type', event.target.value)}>
            <option value="ALL">All Types</option><option value="LOST">Lost</option><option value="FOUND">Found</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Category</span>
          <select value={filters.category ?? 'ALL'} onChange={(event) => onFilterChange('category', event.target.value)}>
            <option value="ALL">All Categories</option><option>Keys</option><option>Electronics</option><option>Books</option><option>Clothing</option><option>Other</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Location</span>
          <select value={filters.location ?? 'ALL'} onChange={(event) => onFilterChange('location', event.target.value)}>
            <option value="ALL">All Locations</option><option>N5B</option><option>Hamu Mukasa Library</option><option>Touch of Class Restaurant</option><option>Premium Hostel</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Status</span>
          <select value={filters.status ?? 'ALL'} onChange={(event) => onFilterChange('status', event.target.value)}>
            <option value="ALL">All Statuses</option><option value="OPEN">Open</option><option value="RETURNED">Returned</option><option value="CLOSED">Closed</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Date</span>
          <input type="date" value={filters.event_date ?? ''} onChange={(event) => onFilterChange('event_date', event.target.value)} />
        </label>
      </>}
    </div>
  );
}
