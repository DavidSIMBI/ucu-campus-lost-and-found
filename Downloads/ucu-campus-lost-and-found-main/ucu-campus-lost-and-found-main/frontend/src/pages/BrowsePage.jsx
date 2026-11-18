import { useMemo, useState } from 'react';
import ItemCard from '../components/ItemCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { sampleItems } from '../data/sampleItems.js';

export default function BrowsePage() {
  const [query, setQuery] = useState('');
  const results = useMemo(() => sampleItems.filter((item) => `${item.title} ${item.location} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <section className="browse-page section-shell"><p className="section-label">UCU community listings</p><h1>Browse items</h1><p className="page-intro">Search the fictional examples below. Live listings will be connected after the API is built.</p><SearchBar value={query} onChange={setQuery} /><p className="sample-note"><span aria-hidden="true">ⓘ</span> Demonstration content only; no records are loaded from the database.</p>{results.length ? <div className="item-grid">{results.map((item) => <ItemCard key={item.id} item={item} />)}</div> : <p className="empty-state">No sample items match “{query}”.</p>}</section>;
}
