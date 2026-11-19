import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ItemCard from '../components/ItemCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { sampleItems } from '../data/sampleItems.js';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const matches = useMemo(() => sampleItems.filter((item) => `${item.title} ${item.location} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const reportHref = isAuthenticated ? '/report' : '/login';
  const accountHref = isAuthenticated ? '/account' : '/register';

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-eyebrow">UCU CAMPUS / LOST &amp; FOUND</p>
            <h1>Lost something? Found something?</h1>
            <p className="home-hero-description">
              Browse campus listings or submit a report with details that can help identify an item.
            </p>
            <div className="home-hero-actions">
              <Link className="button button-gold" to="/items">Browse items</Link>
              <Link className="home-hero-secondary" to={accountHref}>
                {isAuthenticated ? 'My account' : 'Create an account'}
              </Link>
            </div>
          </div>
        </div>
        <div className="home-hero-footer">
          <span>UCU Campus Lost &amp; Found</span>
          <span>Browse listings · Submit a report</span>
        </div>
      </section>

      <section className="home-actions section-shell" aria-labelledby="actions-title">
        <div className="home-section-heading">
          <div>
            <p className="section-label">Choose an action</p>
            <h2 id="actions-title">Lost or found an item?</h2>
          </div>
          <p>Use the report form to share the details needed to identify an item.</p>
        </div>
        <div className="home-action-grid">
          <Link to={reportHref} className="home-action-card home-action-lost">
            <span className="home-action-copy">
              <span className="home-action-type">LOST ITEM</span>
              <strong>I lost something</strong>
              <small>Submit a lost-item report with its description and last known location.</small>
            </span>
            <span className="home-action-cta">
              {isAuthenticated ? 'Open report form' : 'Sign in to report'}
            </span>
          </Link>
          <Link to={reportHref} className="home-action-card home-action-found">
            <span className="home-action-copy">
              <span className="home-action-type">FOUND ITEM</span>
              <strong>I found something</strong>
              <small>Choose “I found an item” on the form, then add where and when you found it.</small>
            </span>
            <span className="home-action-cta">
              {isAuthenticated ? 'Open report form' : 'Sign in to report'}
            </span>
          </Link>
        </div>
      </section>

      <section className="listings-section home-listings">
        <div className="section-shell">
          <div className="listings-heading">
            <div>
              <p className="section-label">Demonstration listings</p>
              <h2>Recent items</h2>
            </div>
            <Link to="/items" className="text-link">Browse all items</Link>
          </div>
          <SearchBar value={query} onChange={setQuery} />
          <p className="sample-note">These fictional examples are for demonstration and are not live database records.</p>
          {matches.length > 0 ? (
            <div className="item-grid">
              {matches.map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          ) : (
            <p className="empty-state">No sample items match “{query}”. Try another search.</p>
          )}
        </div>
      </section>
    </>
  );
}
