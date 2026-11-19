import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function useAdminSession() {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleUnauthorized = useCallback(async (requestError) => {
    if (requestError.response?.status !== 401) return false;

    await logout();
    navigate('/login', {
      replace: true,
      state: { from: `${location.pathname}${location.search}` }
    });
    return true;
  }, [location.pathname, location.search, logout, navigate]);

  return handleUnauthorized;
}
