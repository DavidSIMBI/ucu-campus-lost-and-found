export default function SearchBar({ filters = {}, onFilterChange = () => {} }) {
  return (
    <div className="browse-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
      
      {/* Keyword Search */}
      <label className="search-box" style={{ flex: '1 1 100%' }}>
        
        <span className="visually-hidden">Search items</span>
        <input 
          type="text" 
          value={filters.keyword || ''} 
          onChange={(event) => onFilterChange('keyword', event.target.value)} 
          placeholder="Search by title, location, category..." 
          style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        />
      </label>

      {/* Type Filter */}
      <label className="filter-control">
        <span>Type</span>
        <select 
          value={filters.report_type || 'ALL'} 
          onChange={(event) => onFilterChange('report_type', event.target.value)}
          style={{ padding: '8px', marginLeft: '5px', borderRadius: '5px' }}
        >
          <option value="ALL">All Types</option>
          <option value="LOST">Lost</option>
          <option value="FOUND">Found</option>
        </select>
      </label>

      {/* Category Filter */}
      <label className="filter-control">
        <span>Category</span>
        <select 
          value={filters.category || 'ALL'} 
          onChange={(event) => onFilterChange('category', event.target.value)}
          style={{ padding: '8px', marginLeft: '5px', borderRadius: '5px' }}
        >
          <option value="ALL">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Keys">Keys</option>
          <option value="Books">Books</option>
          <option value="Clothing">Clothing</option>
          <option value="Other">Other</option>
        </select>
      </label>

      {/* Location Filter */}
      <label className="filter-control">
        <span>Location</span>
        <select 
          value={filters.location || 'ALL'} 
          onChange={(event) => onFilterChange('location', event.target.value)}
          style={{ padding: '8px', marginLeft: '5px', borderRadius: '5px' }}
        >
          <option value="ALL">All Locations</option>
          <option value="N5B">N5B</option>
          <option value="Hamu Mukasa Library">Hamu Mukasa Library</option>
          <option value="Touch of Class Restaurant">Touch of Class Restaurant</option>
          <option value="Premium Hostel">Premium Hostel</option>
        </select>
      </label>

      {/* Date Filter */}
      <label className="filter-control">
        <span>Date</span>
        <input 
          type="date" 
          value={filters.event_date || ''} 
          onChange={(event) => onFilterChange('event_date', event.target.value)}
          style={{ padding: '8px', marginLeft: '5px', borderRadius: '5px' }}
        />
      </label>
      
    </div>
  );
}