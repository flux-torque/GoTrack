/**
 * @file Navbar.jsx
 * @description Top navigation bar. Shows the current page title, current month,
 * a notification bell, and a clickable avatar that opens a minimal profile popup.
 */

import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Menu, LogOut, User } from 'lucide-react';
import { format } from 'date-fns';
import { ROUTES } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';
import logger from '../../utils/logger';

// ---------------------------------------------------------------------------
// Page title map
// ---------------------------------------------------------------------------

/** @type {Record<string, string>} Maps route paths to display page titles */
const PAGE_TITLES = {
  [ROUTES.HOME]: 'Dashboard',
  [ROUTES.ANALYSIS]: 'Analysis',
  [ROUTES.EXPENSES]: 'Transactions',
  [ROUTES.ADD_EXPENSE]: 'Add Expense',
  [ROUTES.CATEGORIES]: 'Categories',
  [ROUTES.SETTINGS]: 'Settings',
  [ROUTES.BUDGET]: 'Budget',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derives a 1-2 letter monogram from an email address.
 * e.g. "aryan.sharma@gmail.com" → "AS", "john@example.com" → "JO"
 * @param {string} email
 * @returns {string}
 */
function getInitials(email) {
  if (!email) return '?';
  const local = email.split('@')[0];
  const parts = local.split(/[._\-+]/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

/**
 * Decodes the payload of a Supabase JWT without verification.
 * Returns null if parsing fails.
 * @param {string|null} token
 * @returns {Object|null}
 */
function decodeJWT(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// ProfileDropdown
// ---------------------------------------------------------------------------

/**
 * Minimal profile popup — shows initials avatar, email, and logout button.
 *
 * @param {Object} props
 * @param {Object|null} props.user
 * @param {string|null} props.token
 * @param {function} props.onLogout
 * @param {function} props.onClose
 */
function ProfileDropdown({ user, token, onLogout, onClose }) {
  const email    = user?.email ?? 'Unknown';
  const initials = getInitials(email);
  const jwt      = decodeJWT(token);

  // Created-at from JWT (Supabase puts it in the payload)
  const createdAt = jwt?.user_metadata?.created_at
    ?? jwt?.created_at
    ?? null;

  const createdLabel = createdAt
    ? format(new Date(createdAt), 'dd MMM yyyy')
    : null;

  return (
    <div className="absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Avatar + identity */}
      <div className="bg-indigo-600 px-5 pt-5 pb-8 relative">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3 border-2 border-white/30">
          <span className="text-white text-xl font-bold tracking-tight">{initials}</span>
        </div>
        <p className="text-white font-semibold text-sm leading-tight">{email.split('@')[0]}</p>
        <p className="text-indigo-200 text-xs mt-0.5 truncate">{email}</p>
      </div>

      {/* Info rows */}
      <div className="px-5 -mt-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          <div className="flex items-center gap-3 px-4 py-3">
            <User size={13} className="text-gray-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Account</p>
              <p className="text-xs font-semibold text-gray-700 truncate">{email}</p>
            </div>
          </div>
          {createdLabel && (
            <div className="flex items-center gap-3 px-4 py-3">
              <Bell size={13} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">Member since</p>
                <p className="text-xs font-semibold text-gray-700">{createdLabel}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Logout */}
      <div className="px-5 py-4">
        <button
          onClick={() => { onLogout(); onClose(); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-rose-50 text-gray-600 hover:text-rose-600 border border-gray-200 hover:border-rose-200 text-sm font-semibold rounded-xl transition-all"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Navbar component
// ---------------------------------------------------------------------------

/**
 * Top navigation bar component.
 *
 * @param {Object} props
 * @param {() => void} [props.onMenuToggle] - Callback to toggle sidebar on mobile
 * @param {React.ReactNode} [props.actions] - Optional slot rendered between title and right icons
 * @returns {JSX.Element}
 */
export function Navbar({ onMenuToggle, actions }) {
  const location = useLocation();
  const { user, token, logout } = useAuth();

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'GoTrack';
  const currentMonth = format(new Date(), 'MMMM yyyy');

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    logger.info('[Navbar] Rendered for route:', location.pathname);
  }, [location.pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const initials = getInitials(user?.email ?? '');

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: mobile menu toggle + page title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">{pageTitle}</h1>
          <p className="text-xs text-gray-400">{currentMonth}</p>
        </div>
      </div>

      {/* Centre slot — optional page-level actions */}
      {actions && (
        <div className="flex items-center">{actions}</div>
      )}

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3">
        <button
          className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
          onClick={() => logger.info('[Navbar] Notifications clicked')}
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        {/* Avatar — click to open profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className={cn(
              'w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center cursor-pointer transition-all',
              profileOpen && 'ring-2 ring-indigo-400 ring-offset-1'
            )}
            aria-label="Profile"
          >
            <span className="text-white text-xs font-bold">{initials}</span>
          </button>

          {profileOpen && (
            <ProfileDropdown
              user={user}
              token={token}
              onLogout={logout}
              onClose={() => setProfileOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
}
