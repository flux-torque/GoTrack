/**
 * @file ExpenseContext.jsx
 * @description React Context + useReducer for expense state management.
 * Provides expenses, balanceMeta, and dispatch to the entire app.
 *
 * v1.5 note: Data is in-memory only — no localStorage persistence.
 * Importing a bank statement replaces the expense list for the current session.
 * Refreshing the page resets to empty state.
 *
 * v1.6 additions:
 *  - Expense now carries an optional `balance` field (running account balance)
 *  - `balanceMeta` in state stores openingBalance, closingBalance, statement date range
 *  - IMPORT_TRANSACTIONS now accepts a ParseResult (not a flat array)
 *
 * Actions:
 *  - ADD_EXPENSE            → adds a single new expense entry
 *  - DELETE_EXPENSE         → removes an expense by id
 *  - LOAD_EXPENSES          → replaces state with a given array (internal use)
 *  - IMPORT_TRANSACTIONS    → replaces entire list with bank-parsed transactions + sets balanceMeta
 *  - CLEAR_EXPENSES         → resets list and balanceMeta to initial state
 *  - TOGGLE_BUDGET_EXCLUDE  → toggles budgetExcluded flag on a transaction by id
 *                             Excluded transactions are invisible to budget calculations
 *                             but still appear in the Expenses page and Analysis tab.
 */

import { createContext, useContext, useReducer } from 'react';
import { format } from 'date-fns';
import { detectCategory } from '../utils/categoryDetector';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Action Types
// ---------------------------------------------------------------------------

export const EXPENSE_ACTIONS = {
  ADD_EXPENSE: 'ADD_EXPENSE',
  DELETE_EXPENSE: 'DELETE_EXPENSE',
  LOAD_EXPENSES: 'LOAD_EXPENSES',
  IMPORT_TRANSACTIONS: 'IMPORT_TRANSACTIONS',
  CLEAR_EXPENSES: 'CLEAR_EXPENSES',
  TOGGLE_BUDGET_EXCLUDE: 'TOGGLE_BUDGET_EXCLUDE',
};

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Expense
 * @property {string} id              - Unique identifier
 * @property {string} title           - Short display name (first ~40 chars of description)
 * @property {string} note            - Full transaction remarks
 * @property {string} category        - Category id from CATEGORIES constants
 * @property {'expense'|'income'} type
 * @property {number} amount          - Amount in INR
 * @property {string} date            - ISO date string YYYY-MM-DD
 * @property {number} [balance]       - Running account balance after this transaction (0 for manual entries)
 * @property {boolean} budgetExcluded - When true, this transaction is excluded from budget
 *                                      calculations (spending limit, projections, insights).
 *                                      Does NOT affect Analysis / Dashboard tabs.
 */

/**
 * @typedef {Object} BalanceMeta
 * @property {number} openingBalance  - Reconstructed balance before first statement transaction
 * @property {number} closingBalance  - Balance after last (most recent) statement transaction
 * @property {string|null} statementFrom  - YYYY-MM-DD of earliest transaction in statement
 * @property {string|null} statementTo    - YYYY-MM-DD of latest transaction in statement
 */

/**
 * @typedef {Object} ExpenseState
 * @property {Expense[]} expenses
 * @property {BalanceMeta} balanceMeta
 */

const EMPTY_BALANCE_META = {
  openingBalance: 0,
  closingBalance: 0,
  statementFrom: null,
  statementTo: null,
};

/** @type {ExpenseState} */
const initialState = {
  expenses: [],
  balanceMeta: { ...EMPTY_BALANCE_META },
};

/**
 * Converts a raw ParsedTransaction (from bank parsers) into the Expense format.
 * Assigns a unique id, truncates description to a title, and passes through balance.
 *
 * @param {import('../utils/bankParsers/iciciParser').ParsedTransaction} tx
 * @param {number} index - Used to generate a unique id
 * @returns {Expense}
 */
