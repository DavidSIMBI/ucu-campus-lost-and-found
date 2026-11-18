
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import BrowsePage from './pages/BrowsePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import MyReportsPage from './pages/MyReportsPage.jsx';
import EditReportPage from './pages/EditReportPage.jsx';

import { useAuth } from './context/AuthContext.jsx';

// Protect pages that require login
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return children;
}

// Protect administrator-only pages
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Student account page
function AccountPage() {
  const { user, logout } = useAuth();

  return (
    <section className="browse-page section-shell">
      <p className="section-label">My account</p>
      <h1>Welcome, {user.fullName}</h1>

      <p className="page-intro">
        You are logged in as {user.role}.
      </p>

      <button className="button" onClick={logout}>
        Log out
      </button>
    </section>
  );
}

// Administrator dashboard placeholder
function AdminPage() {
  const { user, logout } = useAuth();

  return (
    <section className="browse-page section-shell">
      <p className="section-label">Administration</p>
      <h1>Admin dashboard</h1>

      <p className="page-intro">
        Welcome, {user.fullName}. You have administrator access.
      </p>

      <button className="button" onClick={logout}>
        Log out
      </button>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/items" element={<BrowsePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected student and admin account */}
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <AccountPage />
            </ProtectedRoute>
          }
        />

        {/* Protected report creation page */}
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          }
        />

        {/* Protected list of the authenticated user's reports */}
        <Route
          path="/my-reports"
          element={
            <ProtectedRoute>
              <MyReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Protected report editing page */}
        <Route
          path="/my-reports/:id/edit"
          element={
            <ProtectedRoute>
              <EditReportPage />
            </ProtectedRoute>
          }
        />

        {/* Admin-only dashboard */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
