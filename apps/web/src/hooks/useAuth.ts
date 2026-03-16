import { useState, useEffect } from 'react';
import { getToken, getUser, clearAuth, AuthUser } from '../lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getUser);
  const isAuthenticated = user !== null && getToken() !== null;

  const logout = () => {
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  };

  useEffect(() => {
    setUser(getUser());
  }, []);

  return { user, isAuthenticated, logout };
}
