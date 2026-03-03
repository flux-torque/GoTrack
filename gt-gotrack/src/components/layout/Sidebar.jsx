/**
 * @file Sidebar.jsx
 * @description Left navigation sidebar for GoTrack. Contains the GT brand logo,
 * navigation links with active state, and a user avatar at the bottom.
 * Disabled links (Categories, Settings) show a "Coming Soon" tooltip.
 */

import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  PlusCircle,
  Tag,
  Settings,
  BarChart2,
  PiggyBank,
  User,
} from 'lucide-react';
import { NAV_LINKS, APP_CONFIG, ROUTES } from '../../constants';
import { cn } from '../../utils/cn';
import logger from '../../utils/logger';

// ---------------------------------------------------------------------------
// Icon map — maps string icon names from constants to Lucide components
// ---------------------------------------------------------------------------

/** @type {Record<string, React.ComponentType>} */
const ICON_MAP = {
  LayoutDashboard,
  BarChart2,
  Receipt,
  PlusCircle,
  PiggyBank,
  Tag,
  Settings,
};

// ---------------------------------------------------------------------------
// NavItem sub-component
// ---------------------------------------------------------------------------

/**
 * Single navigation item in the sidebar.
 * @param {Object} props
 * @param {string} props.label - Display label
 * @param {string} props.route - Route path
 * @param {string} props.icon - Icon name from ICON_MAP
 * @param {boolean} props.enabled - If false, item is disabled with tooltip
 * @returns {JSX.Element}
 */
function NavItem({ label, route, icon, enabled }) {
  const IconComponent = ICON_MAP[icon] || LayoutDashboard;

  if (!enabled) {
    return (
      <div className="relative group">
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-2.5 rounded-xl',
            'text-gray-400 cursor-not-allowed select-none',
            'transition-colors duration-150'
          )}
        >
          <IconComponent size={18} />
          <span className="text-sm font-medium">{label}</span>
          <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full font-medium">
            Soon
          </span>
        </div>
        {/* Tooltip */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
          Available in v2
        </div>
      </div>
    );
  }

  return (
    <NavLink
      to={route}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-150',
          isActive
            ? 'bg-indigo-50 text-indigo-600 font-semibold'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
        )
      }
    >
      <IconComponent size={18} />
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  );
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

/**
 * Main sidebar navigation component.
 * Renders the GT logo, nav links, and a user avatar at the bottom.
 *
 * @param {Object} props
 * @param {boolean} [props.isOpen=true] - Controls visibility on mobile
 * @returns {JSX.Element}
 */
export function Sidebar({ isOpen = true }) {
  const location = useLocation();

  useEffect(() => {
    logger.info('[Sidebar] Route changed to:', location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    logger.info('[Sidebar] Mounted');
  }, []);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200',
        'flex flex-col z-30 transition-transform duration-300',
        !isOpen && '-translate-x-full'
      )}
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold tracking-tight">
            {APP_CONFIG.MONOGRAM}
          </span>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900 leading-tight">
            {APP_CONFIG.NAME}
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">
            {APP_CONFIG.TAGLINE}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_LINKS.map((link) => (
          <NavItem
            key={link.route}
            label={link.label}
            route={link.route}
            icon={link.icon}
            enabled={link.enabled}
          />
        ))}
      </nav>

      {/* User Avatar */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">You</p>
            <p className="text-xs text-gray-400 truncate">Personal Account</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
