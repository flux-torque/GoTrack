/**
 * @file periodAnalytics.js
 * @description Pure utility functions for period-based financial analytics.
 * No React dependencies — all functions take plain data and return plain data.
 *
 * Supports three period types:
 *   - weekly    → Monday–Sunday weeks
 *   - monthly   → Calendar months
 *   - quarterly → Q1(Jan–Mar), Q2(Apr–Jun), Q3(Jul–Sep), Q4(Oct–Dec)
 *
 * v1.6: Used by usePeriodAnalytics hook and ExpensesPage analytics section.
 */

import {
  startOfWeek, endOfWeek, getWeek,
  startOfMonth, endOfMonth,
  startOfQuarter, endOfQuarter, getQuarter,
  addWeeks, addMonths, addQuarters,
  differenceInDays, parseISO,
  format,
} from 'date-fns';
import { CATEGORY_MAP } from '../constants';

// Week starts on Monday (ISO standard, relevant for India)
const WEEK_OPTIONS = { weekStartsOn: 1 };

// ---------------------------------------------------------------------------
// Types (JSDoc)
// ---------------------------------------------------------------------------

/**
 * @typedef {'weekly' | 'monthly' | 'quarterly'} PeriodType
 */

/**
 * @typedef {Object} PeriodKey
 * @property {string} key    - Unique string key (e.g. '2026-03', '2026-W09', '2026-Q1')
 * @property {string} label  - Human-readable label (e.g. 'March 2026', 'Week 9 · Feb 24 – Mar 2')
 * @property {Date}   start  - Period start date (inclusive, time=00:00:00)
 * @property {Date}   end    - Period end date (inclusive, time=23:59:59)
 */

/**
 * @typedef {Object} CategoryStat
 * @property {string} categoryId
 * @property {string} label
 * @property {string} hex
 * @property {number} amount
 * @property {number} pct    - Percentage of total expense in this period (0–100)
 */

/**
 * @typedef {Object} PeriodSummary
 * @property {number} income
 * @property {number} expense
 * @property {number} netFlow          - income - expense
 * @property {number} openingBalance   - Account balance at period start
 * @property {number} closingBalance   - Account balance at period end
 * @property {number} savingsRate      - (netFlow / income) × 100, capped 0–100
 * @property {number} avgDailySpend    - expense / daysInPeriod
 * @property {number} cashFlowScore    - 0–100 composite health score
 * @property {number} expenseTrend     - % change in expense vs previous period (+ = worse)
 * @property {CategoryStat[]} topCategories  - Top 3 expense categories
 * @property {number} txCount
 */

// ---------------------------------------------------------------------------
// Period key computation
// ---------------------------------------------------------------------------

/**
 * Returns a PeriodKey object for a given date and period type.
 *
 * @param {Date} date
 * @param {PeriodType} periodType
 * @returns {PeriodKey}
 */
