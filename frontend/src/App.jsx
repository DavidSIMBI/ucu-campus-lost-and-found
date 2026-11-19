import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Layout from './components/Layout.jsx';
import HomePage from './pages/HomePage.jsx';
import BrowsePage from './pages/BrowsePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import MyReportsPage from './pages/MyReportsPage.jsx';
import EditReportPage from './pages/EditReportPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import AccountActivityPage from './pages/AccountActivityPage.jsx';
import FoundItemsPage from './pages/FoundItemsPage.jsx';
import FoundItemDetailPage from './pages/FoundItemDetailPage.jsx';
import ClaimSubmissionPage from './pages/ClaimSubmissionPage.jsx';
import MyClaimsPage from './pages/MyClaimsPage.jsx';
import MyClaimDetailPage from './pages/MyClaimDetailPage.jsx';
import AdminClaimsPage from './pages/AdminClaimsPage.jsx';
import AdminClaimDetailPage from './pages/AdminClaimDetailPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';

import { useAuth } from './context/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

function StudentRoute({ children }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== 'STUDENT') return <Navigate to="/" replace />;
  return children;
}

function AccountRedirect({ section }) {
  const { isAdmin } = useAuth();
  return <Navigate to={`/account?section=${isAdmin ? 'admin-overview' : section}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/items" element={<BrowsePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/student/dashboard" element={<StudentRoute><AccountRedirect section="overview" /></StudentRoute>} />
        <Route path="/admin" element={<AdminRoute><AccountRedirect section="admin-overview" /></AdminRoute>} />
        <Route path="/admin/dashboard" element={<AdminRoute><AccountRedirect section="admin-overview" /></AdminRoute>} />

        <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="/found-items" element={<ProtectedRoute><FoundItemsPage /></ProtectedRoute>} />
        <Route path="/found-items/:id" element={<ProtectedRoute><FoundItemDetailPage /></ProtectedRoute>} />
        <Route path="/found-items/:id/claim" element={<StudentRoute><ClaimSubmissionPage /></StudentRoute>} />
        <Route path="/my-claims" element={<StudentRoute><MyClaimsPage /></StudentRoute>} />
        <Route path="/my-claims/:id" element={<StudentRoute><MyClaimDetailPage /></StudentRoute>} />
        <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
        <Route path="/my-reports" element={<ProtectedRoute><MyReportsPage /></ProtectedRoute>} />
        <Route path="/my-reports/:id/edit" element={<ProtectedRoute><EditReportPage /></ProtectedRoute>} />

        <Route path="/admin/claims" element={<AdminRoute><AdminClaimsPage /></AdminRoute>} />
        <Route path="/admin/claims/:id" element={<AdminRoute><AdminClaimDetailPage /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
