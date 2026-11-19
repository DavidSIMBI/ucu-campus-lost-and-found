import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Footer() {
  const { isAuthenticated } = useAuth();

  return (
    <footer className="site-footer">
      <div className="footer-shell">
        <div className="footer-identity">
          <span className="brand-mark" aria-hidden="true">U</span>
          <span className="footer-identity-copy">
            <strong>UCU Lost &amp; Found</strong>
            <small>Campus listings and reports for lost and found items.</small>
          </span>
        </div>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/items">Browse items</Link>
          <Link to={isAuthenticated ? '/account' : '/login'}>
            {isAuthenticated ? 'My account' : 'Log in'}
          </Link>
        </nav>
        <small className="footer-credit">Uganda Christian University · Student project foundation</small>
      </div>
    </footer>
  );
}
