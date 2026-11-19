import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ItemCard from '../components/ItemCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import { sampleItems } from '../data/sampleItems.js';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => sampleItems.filter((item) => `${item.title} ${item.location} ${item.category}`.toLowerCase().includes(query.toLowerCase())), [query]);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <p className="hero-kicker"><span className="kicker-dot" /> For the UCU community</p>
            <h1>Good things find their way <em>back.</em></h1>
            <p className="hero-description">A shared place to report what you’ve lost, return what you’ve found, and help campus feel a little more connected.</p>
            <div className="hero-actions"><Link className="button button-gold" to="/items">Browse items <span aria-hidden="true">↗</span></Link><Link className="text-link" to="/register">Join the community</Link></div>
          </div>
          <figure className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85"
              alt="University students studying together"
              onError={(event) => { event.currentTarget.hidden = true; }}
            />
            <figcaption><span>UCU COMMUNITY</span><strong>Good people help good things find their way home.</strong></figcaption>
          </figure>
        </div>
        <div className="hero-bottom"><span>Find something. Leave something.</span><span>Scroll to explore ↓</span></div>
      </section>

      <section className="actions-section section-shell" aria-labelledby="actions-title">
        <div className="section-heading"><div><p className="section-label">A small act makes a difference</p><h2 id="actions-title">What brings you here?</h2></div><p>Whether it’s yours or someone else’s,<br />we’ll help you take the next step.</p></div>
        <div className="action-grid">
          <Link to="/login" className="action-card lost-action"><span className="action-symbol" aria-hidden="true">⌕</span><span className="action-text"><strong>I lost something</strong><small>Search reports and let us know what’s missing.</small></span><span className="action-arrow" aria-hidden="true">↗</span></Link>
          <Link to="/login" className="action-card found-action"><span className="action-symbol" aria-hidden="true">＋</span><span className="action-text"><strong>I found something</strong><small>Share a few details so it can find its owner.</small></span><span className="action-arrow" aria-hidden="true">↗</span></Link>
        </div>
      </section>

      <section className="listings-section">
        <div className="section-shell">
          <div className="listings-heading"><div><p className="section-label">A few things to start with</p><h2>Recently reported</h2></div><Link to="/items" className="text-link">See all items <span aria-hidden="true">↗</span></Link></div>
          <SearchBar value={query} onChange={setQuery} />
          <p className="sample-note"><span aria-hidden="true">ⓘ</span> Sample listings for demonstration. These are fictional and are not database records.</p>
          {matches.length > 0 ? <div className="item-grid">{matches.map((item) => <ItemCard key={item.id} item={item} />)}</div> : <p className="empty-state">No sample items match “{query}”. Try another search.</p>}
        </div>
      </section>
    </>
  );
}
