import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as loginRequest } from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import { clearToken, getToken, setLoginNotice, setToken } from '../api/token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // If a token is stored, we are "loading" until /auth/me confirms it.
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  // Set when we could not confirm the stored session because the server was unreachable or failing.
  // The token is kept in that case: a server outage must not sign everyone out.
  const [bootError, setBootError] = useState(null);
  const [bootAttempt, setBootAttempt] = useState(0);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setBootError(null);
  }, []);

  // Expired, revoked or invalid token anywhere in the app -> sign out and tell the person why.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (getToken()) setLoginNotice('Your session has ended. Please sign in again.');
      logout();
    });
  }, [logout]);

  // Restore the session on page load (and again when the person hits "Try again").
  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    setLoading(true);
    setBootError(null);
    getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((err) => {
        // A 401 already signed the person out through the interceptor. Anything else is not their fault.
        if (!cancelled && err?.status !== 401) setBootError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [bootAttempt]);

  const retryBoot = useCallback(() => setBootAttempt((n) => n + 1), []);

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
    () => ({ user, loading, bootError, retryBoot, login, logout, can, scopeOf }),
    [user, loading, bootError, retryBoot, login, logout, can, scopeOf]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
