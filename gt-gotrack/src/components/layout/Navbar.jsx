/**
 * @file Navbar.jsx
 * @description Top navigation bar. Shows the current page title, current month,
 * a notification bell, and an avatar/profile placeholder on the right.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { format } from 'date-fns';
import { ROUTES } from '../../constants';
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
};

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
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'GoTrack';
  const currentMonth = format(new Date(), 'MMMM yyyy');

  useEffect(() => {
    logger.info('[Navbar] Rendered for route:', location.pathname);
  }, [location.pathname]);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: mobile menu toggle + page title */}
      <div className="flex items-center gap-4">
        {/* Hamburger — visible on mobile only */}
        <button
          onClick={onMenuToggle}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {pageTitle}
          </h1>
          <p className="text-xs text-gray-400">{currentMonth}</p>
        </div>
      </div>

      {/* Centre slot — optional page-level actions (e.g. period toggle on Dashboard) */}
      {actions && (
        <div className="flex items-center">{actions}</div>
      )}

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button
          className="relative p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
          onClick={() => logger.info('[Navbar] Notifications clicked')}
        >
          <Bell size={18} />
          {/* Unread dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        </button>

        {/* Avatar placeholder */}
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center cursor-pointer">
          <span className="text-white text-xs font-bold">Y</span>
        </div>
      </div>
    </header>
  );
}