function parsedTxToExpense(tx, index) {
  const fullDesc = tx.description || 'Unknown';
  const title = fullDesc.split('/')[0].trim().slice(0, 40) || fullDesc.slice(0, 40);

  return {
    id: `import-${Date.now()}-${index}`,
    title,
    note: fullDesc,
    category: tx.categoryId || detectCategory(fullDesc),
    type: tx.type,
    amount: tx.amount,
    date: format(tx.date, 'yyyy-MM-dd'),
    balance: tx.balance ?? 0,
    budgetExcluded: false,
  };
}

/**
 * Expense state reducer.
 * @param {ExpenseState} state
 * @param {{ type: string, payload: any }} action
 * @returns {ExpenseState}
 */
function expenseReducer(state, action) {
  switch (action.type) {
    case EXPENSE_ACTIONS.LOAD_EXPENSES:
      logger.info('[ExpenseContext] LOAD_EXPENSES:', action.payload.length);
      return { ...state, expenses: action.payload };

    case EXPENSE_ACTIONS.ADD_EXPENSE: {
      const updated = [action.payload, ...state.expenses];
      logger.info('[ExpenseContext] ADD_EXPENSE:', action.payload.title);
      return { ...state, expenses: updated };
    }

    case EXPENSE_ACTIONS.DELETE_EXPENSE: {
      const filtered = state.expenses.filter((e) => e.id !== action.payload);
      logger.warn('[ExpenseContext] DELETE_EXPENSE id:', action.payload);
      return { ...state, expenses: filtered };
    }

    case EXPENSE_ACTIONS.IMPORT_TRANSACTIONS: {
      /** @type {import('../utils/bankParsers/index').ParseResult} */
      const { transactions: rawTxs, openingBalance, closingBalance } = action.payload;
      const expenses = rawTxs.map((tx, i) => parsedTxToExpense(tx, i));

      const dates = expenses.map((e) => e.date).sort();
      const balanceMeta = {
        openingBalance: openingBalance ?? 0,
        closingBalance: closingBalance ?? 0,
        statementFrom: dates[0] ?? null,
        statementTo: dates[dates.length - 1] ?? null,
      };

      logger.info(
        '[ExpenseContext] IMPORT_TRANSACTIONS:', expenses.length,
        'entries | opening:', balanceMeta.openingBalance,
        '| closing:', balanceMeta.closingBalance
      );
      return { ...state, expenses, balanceMeta };
    }

    case EXPENSE_ACTIONS.CLEAR_EXPENSES:
      logger.warn('[ExpenseContext] CLEAR_EXPENSES: resetting to empty');
      return { ...initialState, balanceMeta: { ...EMPTY_BALANCE_META } };

    case EXPENSE_ACTIONS.TOGGLE_BUDGET_EXCLUDE: {
      const updated = state.expenses.map((e) =>
        e.id === action.payload ? { ...e, budgetExcluded: !e.budgetExcluded } : e
      );
      const target = state.expenses.find((e) => e.id === action.payload);
      logger.info(
        '[ExpenseContext] TOGGLE_BUDGET_EXCLUDE id:', action.payload,
        '| now excluded:', !target?.budgetExcluded
      );
      return { ...state, expenses: updated };
    }

    default:
      logger.warn('[ExpenseContext] Unknown action type:', action.type);
      return state;
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ExpenseContext = createContext(null);

/**
 * ExpenseProvider — wraps the app and provides expense state + dispatch.
 * v1.5: Starts empty. Data is populated via IMPORT_TRANSACTIONS (bank upload).
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function ExpenseProvider({ children }) {
  const [state, dispatch] = useReducer(expenseReducer, initialState);

  return (
    <ExpenseContext.Provider value={{ state, dispatch }}>
      {children}
    </ExpenseContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Custom hook
// ---------------------------------------------------------------------------

/**
 * Hook to access expense context. Must be used inside <ExpenseProvider>.
 * @returns {{ state: ExpenseState, dispatch: React.Dispatch }}
 */
export function useExpenses() {
  const ctx = useContext(ExpenseContext);
  if (!ctx) {
    throw new Error('[useExpenses] Must be used within an <ExpenseProvider>');
  }
  return ctx;
}
