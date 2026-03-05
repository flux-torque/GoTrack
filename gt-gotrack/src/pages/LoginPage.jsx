/**
 * @file pages/LoginPage.jsx
 * @description Sign in / Sign up page. Minimal card-based form.
 * Redirects to home on successful sign-in.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROUTES, APP_CONFIG } from '../constants';
import { cn } from '../utils/cn';
import logger from '../utils/logger';

/**
 * LoginPage — handles both sign in and sign up in a single card.
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const { login, signup, loading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode]         = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [success, setSuccess]   = useState(null);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }

    try {
      if (mode === 'signup') {
        await signup(email, password);
        setSuccess('Account created! Signing you in…');
        await login(email, password);
        navigate(ROUTES.HOME, { replace: true });
      } else {
        await login(email, password);
        logger.info('[LoginPage] Signed in, navigating to home');
        navigate(ROUTES.HOME, { replace: true });
      }
    } catch (err) {
      logger.warn('[LoginPage] Auth failed:', err.message);
      setError(err.message);
    }
  }, [mode, email, password, login, signup, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl tracking-tight">GT</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">{APP_CONFIG.NAME}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{APP_CONFIG.TAGLINE}</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

          {/* Mode toggle — Create Account is disabled (invite-only) */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-semibold transition-all',
                mode === 'signin'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Sign In
            </button>
            <div className="relative flex-1 group">
              <button
                type="button"
                disabled
                className="w-full py-2 rounded-lg text-sm font-semibold text-gray-300 cursor-not-allowed select-none"
              >
                Create Account
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Invite-only — contact admin
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                required
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            )}

            {/* Success */}
            {success && (
              <p className="text-sm text-emerald-600 text-center">{success}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 mt-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'signin' ? (
                <><LogIn size={15} /> Sign In</>
              ) : (
                <><UserPlus size={15} /> Create Account</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
