
import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem('token') || null
  );

  useEffect(() => {
    const clearSession = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', clearSession);
    return () => window.removeEventListener('auth:unauthorized', clearSession);
  }, []);

  const saveSession = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    setToken(data.token);
    setUser(data.user);
  };

  const register = async (fullName, email, password) => {
    const response = await api.post('/auth/register', {
      fullName,
      email,
      password
    });

    saveSession(response.data);
    return response.data;
  };

  const login = async (email, password) => {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    saveSession(response.data);
    return response.data;
  };

  const updateProfile = async (profile) => {
    const response = await api.patch('/auth/profile', profile);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  // Log out from the backend and clear the frontend session
  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error('Backend logout failed:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isAdmin: user?.role === 'ADMIN',
        register,
        login,
        updateProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
