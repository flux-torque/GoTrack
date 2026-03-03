/**
 * @file PageWrapper.jsx
 * @description Layout shell that combines Sidebar + Navbar + main content area.
 * All page components should be rendered inside PageWrapper.
 * Handles responsive layout: sidebar collapses on mobile via hamburger toggle.
 */

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { cn } from '../../utils/cn';
import logger from '../../utils/logger';

/**
 * PageWrapper — the main layout container for all pages.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content rendered in main area
 * @param {React.ReactNode} [props.headerActions] - Optional slot passed to Navbar centre
 * @returns {JSX.Element}
 */
export function PageWrapper({ children, headerActions }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    logger.info('[PageWrapper] Mounted, sidebarOpen:', sidebarOpen);
  }, []);

  // Close sidebar on mobile when window is small
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
        logger.debug('[PageWrapper] Mobile breakpoint — sidebar closed');
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize(); // run on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Mobile overlay — closes sidebar when tapping outside */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => {
            setSidebarOpen(false);
            logger.debug('[PageWrapper] Overlay clicked — sidebar closed');
          }}
        />
      )}

      {/* Main area — offset by sidebar width on desktop */}
      <div className={cn('flex flex-col flex-1 min-w-0 transition-all duration-300', 'md:ml-64')}>
        <Navbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} actions={headerActions} />

        <main className="flex-1 px-4 py-6 md:px-6 md:py-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
