import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <p><strong>UCU Lost &amp; Found</strong><br />A helping hand for things left behind.</p>
        <div className="footer-links"><Link to="/items">Browse items</Link><Link to="/login">Log in</Link></div>
        <small>Uganda Christian University · Student project foundation</small>
      </div>
    </footer>
  );
}
