/**
 * @file BudgetContext.jsx
 * @description React Context for budget settings — persists to localStorage.
 *
 * localStorage key: 'gt_budget_v3'
 * Schema: {
 *   monthlyBudgets:  { [YYYY-MM]: number }  — per-month specific limits
 *   defaultBudget:   number | null          — fallback for months without a specific limit
 *   budgetConfigured: boolean
 * }
 *
 * Actions:
 *   SET_MONTH_BUDGET   → { month: 'YYYY-MM', amount: number } — override for one month
 *   CLEAR_MONTH_BUDGET → { month: 'YYYY-MM' }                — remove month override, revert to default
 *   SET_DEFAULT_BUDGET → amount: number                      — set the global default
 *   CLEAR_BUDGET       → reset everything
 *
 * v4: Per-month budget support. Each month can have its own spending limit.
 *     Falls back to defaultBudget for months without a specific limit.
 *     Storage key bumped to gt_budget_v3; migrates v2 single budget → defaultBudget.
 */

import { createContext, useContext, useReducer, useEffect } from 'react';
import logger from '../utils/logger';

const STORAGE_KEY = 'gt_budget_v3';

export const BUDGET_ACTIONS = {
  SET_MONTH_BUDGET:   'SET_MONTH_BUDGET',
  CLEAR_MONTH_BUDGET: 'CLEAR_MONTH_BUDGET',
  SET_DEFAULT_BUDGET: 'SET_DEFAULT_BUDGET',
  CLEAR_BUDGET:       'CLEAR_BUDGET',
  // Legacy alias used by some callers
  SET_BUDGET: 'SET_DEFAULT_BUDGET',
};

/**
 * @typedef {Object} BudgetSettings
 * @property {{ [yyyyMM: string]: number }} monthlyBudgets  - Per-month specific limits
 * @property {number | null} defaultBudget                  - Fallback for months without a specific limit
 * @property {boolean} budgetConfigured                     - True once any budget has been set
 */

/** @type {BudgetSettings} */
const DEFAULT_STATE = {
  monthlyBudgets:  {},
  defaultBudget:   null,
  budgetConfigured: false,
};

/**
 * Returns the effective spending limit for a given month.
 * Prefers the month-specific budget; falls back to defaultBudget.
 *
 * @param {BudgetSettings} settings
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
 * Returns true if the given month has a month-specific override (not using the default).
 * @param {BudgetSettings} settings
 * @param {string} month - YYYY-MM
 * @returns {boolean}
 */
export function hasMonthOverride(settings, month) {
  return month != null && settings.monthlyBudgets[month] !== undefined;
}

// ---------------------------------------------------------------------------
// Load & migrate from older storage keys
// ---------------------------------------------------------------------------

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        logger.info('[BudgetContext] Loaded v3');
        return {
          monthlyBudgets:  parsed.monthlyBudgets  || {},
          defaultBudget:   typeof parsed.defaultBudget === 'number' ? parsed.defaultBudget : null,
          budgetConfigured: parsed.budgetConfigured === true,
        };
      }
    }

    // Migrate from v2 (single monthlyBudget → defaultBudget)
    const v2raw = localStorage.getItem('gt_budget_v2');
    if (v2raw) {
      const v2 = JSON.parse(v2raw);
      if (typeof v2.monthlyBudget === 'number' && v2.monthlyBudget > 0) {
        logger.info('[BudgetContext] Migrated from v2: defaultBudget =', v2.monthlyBudget);
        return { monthlyBudgets: {}, defaultBudget: v2.monthlyBudget, budgetConfigured: true };
      }
    }

    // Migrate from v1 (targetSavings)
    const v1raw = localStorage.getItem('gt_budget_v1');
    if (v1raw) {
      const v1 = JSON.parse(v1raw);
      if (typeof v1.targetSavings === 'number' && v1.targetSavings > 0) {
        logger.info('[BudgetContext] Migrated from v1: defaultBudget =', v1.targetSavings);
        return { monthlyBudgets: {}, defaultBudget: v1.targetSavings, budgetConfigured: true };
      }
    }
  } catch (err) {
    logger.error('[BudgetContext] Failed to parse localStorage:', err);
  }
  return { ...DEFAULT_STATE };
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
        monthlyBudgets: { ...state.monthlyBudgets, [month]: budget },
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
      logger.warn('[BudgetContext] CLEAR_BUDGET: resetting all settings');
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
 * Provides budget settings to the entire app, persisted to localStorage.
 * @param {{ children: React.ReactNode }} props
 */
export function BudgetProvider({ children }) {
  const [settings, dispatch] = useReducer(budgetReducer, undefined, loadFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      logger.info('[BudgetContext] Synced to localStorage');
    } catch (err) {
      logger.error('[BudgetContext] Failed to write localStorage:', err);
    }
  }, [settings]);

  return (
    <BudgetContext.Provider value={{ settings, dispatch }}>
      {children}
    </BudgetContext.Provider>
  );
}

/**
 * @returns {{ settings: BudgetSettings, dispatch: React.Dispatch }}
 */
export function useBudgetSettings() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error('[useBudgetSettings] Must be used within a <BudgetProvider>');
  return ctx;
}
