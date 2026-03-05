/**
 * @file components/auth/ProtectedRoute.jsx
 * @description Wraps routes that require authentication.
 * Redirects to /login if the user is not authenticated.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../constants';

/**
 * ProtectedRoute — renders children if authenticated, otherwise redirects to login.
 * Preserves the attempted URL so the user can be redirected back after login.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return children;
}
