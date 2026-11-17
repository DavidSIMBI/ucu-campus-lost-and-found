import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <Link className="brand" to="/" aria-label="UCU Lost and Found home">
          <span className="brand-mark" aria-hidden="true">U</span>
          <span>UCU <strong>Lost &amp; Found</strong></span>
        </Link>
        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/items">Browse items</NavLink>
        </div>
        <div className="nav-account">
          <NavLink className="login-link" to="/login">Log in</NavLink>
          <NavLink className="button button-small" to="/register">Create account</NavLink>
        </div>
      </nav>
    </header>
  );
}
