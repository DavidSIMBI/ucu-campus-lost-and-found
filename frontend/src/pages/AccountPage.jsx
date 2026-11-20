import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
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
const emptySummary = { myReports: 0, myClaims: 0, foundItems: 0 };

function getInitials(name) {
  return String(name || 'Account holder')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function fieldValue(value) {
  return value || 'Not added yet';
}

export default function AccountPage() {
  const { user, updateProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [profile, setProfile] = useState(user);
  const [summary, setSummary] = useState(emptySummary);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const [draft, setDraft] = useState({ fullName: '', phone: '', studentId: '', course: '', profilePhotoUrl: '' });

  useEffect(() => {
    const controller = new AbortController();
    setLoadingProfile(true);
    setProfileError('');
    Promise.allSettled([
      api.get('/auth/me', { signal: controller.signal }),
      api.get('/auth/summary', { signal: controller.signal })
    ]).then(([profileResult, summaryResult]) => {
      if (controller.signal.aborted) return;
      if (profileResult.status === 'fulfilled') {
        const nextProfile = profileResult.value.data?.user || user;
        setProfile(nextProfile);
        setDraft({
          fullName: nextProfile?.fullName || '',
          phone: nextProfile?.phone || '',
          studentId: nextProfile?.studentId || '',
          course: nextProfile?.course || '',
          profilePhotoUrl: nextProfile?.profilePhotoUrl || ''
        });
      } else {
        setProfileError(profileResult.reason.response?.data?.message || 'Unable to load profile details.');
      }
      if (summaryResult.status === 'fulfilled') {
        setSummary({ ...emptySummary, ...summaryResult.value.data?.summary });
      }
      setLoadingProfile(false);
    });
    return () => controller.abort();
  }, [user]);

  const isAdmin = user?.role === 'ADMIN';
  const sections = isAdmin ? adminSections : studentSections;
  const requestedSection = searchParams.get('section');
  const activeSection = sections.some(({ id }) => id === requestedSection)
    ? requestedSection
    : 'personal';

  useEffect(() => {
    if (requestedSection !== activeSection) setSearchParams({ section: activeSection }, { replace: true });
  }, [activeSection, requestedSection, setSearchParams]);

  const name = profile?.fullName || user?.fullName || 'Account holder';
  const content = {
    personal: <section className="account-personal-panel" aria-labelledby="account-personal-title">
      <div className="account-panel-heading">
        <div><p className="section-label">Your profile</p><h2 id="account-personal-title">Personal information</h2></div>
        <button className="button button-small account-edit-trigger" type="button" onClick={() => { setSaveError(''); setSaveMessage(''); setIsEditing(true); }}>Edit profile</button>
      </div>
      {profileError && <p className="module-feedback module-feedback-error" role="alert">{profileError}</p>}
      {saveMessage && <p className="module-feedback module-feedback-success" role="status">{saveMessage}</p>}
      <dl className="account-personal-fields">
        <div><dt>Full name</dt><dd>{name}</dd></div>
        <div><dt>Email address</dt><dd>{profile?.email || user?.email || 'Not added yet'}</dd></div>
        <div><dt>Phone</dt><dd>{fieldValue(profile?.phone)}</dd></div>
        <div><dt>Student ID</dt><dd>{fieldValue(profile?.studentId)}</dd></div>
        <div><dt>Course</dt><dd>{fieldValue(profile?.course)}</dd></div>
        <div><dt>Account type</dt><dd>{isAdmin ? 'Administrator' : 'Student'}</dd></div>
      </dl>
      {!loadingProfile && <p className="account-profile-note">Keep your contact details up to date so the campus team can reach you about an item.</p>}
    </section>,
    overview: <StudentDashboardPage />,
    reports: <MyReportsPage />,
    claims: <MyClaimsPage />,
    activity: <AccountActivityPage />,
    'admin-overview': <AdminDashboardPage embedded />,
    'admin-claims': <AdminClaimsPage embedded />,
    'admin-users': <AdminUsersPage embedded />
  }[activeSection];

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveMessage('');
    try {
      const result = await updateProfile(draft);
      setProfile(result.user);
      setIsEditing(false);
      setPhotoFailed(false);
      setSaveMessage('Your profile has been updated.');
    } catch (error) {
      setSaveError(error.response?.data?.message || 'Unable to update your profile.');
    } finally {
      setSaving(false);
    }
  }

  return <section className="account-page section-shell">
    <header className="account-welcome">
      <div><p className="section-label">{isAdmin ? 'Administrator account' : 'Student account'}</p><h1>My Account</h1><p className="page-intro">Welcome, {name}. View your profile, reports, and campus activity.</p></div>
      <Link className="button button-small" to={isAdmin ? '/admin/claims' : '/report'}>{isAdmin ? 'Review claims' : 'Create a report'}</Link>
    </header>

    {!isAdmin && <section className="account-summary-grid" aria-label="Your account totals">
      <article className="account-summary-card"><span>My reports</span><strong>{summary.myReports}</strong><Link to="/account?section=reports">View reports <span aria-hidden="true">↗</span></Link></article>
      <article className="account-summary-card account-summary-gold"><span>My claims</span><strong>{summary.myClaims}</strong><Link to="/account?section=claims">View claims <span aria-hidden="true">↗</span></Link></article>
      <article className="account-summary-card account-summary-blue"><span>Found items</span><strong>{summary.foundItems}</strong><Link to="/found-items">View found items <span aria-hidden="true">↗</span></Link></article>
    </section>}

    <div className="account-workspace">
      <aside className="account-sidebar" aria-label="Account navigation">
        <section className="account-profile-card" aria-label="Profile summary">
          <div className={`account-avatar${photoFailed ? ' account-avatar-fallback' : ''}`}>
            {profile?.profilePhotoUrl && !photoFailed && <img src={profile.profilePhotoUrl} alt="" onError={() => setPhotoFailed(true)} />}
            <span aria-hidden="true">{getInitials(name)}</span>
          </div>
          <strong>{name}</strong><span className="account-profile-email">{profile?.email || user?.email}</span>
          <span className="account-role-pill">{isAdmin ? 'Administrator' : 'Student account'}</span>
          <button className="account-profile-edit" type="button" onClick={() => { setSaveError(''); setSaveMessage(''); setIsEditing(true); }}>Edit profile</button>
        </section>
        <nav className="account-section-nav" aria-label="Account sections">
          {sections.map(({ id, label }) => <button key={id} type="button" className={`account-section-tab${activeSection === id ? ' active' : ''}`} aria-current={activeSection === id ? 'page' : undefined} onClick={() => setSearchParams({ section: id })}>{label}</button>)}
        </nav>
      </aside>
      <main className={`account-section-content${isAdmin ? ' account-section-content-admin' : ''}`}>
        {content}
      </main>
    </div>

    {isEditing && <div className="account-edit-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setIsEditing(false); }}>
      <section className="account-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="account-edit-title">
        <header><div><p className="section-label">Account settings</p><h2 id="account-edit-title">Edit profile</h2></div><button className="account-edit-close" type="button" aria-label="Close edit profile" onClick={() => setIsEditing(false)}>×</button></header>
        {saveError && <p className="module-feedback module-feedback-error" role="alert">{saveError}</p>}
        <form className="account-edit-form" onSubmit={handleProfileSubmit}>
          <label>Full name<input required minLength="2" maxLength="120" value={draft.fullName} onChange={(event) => setDraft({ ...draft, fullName: event.target.value })} autoComplete="name" /></label>
          <label>Phone<input type="tel" maxLength="30" value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} autoComplete="tel" placeholder="e.g. +256 700 000000" /></label>
          <label>Student ID<input maxLength="40" value={draft.studentId} onChange={(event) => setDraft({ ...draft, studentId: event.target.value })} /></label>
          <label>Course<input maxLength="120" value={draft.course} onChange={(event) => setDraft({ ...draft, course: event.target.value })} placeholder="e.g. Bachelor of Science in Computer Science" /></label>
          <label className="account-edit-wide">Profile photo URL<input type="url" maxLength="2048" value={draft.profilePhotoUrl} onChange={(event) => setDraft({ ...draft, profilePhotoUrl: event.target.value })} placeholder="https://example.com/photo.jpg" /></label>
          <p className="account-edit-help">Adding contact and course details can help campus staff return an item to you.</p>
          <div className="account-edit-actions"><button className="button button-small account-edit-cancel" type="button" disabled={saving} onClick={() => setIsEditing(false)}>Cancel</button><button className="button button-small" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      </section>
    </div>}
  </section>;
}
