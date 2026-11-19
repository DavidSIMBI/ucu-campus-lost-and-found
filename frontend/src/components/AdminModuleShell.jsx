import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminModuleShell({ title, eyebrow = 'Administration', children }) {
  const { user, logout } = useAuth();
  const name = user?.fullName || user?.email || 'Administrator';
  const initial = name.trim().slice(0, 1).toUpperCase();

  return <section className="admin-dashboard" aria-label="Administration workspace">
    <aside className="admin-sidebar">
      <Link className="admin-sidebar-brand" to="/" aria-label="UCU Lost and Found home"><span className="brand-mark" aria-hidden="true">U</span><span>UCU <strong>Administration</strong></span></Link>
      <p className="admin-sidebar-label">Workspace</p>
      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        <NavLink to="/admin/dashboard" className="admin-sidebar-link"><span className="admin-nav-mark">01</span>Overview</NavLink>
        <NavLink to="/admin/claims" className="admin-sidebar-link"><span className="admin-nav-mark">02</span>Claims</NavLink>
        <NavLink to="/admin/users" className="admin-sidebar-link"><span className="admin-nav-mark">03</span>Users</NavLink>
        <NavLink to="/items" className="admin-sidebar-link"><span className="admin-nav-mark">04</span>Browse items</NavLink>
        <NavLink to="/my-reports" className="admin-sidebar-link"><span className="admin-nav-mark">05</span>My reports</NavLink>
      </nav>
      <div className="admin-sidebar-account"><span className="admin-account-avatar" aria-hidden="true">{initial}</span><span className="admin-account-copy"><strong>{name}</strong><small>Administrator</small></span><button className="admin-sidebar-logout" type="button" onClick={logout}>Log out</button></div>
    </aside>
    <div className="admin-dashboard-main">
      <header className="admin-dashboard-header"><div><p className="admin-eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="admin-header-user"><span className="admin-header-avatar" aria-hidden="true">{initial}</span><span><strong>{name}</strong><small>Administrator</small></span></div></header>
      <div className="admin-dashboard-content">{children}</div>
    </div>
  </section>;
}
