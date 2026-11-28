import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AuthUser } from '../types/auth.types';

interface AuthState {
  user: AuthUser | null;
  ready: boolean;
  setUser: (user: AuthUser | null) => void;
  setReady: (ready: boolean) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const setUser = useCallback((next: AuthUser | null) => setUserState(next), []);
  const value = useMemo(() => ({ user, ready, setUser, setReady }), [user, ready, setUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
