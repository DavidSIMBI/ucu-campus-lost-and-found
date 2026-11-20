import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ItemCard from '../components/ItemCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { sampleItems } from '../data/sampleItems.js';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const recentItemsRef = useRef(null);
  const matches = useMemo(() => sampleItems.filter((item) => `${item.title} ${item.description ?? ''} ${item.location} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  const reportHref = (type) => isAuthenticated ? `/report?type=${type}` : '/login';
  const loginReturnToReport = (type) => isAuthenticated ? undefined : { from: { pathname: '/report', search: `?type=${type}` } };
  const accountHref = isAuthenticated ? '/account' : '/register';
  const returnedCount = sampleItems.filter((item) => item.status === 'RETURNED').length;
  const stillLostCount = sampleItems.filter((item) => item.report_type === 'LOST' && item.status === 'OPEN').length;

  function handleSearch(event) {
    event.preventDefault();
    recentItemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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
            <form className="home-search" role="search" onSubmit={handleSearch}>
              <label className="home-search-field">
                <span className="home-search-icon" aria-hidden="true">⌕</span>
                <span className="visually-hidden">Search reported items</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID, phone, wallet, keys…" />
              </label>
              <button className="home-search-button" type="submit">Search</button>
            </form>
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
          <article className="home-action-card home-action-lost">
            <span className="home-action-icon home-action-icon-lost" aria-hidden="true">!</span>
            <span className="home-action-copy">
              <span className="home-action-type">LOST ITEM</span>
              <strong>I lost something</strong>
              <small>Tell the campus where and when you last saw it.</small>
            </span>
            <Link to={reportHref('LOST')} state={loginReturnToReport('LOST')} className="home-action-cta home-action-cta-lost">{isAuthenticated ? 'Report lost item' : 'Sign in to report'} <span aria-hidden="true">↗</span></Link>
          </article>
          <article className="home-action-card home-action-found">
            <span className="home-action-icon home-action-icon-found" aria-hidden="true">✓</span>
            <span className="home-action-copy">
              <span className="home-action-type">FOUND ITEM</span>
              <strong>I found something</strong>
              <small>Share where it was found so it can reach its owner.</small>
            </span>
            <Link to={reportHref('FOUND')} state={loginReturnToReport('FOUND')} className="home-action-cta home-action-cta-found">{isAuthenticated ? 'Report found item' : 'Sign in to report'} <span aria-hidden="true">↗</span></Link>
          </article>
        </div>
      </section>

      <section className="listings-section home-listings" id="recently-reported" ref={recentItemsRef}>
        <div className="section-shell">
          <div className="listings-heading">
            <div>
              <p className="section-label">DEMO STATISTICS</p>
              <h2>Recently reported</h2>
            </div>
            <Link to="/items" className="text-link">Browse all items</Link>
          </div>
          <div className="home-demo-stats" aria-label="Sample listing statistics">
            <span><strong>{sampleItems.length}</strong> Items reported</span>
            <span><strong>{returnedCount}</strong> Returned</span>
            <span><strong>{stillLostCount}</strong> Still lost</span>
          </div>
          {matches.length > 0 ? (
            <div className="item-grid">
              {matches.slice(0, 3).map((item) => <ItemCard key={item.id} item={item} />)}
            </div>
          ) : (
            <p className="empty-state">No sample items match “{query}”. Try another search.</p>
          )}
        </div>
      </section>
    </>
  );
}
