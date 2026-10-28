import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as loginRequest } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { clearToken, getToken, setToken } from '../api/token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // If a token is stored, we are "loading" until /auth/me confirms it.
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // Expired or invalid token anywhere in the app -> sign out.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Restore the session on page load.
  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { token, user: me } = await loginRequest(email, password);
    setToken(token);
    setUser(me);
    return me;
  }, []);

  // can('leads', 'create') -> true/false. Defaults to the "view" action.
  const can = useCallback(
    (module, action = 'view') => Boolean(user?.permissions?.some((p) => p.module === module && p.action === action)),
    [user]
  );

  // scopeOf('leads', 'view') -> 'own' | 'all' | null. Handy for labels like "My leads".
  const scopeOf = useCallback(
    (module, action = 'view') => user?.permissions?.find((p) => p.module === module && p.action === action)?.scope ?? null,
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, can, scopeOf }),
    [user, loading, login, logout, can, scopeOf]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
