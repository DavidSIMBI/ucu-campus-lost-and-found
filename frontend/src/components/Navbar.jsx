import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function getInitials(fullName) {
  const nameParts = typeof fullName === 'string'
    ? fullName.trim().split(/\s+/u).filter(Boolean)
    : [];

  if (nameParts.length === 0) return 'U';

  const first = Array.from(nameParts[0])[0] ?? '';
  const last = nameParts.length > 1
    ? Array.from(nameParts[nameParts.length - 1])[0] ?? ''
    : '';

  return `${first}${last}`.toLocaleUpperCase();
}

function getRoleLabel(role) {
  if (role === 'ADMIN') return 'Administrator';
  if (role === 'STUDENT') return 'Student';
  return 'Account';
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const profileTriggerRef = useRef(null);
  const firstMenuItemRef = useRef(null);

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!profileOpen) return undefined;

    function closeWhenClickedOutside(event) {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeWhenClickedOutside);
    return () => document.removeEventListener('pointerdown', closeWhenClickedOutside);
  }, [profileOpen]);

  useEffect(() => {
    if (profileOpen) firstMenuItemRef.current?.focus();
  }, [profileOpen]);

  function handleLogout() {
    setProfileOpen(false);
    logout();
    navigate('/login');
  }

  function handleMenuKeyDown(event) {
    const menuItems = Array.from(
      profileRef.current?.querySelectorAll('[role="menuitem"]') ?? []
    );
    const currentIndex = menuItems.indexOf(document.activeElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      setProfileOpen(false);
      profileTriggerRef.current?.focus();
      return;
    }

    let nextIndex;
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % menuItems.length;
    if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + menuItems.length) % menuItems.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = menuItems.length - 1;

    if (nextIndex !== undefined && menuItems[nextIndex]) {
      event.preventDefault();
      menuItems[nextIndex].focus();
    }
  }

  const fullName = typeof user?.fullName === 'string' && user.fullName.trim()
    ? user.fullName.trim()
    : 'UCU user';
  const roleLabel = getRoleLabel(user?.role);

  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <Link className="brand" to="/">
          <span className="brand-mark" aria-hidden="true">U</span>
          <span>UCU <strong>Lost &amp; Found</strong></span>
        </Link>

        <div className="nav-links">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/items">Browse items</NavLink>
          {isAuthenticated && <NavLink to="/account">My Account</NavLink>}
          {isAuthenticated && user?.role === 'STUDENT' && (
            <NavLink to="/found-items">Found items</NavLink>
          )}
        </div>

        <div className="nav-account">
          {isAuthenticated ? (
            <div
              className="nav-profile"
              ref={profileRef}
            >
              <button
                ref={profileTriggerRef}
                className="profile-trigger"
                type="button"
                aria-label={`Open profile menu for ${fullName}`}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-controls={profileOpen ? 'profile-menu' : undefined}
                onClick={() => setProfileOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && profileOpen) {
                    event.preventDefault();
                    setProfileOpen(false);
                  }
                }}
              >
                <span className="profile-avatar" aria-hidden="true">{getInitials(user?.fullName)}</span>
                <span className="profile-trigger-copy">
                  <span className="profile-trigger-name">{fullName}</span>
                  <span className="profile-trigger-role">{roleLabel}</span>
                </span>
                <span className="profile-trigger-chevron" aria-hidden="true">⌄</span>
              </button>

              {profileOpen && (
                <div className="profile-menu" id="profile-menu" role="menu" aria-label="User account" onKeyDown={handleMenuKeyDown}>
                  <div className="profile-menu-identity">
                    <span className="profile-menu-name">{fullName}</span>
                    <span className="profile-menu-role">{roleLabel}</span>
                  </div>
                  <div className="profile-menu-divider" />
                  <Link
                    ref={firstMenuItemRef}
                    role="menuitem"
                    className="profile-menu-item"
                    to="/account"
                    onClick={() => setProfileOpen(false)}
                  >
                    My Account
                  </Link>
                  <button className="profile-menu-item profile-menu-logout" type="button" role="menuitem" onClick={handleLogout}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <NavLink className="login-link" to="/login">Log in</NavLink>
              <NavLink className="button button-small" to="/register">Create account</NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
