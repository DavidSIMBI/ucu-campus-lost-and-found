import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import StudentDashboardPage from './StudentDashboardPage.jsx';
import MyReportsPage from './MyReportsPage.jsx';
import MyClaimsPage from './MyClaimsPage.jsx';
import AccountActivityPage from './AccountActivityPage.jsx';
import AdminDashboardPage from './AdminDashboardPage.jsx';
import AdminClaimsPage from './AdminClaimsPage.jsx';
import AdminUsersPage from './AdminUsersPage.jsx';

const studentSections = [
  { id: 'personal', label: 'Personal information' },
  { id: 'overview', label: 'Overview' },
  { id: 'reports', label: 'My reports' },
  { id: 'claims', label: 'My claims' },
  { id: 'activity', label: 'Recent activity' }
];
const adminSections = [
  { id: 'personal', label: 'Personal information' },
  { id: 'admin-overview', label: 'Admin overview' },
  { id: 'admin-claims', label: 'Claims management' },
  { id: 'admin-users', label: 'Users management' }
];

export default function AccountPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'ADMIN';
  const sections = isAdmin ? adminSections : studentSections;
  const requestedSection = searchParams.get('section');
  const activeSection = sections.some(({ id }) => id === requestedSection)
    ? requestedSection
    : 'personal';

  useEffect(() => {
    if (requestedSection !== activeSection) setSearchParams({ section: activeSection }, { replace: true });
  }, [activeSection, requestedSection, setSearchParams]);

  const name = user?.fullName || 'Account holder';
  const content = {
    personal: <section className="account-personal-panel" aria-labelledby="account-personal-title">
      <p className="section-label">Your profile</p><h2 id="account-personal-title">Personal information</h2>
      <dl className="account-personal-fields">
        <div><dt>Full name</dt><dd>{user?.fullName || '—'}</dd></div>
        <div><dt>Email address</dt><dd>{user?.email || '—'}</dd></div>
        <div><dt>Account type</dt><dd>{isAdmin ? 'Administrator' : 'Student'}</dd></div>
      </dl>
      <p className="account-profile-note">Your profile details come from your authenticated account.</p>
    </section>,
    overview: <StudentDashboardPage />,
    reports: <MyReportsPage />,
    claims: <MyClaimsPage />,
    activity: <AccountActivityPage />,
    'admin-overview': <AdminDashboardPage embedded />,
    'admin-claims': <AdminClaimsPage embedded />,
    'admin-users': <AdminUsersPage embedded />
  }[activeSection];

  return <section className="account-page section-shell">
    <header className="account-welcome">
      <div><p className="section-label">{isAdmin ? 'Administrator account' : 'Student account'}</p><h1>My Account</h1><p className="page-intro">Welcome, {name}. Your personal information and {isAdmin ? 'administration workspace' : 'campus activity'} are together here.</p></div>
      <Link className="button button-small" to={isAdmin ? '/admin/claims' : '/report'}>{isAdmin ? 'Review claims' : 'Create a report'}</Link>
    </header>
    <nav className="account-section-nav" aria-label="Account sections">
      {sections.map(({ id, label }) => <button key={id} type="button" className={`account-section-tab${activeSection === id ? ' active' : ''}`} aria-current={activeSection === id ? 'page' : undefined} onClick={() => setSearchParams({ section: id })}>{label}</button>)}
    </nav>
    <div className={`account-section-content${isAdmin ? ' account-section-content-admin' : ''}`}>
      {content}
    </div>
  </section>;
}
