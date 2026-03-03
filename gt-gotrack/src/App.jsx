/**
 * @file App.jsx
 * @description Root application component. Sets up React Router with all routes
 * and wraps the app in the ExpenseContext provider.
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ExpenseProvider } from './context/ExpenseContext';
import { BudgetProvider } from './context/BudgetContext';
import { ROUTES } from './constants';

import HomePage from './pages/HomePage';
import AnalysisPage from './pages/AnalysisPage';
import ExpensesPage from './pages/ExpensesPage';
import AddExpensePage from './pages/AddExpensePage';
import BudgetPage from './pages/BudgetPage';
import CategoriesPage from './pages/CategoriesPage';
import SettingsPage from './pages/SettingsPage';

import logger from './utils/logger';

/**
 * Inner component that logs app mount — must be inside Router context.
 * @returns {JSX.Element} Routed page tree
 */
function AppRoutes() {
  useEffect(() => {
    logger.info('[App] GoTrack application mounted');
  }, []);

  return (
    <Routes>
      <Route path={ROUTES.HOME} element={<HomePage />} />
      <Route path={ROUTES.ANALYSIS} element={<AnalysisPage />} />
      <Route path={ROUTES.EXPENSES} element={<ExpensesPage />} />
      <Route path={ROUTES.ADD_EXPENSE} element={<AddExpensePage />} />
      <Route path={ROUTES.BUDGET} element={<BudgetPage />} />
      <Route path={ROUTES.CATEGORIES} element={<CategoriesPage />} />
      <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
      {/* Catch-all → redirect to home */}
      <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
    </Routes>
  );
}

/**
 * Root App component — provides context and routing.
 * @returns {JSX.Element} The full application tree
 */
function App() {
  return (
    <BrowserRouter>
      <ExpenseProvider>
        <BudgetProvider>
          <AppRoutes />
        </BudgetProvider>
      </ExpenseProvider>
    </BrowserRouter>
  );
}

export default App;
