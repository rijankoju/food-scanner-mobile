import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  api,
  clearTokens,
  getStoredRefreshToken,
  refreshSession,
  saveTokens,
  setSessionExpiredHandler,
} from '@/api/client';
import type { Tokens } from '@/api/types';

type Status = 'loading' | 'signedIn' | 'signedOut';

type AuthContextValue = {
  status: Status;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const queryClient = useQueryClient();

  const endSession = useCallback(async () => {
    await clearTokens();
    queryClient.clear();
    setStatus('signedOut');
  }, [queryClient]);

  // On launch, a stored refresh token restores the session without a login.
  // If the server can't be reached, stay signed in; requests retry the
  // refresh once the connection is back.
  useEffect(() => {
    setSessionExpiredHandler(() => void endSession());
    refreshSession().then((result) => setStatus(result === 'invalid' ? 'signedOut' : 'signedIn'));
  }, [endSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      signIn: async (email, password) => {
        const tokens = await api<Tokens>('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
        await saveTokens(tokens);
        setStatus('signedIn');
      },
      register: async (email, password, displayName) => {
        const tokens = await api<Tokens>('/api/auth/register', {
          method: 'POST',
          body: { email, password, displayName: displayName || undefined },
          auth: false,
        });
        await saveTokens(tokens);
        setStatus('signedIn');
      },
      signOut: async () => {
        const refreshToken = await getStoredRefreshToken();
        if (refreshToken) {
          // Best effort: the local sign-out happens even if the server can't be reached.
          await api('/api/auth/logout', { method: 'POST', body: { refreshToken }, auth: false }).catch(() => {});
        }
        await endSession();
      },
    }),
    [status, endSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
