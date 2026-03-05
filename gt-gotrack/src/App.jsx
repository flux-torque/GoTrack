/**
 * @file App.jsx
 * @description Root application component. Sets up React Router with all routes
 * and wraps the app in AuthProvider, ExpenseProvider, and BudgetProvider.
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider }    from './context/AuthContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { BudgetProvider }  from './context/BudgetContext';
import { ProtectedRoute }  from './components/auth/ProtectedRoute';
import { ROUTES }          from './constants';

import LoginPage       from './pages/LoginPage';
import HomePage        from './pages/HomePage';
import AnalysisPage    from './pages/AnalysisPage';
import ExpensesPage    from './pages/ExpensesPage';
import AddExpensePage  from './pages/AddExpensePage';
import BudgetPage      from './pages/BudgetPage';
import CategoriesPage  from './pages/CategoriesPage';
import SettingsPage    from './pages/SettingsPage';

import logger from './utils/logger';

/**
 * Inner routes — must be inside Router + AuthProvider context.
 * @returns {JSX.Element}
 */
function AppRoutes() {
  useEffect(() => {
    logger.info('[App] GoTrack application mounted');
  }, []);

  return (
    <Routes>
      {/* Public */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />

      {/* Protected */}
      <Route path={ROUTES.HOME}        element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path={ROUTES.ANALYSIS}    element={<ProtectedRoute><AnalysisPage /></ProtectedRoute>} />
      <Route path={ROUTES.EXPENSES}    element={<ProtectedRoute><ExpensesPage /></ProtectedRoute>} />
      <Route path={ROUTES.ADD_EXPENSE} element={<ProtectedRoute><AddExpensePage /></ProtectedRoute>} />
      <Route path={ROUTES.BUDGET}      element={<ProtectedRoute><BudgetPage /></ProtectedRoute>} />
      <Route path={ROUTES.CATEGORIES}  element={<ProtectedRoute><CategoriesPage /></ProtectedRoute>} />
      <Route path={ROUTES.SETTINGS}    element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

/**
 * Root App — providers nest: Auth → Expense (needs auth) → Budget (needs auth)
 * @returns {JSX.Element}
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ExpenseProvider>
          <BudgetProvider>
            <AppRoutes />
          </BudgetProvider>
        </ExpenseProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
