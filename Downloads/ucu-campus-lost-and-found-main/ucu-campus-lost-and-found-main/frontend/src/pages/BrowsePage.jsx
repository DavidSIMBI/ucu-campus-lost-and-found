import { useMemo, useState } from 'react';
import ItemCard from '../components/ItemCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { sampleItems } from '../data/sampleItems.js';

export default function BrowsePage() {
  // We combine query into the filters object so SearchBar can read it as filters.keyword
  const [filters, setFilters] = useState({ 
    keyword: '', 
    report_type: 'ALL', 
    category: 'ALL', 
    location: 'ALL', 
    event_date: '' 
  });

  const updateFilter = (name, value) => setFilters((current) => ({ ...current, [name]: value }));

  const results = useMemo(() => sampleItems.filter((item) => {
    const searchString = `${item.title} ${item.location} ${item.category}`.toLowerCase();
    const matchesKeyword = searchString.includes(filters.keyword.trim().toLowerCase());
    
    return matchesKeyword && 
      (filters.report_type === 'ALL' || item.report_type === filters.report_type) && 
      (filters.category === 'ALL' || item.category === filters.category) && 
      (filters.location === 'ALL' || item.location === filters.location) && 
      (!filters.event_date || item.event_date === filters.event_date);
  }), [filters]);

  return (
    <section className="browse-page section-shell">
      <p className="section-label">UCU community listings</p>
      <h1>Browse items</h1>
      <p className="page-intro">Search and filter these fictional examples. Live listings are not connected yet.</p>
      
      {/* Notice we removed `value={query}` and `onChange` because they are inside `filters` now */}
      <SearchBar filters={filters} onFilterChange={updateFilter} />
      
      <p className="sample-note">Demonstration content only; no records are loaded from the database.</p>
      
      {results.length ? (
        <div className="item-grid">
          {results.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      ) : (
        <p className="empty-state">No items match your search criteria.</p>
      )}
    </section>
  );
}