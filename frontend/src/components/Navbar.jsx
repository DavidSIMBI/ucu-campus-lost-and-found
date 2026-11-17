import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  useEffect(() => {
    const syncUser = () => {
      try { setUser(JSON.parse(localStorage.getItem('user') || 'null')); } catch { setUser(null); }
    };
    window.addEventListener('auth-change', syncUser);
    return () => window.removeEventListener('auth-change', syncUser);
  }, []);
  const signOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.dispatchEvent(new Event('auth-change'));
  };

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
          {user ? <>
            <span className="account-name">{user.fullName}</span>
            <button className="login-link sign-out" type="button" onClick={signOut}>Log out</button>
          </> : <>
            <NavLink className="login-link" to="/login">Log in</NavLink>
            <NavLink className="button button-small" to="/register">Create account</NavLink>
          </>}
        </div>
      </nav>
    </header>
  );
}
