
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">

        <Link className="brand" to="/">
          <span className="brand-mark">U</span>
          <span>UCU <strong>Lost &amp; Found</strong></span>
        </Link>

        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/items">Browse items</NavLink>

          {isAuthenticated && (
            <NavLink to="/account">My Account</NavLink>
          )}

          {isAuthenticated && user?.role === 'STUDENT' && (
            <NavLink to="/my-reports">My Reports</NavLink>
          )}

          {isAdmin && (
            <NavLink to="/admin">Admin Dashboard</NavLink>
          )}
        </div>

        <div className="nav-account">
          {isAuthenticated ? (
            <>
              <span className="login-link">
                {user.fullName}
              </span>

              <button
                className="button button-small"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink className="login-link" to="/login">
                Log in
              </NavLink>

              <NavLink
                className="button button-small"
                to="/register"
              >
                Create account
              </NavLink>
            </>
          )}
        </div>

      </nav>
    </header>
  );
}
