/**
 * @file BudgetContext.jsx
 * @description React Context for budget settings — persists to gt-api (Supabase).
 * v2: API-backed. Loads from /budgets on auth. dispatch() is an async wrapper
 * that updates local state optimistically and syncs to the API in the background.
 *
 * Actions (same shape as v1 — existing callers unchanged):
 *   SET_MONTH_BUDGET   → { month: 'YYYY-MM', amount: number }
 *   CLEAR_MONTH_BUDGET → { month: 'YYYY-MM' }
 *   SET_DEFAULT_BUDGET → amount: number
 *   CLEAR_BUDGET       → reset everything
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

export const BUDGET_ACTIONS = {
  SET_MONTH_BUDGET:   'SET_MONTH_BUDGET',
  CLEAR_MONTH_BUDGET: 'CLEAR_MONTH_BUDGET',
  SET_DEFAULT_BUDGET: 'SET_DEFAULT_BUDGET',
  CLEAR_BUDGET:       'CLEAR_BUDGET',
  SET_BUDGET:         'SET_DEFAULT_BUDGET', // legacy alias
};

/** @type {{ monthlyBudgets: Object, defaultBudget: number|null, budgetConfigured: boolean }} */
const DEFAULT_STATE = {
  monthlyBudgets:   {},
  defaultBudget:    null,
  budgetConfigured: false,
};

/**
 * Returns the effective spending limit for a given month.
 * @param {Object} settings
 * @param {string} month - YYYY-MM
 * @returns {number | null}
 */
export function getBudgetForMonth(settings, month) {
  if (month && settings.monthlyBudgets[month] !== undefined) {
    return settings.monthlyBudgets[month];
  }
  return settings.defaultBudget;
}

/**
 * Returns true if the given month has a specific override (not using the default).
 * @param {Object} settings
 * @param {string} month - YYYY-MM
 * @returns {boolean}
 */
export function hasMonthOverride(settings, month) {
  return month != null && settings.monthlyBudgets[month] !== undefined;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

function budgetReducer(state, action) {
  switch (action.type) {
    case 'SET_MONTH_BUDGET': {
      const { month, amount } = action.payload ?? {};
      const budget = Number(amount);
      if (!month || isNaN(budget) || budget < 0) {
        logger.warn('[BudgetContext] SET_MONTH_BUDGET: invalid payload', action.payload);
        return state;
      }
      logger.info('[BudgetContext] SET_MONTH_BUDGET:', month, budget);
      return {
        ...state,
        monthlyBudgets:   { ...state.monthlyBudgets, [month]: budget },
        budgetConfigured: true,
      };
    }

    case 'CLEAR_MONTH_BUDGET': {
      const { month } = action.payload ?? {};
      if (!month) return state;
      const { [month]: _removed, ...rest } = state.monthlyBudgets;
      logger.info('[BudgetContext] CLEAR_MONTH_BUDGET:', month);
      return { ...state, monthlyBudgets: rest };
    }

    case 'SET_DEFAULT_BUDGET': {
      const budget = Number(action.payload);
      if (isNaN(budget) || budget < 0) {
        logger.warn('[BudgetContext] SET_DEFAULT_BUDGET: invalid value', action.payload);
        return state;
      }
      logger.info('[BudgetContext] SET_DEFAULT_BUDGET:', budget);
      return { ...state, defaultBudget: budget, budgetConfigured: true };
    }

    case 'CLEAR_BUDGET':
      logger.warn('[BudgetContext] CLEAR_BUDGET');
      return { ...DEFAULT_STATE };

    default:
      logger.warn('[BudgetContext] Unknown action:', action.type);
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context & Provider
// ---------------------------------------------------------------------------

const BudgetContext = createContext(null);

/**
 * BudgetProvider — loads from API when authenticated.
 * Exposes `dispatch` as an async API-aware wrapper so existing callers need no changes.
 *
 * @param {{ children: React.ReactNode }} props
 */
export function BudgetProvider({ children }) {
  const { token } = useAuth();
  const [settings, _dispatch] = useReducer(budgetReducer, DEFAULT_STATE);

  useEffect(() => {
    if (token) {
      loadFromApi();
    } else {
      _dispatch({ type: 'CLEAR_BUDGET' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadFromApi() {
    try {
      const data = await apiFetch('/budgets');
      if (typeof data.defaultBudget === 'number') {
        _dispatch({ type: 'SET_DEFAULT_BUDGET', payload: data.defaultBudget });
      }
      for (const [month, amount] of Object.entries(data.monthlyBudgets || {})) {
        _dispatch({ type: 'SET_MONTH_BUDGET', payload: { month, amount } });
      }
      logger.info('[BudgetContext] Loaded from API');
    } catch (err) {
      logger.error('[BudgetContext] loadFromApi failed:', err.message);
    }
  }

  /**
   * Async dispatch — updates local state optimistically, then syncs to API.
   * Same action shape as v1 dispatch so BudgetPage needs no changes.
   */
  const dispatch = useCallback(async (action) => {
    _dispatch(action); // optimistic update — UI responds instantly

    try {
      switch (action.type) {
        case 'SET_DEFAULT_BUDGET':
          await apiFetch('/budgets', {
            method: 'POST',
            body: { monthly_budget: action.payload, month: null },
          });
          break;

        case 'SET_MONTH_BUDGET': {
          const { month, amount } = action.payload;
          await apiFetch('/budgets', {
            method: 'POST',
            body: { monthly_budget: amount, month },
          });
          break;
        }

        case 'CLEAR_MONTH_BUDGET':
          await apiFetch(`/budgets/${action.payload.month}`, { method: 'DELETE' });
          break;

        case 'CLEAR_BUDGET':
          await apiFetch('/budgets/default', { method: 'DELETE' }).catch(() => {});
          for (const month of Object.keys(settings.monthlyBudgets)) {
            await apiFetch(`/budgets/${month}`, { method: 'DELETE' }).catch(() => {});
          }
          break;

        default:
          break;
      }
    } catch (err) {
      logger.error('[BudgetContext] API sync failed:', err.message);
    }
  }, [settings.monthlyBudgets]);

  return (
    <BudgetContext.Provider value={{ settings, dispatch }}>
      {children}
    </BudgetContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @returns {{ settings: Object, dispatch: Function }}
 */
export function useBudgetSettings() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('[useBudgetSettings] Must be used within <BudgetProvider>');
  return ctx;
}
