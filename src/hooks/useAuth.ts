'use client';

import { useSession, signOut } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();
  const user = session?.user ? { nodeId: session.user.nodeId, orgRole: session.user.orgRole } : null;
  const isAuthenticated = status === 'authenticated';

  const logout = () => {
    signOut({ callbackUrl: '/login' });
  };

  return { user, isAuthenticated, logout, status };
}