export function getPeriodKey(date, periodType) {
  if (periodType === 'weekly') {
    const start = startOfWeek(date, WEEK_OPTIONS);
    const end   = endOfWeek(date, WEEK_OPTIONS);
    const week  = getWeek(date, WEEK_OPTIONS);
    const year  = format(start, 'yyyy');
    return {
      key:   `${year}-W${String(week).padStart(2, '0')}`,
      label: `Week ${week} · ${format(start, 'MMM d')} – ${format(end, 'MMM d')}`,
      start,
      end,
    };
  }

  if (periodType === 'monthly') {
    const start = startOfMonth(date);
    const end   = endOfMonth(date);
    return {
      key:   format(start, 'yyyy-MM'),
      label: format(start, 'MMMM yyyy'),
      start,
      end,
    };
  }

  // quarterly
  const start   = startOfQuarter(date);
  const end     = endOfQuarter(date);
  const quarter = getQuarter(date);
  const year    = format(start, 'yyyy');
  const qLabels = { 1: 'Jan–Mar', 2: 'Apr–Jun', 3: 'Jul–Sep', 4: 'Oct–Dec' };
  return {
    key:   `${year}-Q${quarter}`,
    label: `Q${quarter} ${year} (${qLabels[quarter]})`,
    start,
    end,
  };
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/**
 * Returns the adjacent period (previous or next) relative to the given period.
 *
 * @param {PeriodKey} currentPeriod
 * @param {'prev' | 'next'} direction
 * @param {PeriodType} periodType
 * @returns {PeriodKey}
 */
export function navigatePeriod(currentPeriod, direction, periodType) {
  const delta = direction === 'next' ? 1 : -1;
  let newAnchor;

  if (periodType === 'weekly') {
    newAnchor = addWeeks(currentPeriod.start, delta);
  } else if (periodType === 'monthly') {
    newAnchor = addMonths(currentPeriod.start, delta);
  } else {
    newAnchor = addQuarters(currentPeriod.start, delta);
  }

  return getPeriodKey(newAnchor, periodType);
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Filters expenses to only those falling within the given period.
 *
 * @param {import('../context/ExpenseContext').Expense[]} expenses
 * @param {PeriodKey} period
 * @returns {import('../context/ExpenseContext').Expense[]}
 */
export function filterExpensesByPeriod(expenses, period) {
  return expenses.filter((e) => {
    const d = parseISO(e.date);
    return d >= period.start && d <= period.end;
  });
}

// ---------------------------------------------------------------------------
// Balance computation for sub-periods
// ---------------------------------------------------------------------------

/**
 * Derives opening and closing balance for a sub-period from the running balance
 * stored on each imported expense.
 *
 * Strategy:
 *   closingBalance = balance of the last expense on or before period.end
 *   openingBalance = balance of the last expense strictly before period.start
 *                   Falls back to balanceMeta.openingBalance if no prior expense exists.
 *
 * Expenses with balance === 0 (manually added) are excluded from balance lookups.
 *
 * @param {import('../context/ExpenseContext').Expense[]} allExpenses
 * @param {PeriodKey} period
 * @param {import('../context/ExpenseContext').BalanceMeta} balanceMeta
 * @returns {{ openingBalance: number, closingBalance: number }}
 */
export function computeBalanceForPeriod(allExpenses, period, balanceMeta) {
  // Only consider expenses that have a real running balance (imported from statement)
  const withBalance = allExpenses
    .filter((e) => e.balance > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (withBalance.length === 0) {
    return { openingBalance: 0, closingBalance: 0 };
  }

  // Closing = last balance on or before period end
  const beforeOrAtEnd = withBalance.filter((e) => parseISO(e.date) <= period.end);
  const closingBalance = beforeOrAtEnd.length > 0
    ? beforeOrAtEnd[beforeOrAtEnd.length - 1].balance
    : 0;

  // Opening = last balance strictly before period start
  const beforeStart = withBalance.filter((e) => parseISO(e.date) < period.start);
  const openingBalance = beforeStart.length > 0
    ? beforeStart[beforeStart.length - 1].balance
    : (balanceMeta?.openingBalance ?? 0);

  return { openingBalance, closingBalance };
}

// ---------------------------------------------------------------------------
// Period summary
// ---------------------------------------------------------------------------

/**
 * Computes the full analytics summary for a period.
 *
 * @param {import('../context/ExpenseContext').Expense[]} periodExpenses - Pre-filtered to the period
 * @param {PeriodKey} period
 * @param {import('../context/ExpenseContext').Expense[]} allExpenses    - Full list (for balance lookups)
 * @param {import('../context/ExpenseContext').BalanceMeta} balanceMeta
 * @returns {PeriodSummary}
 */
export function computePeriodSummary(periodExpenses, period, allExpenses, balanceMeta) {
  const income  = periodExpenses.filter((e) => e.type === 'income').reduce((s, e)  => s + e.amount, 0);
  const expense = periodExpenses.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const netFlow = income - expense;

  const daysInPeriod = Math.max(1, differenceInDays(period.end, period.start) + 1);
  const savingsRate  = income > 0 ? Math.min(100, Math.round((netFlow / income) * 100)) : 0;
  const avgDailySpend = expense / daysInPeriod;

  const { openingBalance, closingBalance } = computeBalanceForPeriod(allExpenses, period, balanceMeta);

  // Top 3 categories by expense amount
  const catTotals = {};
  for (const e of periodExpenses.filter((e) => e.type === 'expense')) {
    catTotals[e.category] = (catTotals[e.category] ?? 0) + e.amount;
  }
  const topCategories = Object.entries(catTotals)
    .map(([id, amt]) => ({
      categoryId: id,
      label: CATEGORY_MAP[id]?.label ?? id,
      hex:   CATEGORY_MAP[id]?.hex   ?? '#6b7280',
      amount: amt,
      pct: expense > 0 ? Math.round((amt / expense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Cash Flow Stability Score (0–100)
  // 50 pts from savings rate (higher savings = better)
  // 50 pts from expense-to-income ratio consistency
  const savingsPts    = income > 0 ? Math.min(50, Math.max(0, savingsRate / 2)) : 0;
  const consistencyPts = income > 0
    ? Math.min(50, Math.max(0, 50 * (1 - Math.abs(expense / income - 0.5) * 2)))
    : 0;
  const cashFlowScore = Math.round(savingsPts + consistencyPts);

  return {
    income,
    expense,
    netFlow,
    openingBalance,
    closingBalance,
    savingsRate,
    avgDailySpend,
    cashFlowScore,
    expenseTrend: 0, // filled in by the hook via computeExpenseTrend
    topCategories,
    txCount: periodExpenses.length,
  };
}

// ---------------------------------------------------------------------------
// Expense trend
// ---------------------------------------------------------------------------

/**
 * Computes % change in expense for the current period vs the previous period.
 * Positive = spending increased (worse). Negative = spending decreased (better).
 *
 * @param {import('../context/ExpenseContext').Expense[]} allExpenses
 * @param {PeriodKey} currentPeriod
 * @param {PeriodType} periodType
 * @returns {number}
 */
export function computeExpenseTrend(allExpenses, currentPeriod, periodType) {
  const prevPeriod     = navigatePeriod(currentPeriod, 'prev', periodType);
  const currentExpense = filterExpensesByPeriod(allExpenses, currentPeriod)
    .filter((e) => e.type === 'expense')
    .reduce((s, e) => s + e.amount, 0);
  const prevExpense    = filterExpensesByPeriod(allExpenses, prevPeriod)
    .filter((e) => e.type === 'expense')
    .reduce((s, e) => s + e.amount, 0);

  if (prevExpense === 0) return currentExpense > 0 ? 100 : 0;
  return Math.round(((currentExpense - prevExpense) / prevExpense) * 100);
}

// ---------------------------------------------------------------------------
// Boundary detection
// ---------------------------------------------------------------------------

/**
 * Returns the earliest or latest PeriodKey that contains at least one transaction.
 * Used to prevent navigation beyond the data range.
 *
 * @param {import('../context/ExpenseContext').Expense[]} expenses
 * @param {PeriodType} periodType
 * @param {'earliest' | 'latest'} bound
 * @returns {PeriodKey | null}
 */
export function getBoundaryPeriod(expenses, periodType, bound) {
  if (!expenses.length) return null;

  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  const targetDate = bound === 'earliest'
    ? parseISO(sorted[0].date)
    : parseISO(sorted[sorted.length - 1].date);

  return getPeriodKey(targetDate, periodType);
}
