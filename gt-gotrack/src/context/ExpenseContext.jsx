/**
 * @file ExpenseContext.jsx
 * @description React Context + useReducer for expense state management.
 * v2: API-backed — loads from gt-api on auth, persists all mutations via API.
 *
 * Async actions (use these from components):
 *   addExpense(formData)           → POST /transactions
 *   deleteExpense(id)              → DELETE /transactions/:id
 *   toggleBudgetExclude(id)        → PATCH /transactions/:id
 *   importBulk(parsedResult, bank) → POST /statements + /transactions/bulk
 *   fetchExpenses()                → GET /transactions (reload)
 *   clearExpenses()                → local clear only (no DB delete)
 */

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { detectCategory } from '../utils/categoryDetector';
import { apiFetch } from '../services/api';
import { useAuth } from './AuthContext';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

export const EXPENSE_ACTIONS = {
  ADD_EXPENSE:           'ADD_EXPENSE',
  DELETE_EXPENSE:        'DELETE_EXPENSE',
  LOAD_EXPENSES:         'LOAD_EXPENSES',
  IMPORT_TRANSACTIONS:   'IMPORT_TRANSACTIONS',
  CLEAR_EXPENSES:        'CLEAR_EXPENSES',
  TOGGLE_BUDGET_EXCLUDE: 'TOGGLE_BUDGET_EXCLUDE',
  SET_LOADING:           'SET_LOADING',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps an API transaction row (snake_case) to the frontend Expense shape (camelCase).
 * @param {Object} txn
 * @returns {Object}
 */
function apiTxnToExpense(txn) {
  const fullDesc = txn.description || 'Unknown';
  const title = fullDesc.split('/')[0].trim().slice(0, 40) || fullDesc.slice(0, 40);
  return {
    id:             txn.id,
    title,
    note:           fullDesc,
    category:       txn.category,
    type:           txn.type,
    amount:         Number(txn.amount),
    date:           txn.date,
    balance:        0,
    budgetExcluded: txn.budget_excluded,
  };
}

/**
 * Converts a raw ParsedTransaction (from bank parsers) into the Expense format.
 * Used for preview in BankUploadModal before import is confirmed.
 * @param {Object} tx
 * @param {number} index
 * @returns {Object}
 */
export function parsedTxToExpense(tx, index) {
  const fullDesc = tx.description || 'Unknown';
  const title = fullDesc.split('/')[0].trim().slice(0, 40) || fullDesc.slice(0, 40);
  return {
    id:             `import-${Date.now()}-${index}`,
    title,
    note:           fullDesc,
    category:       tx.categoryId || detectCategory(fullDesc),
    type:           tx.type,
    amount:         tx.amount,
    date:           format(tx.date, 'yyyy-MM-dd'),
    balance:        tx.balance ?? 0,
    budgetExcluded: false,
  };
}

/**
 * Returns all 'YYYY-MM' month strings within a date range (inclusive).
 * @param {string} fromDate - YYYY-MM-DD
 * @param {string} toDate   - YYYY-MM-DD
 * @returns {string[]}
 */
function getMonthsInRange(fromDate, toDate) {
  const months = [];
  const start = new Date(fromDate);
  const end   = new Date(toDate);
  start.setDate(1);
  end.setDate(1);
  while (start <= end) {
    months.push(format(start, 'yyyy-MM'));
    start.setMonth(start.getMonth() + 1);
  }
  return months;
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

const EMPTY_BALANCE_META = {
  openingBalance: 0,
  closingBalance: 0,
  statementFrom:  null,
  statementTo:    null,
};

/** @type {{ expenses: Object[], balanceMeta: Object, loading: boolean }} */
const initialState = {
  expenses:    [],
  balanceMeta: { ...EMPTY_BALANCE_META },
  loading:     false,
};

function expenseReducer(state, action) {
  switch (action.type) {
    case EXPENSE_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case EXPENSE_ACTIONS.LOAD_EXPENSES:
      logger.info('[ExpenseContext] LOAD_EXPENSES:', action.payload.length);
      return { ...state, expenses: action.payload, loading: false };

    case EXPENSE_ACTIONS.ADD_EXPENSE: {
      logger.info('[ExpenseContext] ADD_EXPENSE:', action.payload.title);
      return { ...state, expenses: [action.payload, ...state.expenses] };
    }

    case EXPENSE_ACTIONS.DELETE_EXPENSE:
      logger.warn('[ExpenseContext] DELETE_EXPENSE id:', action.payload);
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.payload) };

    case EXPENSE_ACTIONS.IMPORT_TRANSACTIONS: {
      // Kept for compat — importBulk() is the v2 replacement
      const { transactions: rawTxs, openingBalance, closingBalance } = action.payload;
      const expenses = rawTxs.map((tx, i) => parsedTxToExpense(tx, i));
      const dates = expenses.map((e) => e.date).sort();
      const balanceMeta = {
        openingBalance: openingBalance ?? 0,
        closingBalance: closingBalance ?? 0,
        statementFrom:  dates[0] ?? null,
        statementTo:    dates[dates.length - 1] ?? null,
      };
      logger.info('[ExpenseContext] IMPORT_TRANSACTIONS (local):', expenses.length);
      return { ...state, expenses, balanceMeta };
    }

    case EXPENSE_ACTIONS.CLEAR_EXPENSES:
      logger.warn('[ExpenseContext] CLEAR_EXPENSES');
      return { ...initialState, balanceMeta: { ...EMPTY_BALANCE_META } };

    case EXPENSE_ACTIONS.TOGGLE_BUDGET_EXCLUDE:
      logger.info('[ExpenseContext] TOGGLE_BUDGET_EXCLUDE id:', action.payload);
      return {
        ...state,
        expenses: state.expenses.map((e) =>
          e.id === action.payload ? { ...e, budgetExcluded: !e.budgetExcluded } : e
        ),
      };

    default:
      logger.warn('[ExpenseContext] Unknown action:', action.type);
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context & Provider
// ---------------------------------------------------------------------------

const ExpenseContext = createContext(null);

/**
 * ExpenseProvider — fetches from API when user is authenticated.
 * @param {{ children: React.ReactNode }} props
 */
export function ExpenseProvider({ children }) {
  const { token } = useAuth();
  const [state, dispatch] = useReducer(expenseReducer, initialState);

  // Reload on login, clear on logout
  useEffect(() => {
    if (token) {
      fetchExpenses();
    } else {
      dispatch({ type: EXPENSE_ACTIONS.CLEAR_EXPENSES });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchExpenses = useCallback(async () => {
    dispatch({ type: EXPENSE_ACTIONS.SET_LOADING, payload: true });
    try {
      const data = await apiFetch('/transactions');
      dispatch({ type: EXPENSE_ACTIONS.LOAD_EXPENSES, payload: data.map(apiTxnToExpense) });
    } catch (err) {
      logger.error('[ExpenseContext] fetchExpenses failed:', err.message);
      dispatch({ type: EXPENSE_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  const addExpense = useCallback(async (formData) => {
    const data = await apiFetch('/transactions', { method: 'POST', body: formData });
    dispatch({ type: EXPENSE_ACTIONS.ADD_EXPENSE, payload: apiTxnToExpense(data) });
    logger.info('[ExpenseContext] addExpense saved:', data.id);
  }, []);

  const deleteExpense = useCallback(async (id) => {
    await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
    dispatch({ type: EXPENSE_ACTIONS.DELETE_EXPENSE, payload: id });
  }, []);

  const toggleBudgetExclude = useCallback(async (id) => {
    const expense = state.expenses.find((e) => e.id === id);
    if (!expense) return;
    await apiFetch(`/transactions/${id}`, {
      method: 'PATCH',
      body: { budget_excluded: !expense.budgetExcluded },
    });
    dispatch({ type: EXPENSE_ACTIONS.TOGGLE_BUDGET_EXCLUDE, payload: id });
  }, [state.expenses]);

  const importBulk = useCallback(async (parsedResult, bank = 'icici') => {
    dispatch({ type: EXPENSE_ACTIONS.SET_LOADING, payload: true });
    try {
      const txns  = parsedResult.transactions;
      const dates = txns.map((tx) => format(tx.date, 'yyyy-MM-dd')).sort();

      const statementRecord = await apiFetch('/statements', {
        method: 'POST',
        body: {
          statement_from:  dates[0],
          statement_to:    dates[dates.length - 1],
          opening_balance: parsedResult.openingBalance ?? 0,
          closing_balance: parsedResult.closingBalance ?? 0,
          bank,
          tx_count:   txns.length,
          tx_skipped: 0,
        },
      });

      const rows = txns.map((tx) => ({
        date:        format(tx.date, 'yyyy-MM-dd'),
        description: tx.description,
        amount:      tx.amount,
        type:        tx.type,
        category:    tx.categoryId || detectCategory(tx.description),
        source:      `${bank}_pdf`,
      }));

      const bulkResult = await apiFetch('/transactions/bulk', {
        method: 'POST',
        body: { transactions: rows, statement_id: statementRecord.id },
      });

      const months = getMonthsInRange(dates[0], dates[dates.length - 1]);
      for (const month of months) {
        await apiFetch('/statements/balances', {
          method: 'POST',
          body: {
            month,
            opening_balance: parsedResult.openingBalance ?? 0,
            closing_balance: parsedResult.closingBalance ?? 0,
            statement_from:  dates[0],
            statement_to:    dates[dates.length - 1],
            source:          `${bank}_pdf`,
          },
        });
      }

      await fetchExpenses();
      logger.info('[ExpenseContext] importBulk complete:', bulkResult);
      return bulkResult;
    } catch (err) {
      logger.error('[ExpenseContext] importBulk failed:', err.message);
      dispatch({ type: EXPENSE_ACTIONS.SET_LOADING, payload: false });
      throw err;
    }
  }, [fetchExpenses]);

  const clearExpenses = useCallback(() => {
    dispatch({ type: EXPENSE_ACTIONS.CLEAR_EXPENSES });
  }, []);

  return (
    <ExpenseContext.Provider
      value={{ state, dispatch, addExpense, deleteExpense, toggleBudgetExclude, importBulk, fetchExpenses, clearExpenses }}
    >
      {children}
    </ExpenseContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @returns {{ state, dispatch, addExpense, deleteExpense, toggleBudgetExclude, importBulk, fetchExpenses, clearExpenses }}
 */
export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) throw new Error('[useExpenses] Must be used within <ExpenseProvider>');
  return ctx;
}
