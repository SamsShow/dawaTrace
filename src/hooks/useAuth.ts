'use client';

import { useState, useEffect } from 'react';
import { getToken, getUser, clearAuth, type AuthUser } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const token = typeof window !== 'undefined' ? getToken() : null;
  const isAuthenticated = user !== null && token !== null;

  const logout = () => {
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  };

  useEffect(() => {
    setUser(getUser());
  }, []);

  return { user, isAuthenticated, logout, token };
}
