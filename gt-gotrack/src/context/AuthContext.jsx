/**
 * @file context/AuthContext.jsx
 * @description Authentication context — manages session (JWT tokens + user),
 * persists to localStorage, and exposes login/signup/logout actions.
 *
 * localStorage key: 'gt_auth'
 * Schema: { access_token, refresh_token, expires_at, user: { id, email } }
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import logger from '../utils/logger';

const AUTH_KEY = 'gt_auth';

function loadSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext(null);

/**
 * AuthProvider — wraps the app and provides session state.
 * Must be the outermost provider (ExpenseProvider and BudgetProvider go inside).
 *
 * @param {{ children: React.ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());
  const [loading, setLoading] = useState(false);

  const isAuthenticated = !!session?.access_token;
  const user  = session?.user  ?? null;
  const token = session?.access_token ?? null;

  // Listen for token expiry fired by apiFetch on 401
  useEffect(() => {
    const handler = () => {
      logger.warn('[AuthContext] Token expired — clearing session');
      localStorage.removeItem(AUTH_KEY);
      setSession(null);
    };
    window.addEventListener('gt:auth:expired', handler);
    return () => window.removeEventListener('gt:auth:expired', handler);
  }, []);

  /**
   * Sign in with email + password.
   * Stores the session in localStorage on success.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   * @throws {Error} On invalid credentials or network failure
   */
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await apiFetch('/auth/signin', {
        method: 'POST',
        body: { email, password },
      });
      const sess = {
        access_token:  data.access_token,
        refresh_token: data.refresh_token,
        expires_at:    data.expires_at,
        user:          data.user,
      };
      localStorage.setItem(AUTH_KEY, JSON.stringify(sess));
      setSession(sess);
      logger.info('[AuthContext] Signed in:', data.user.email);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new account.
   * Does NOT auto-sign in — user must call login() after.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<void>}
   */
  const signup = useCallback(async (email, password) => {
    setLoading(true);
    try {
      await apiFetch('/auth/signup', {
        method: 'POST',
        body: { email, password },
      });
      logger.info('[AuthContext] Account created for:', email);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sign out — calls the API to invalidate the token, then clears local state.
   * @returns {Promise<void>}
   */
  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/signout', { method: 'POST' });
    } catch (err) {
      logger.warn('[AuthContext] Signout API error (continuing):', err.message);
    }
    localStorage.removeItem(AUTH_KEY);
    setSession(null);
    logger.info('[AuthContext] Signed out');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @returns {{ user: object|null, token: string|null, isAuthenticated: boolean, loading: boolean, login: Function, signup: Function, logout: Function }}
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('[useAuth] Must be used within <AuthProvider>');
  return ctx;
}
