/**
 * @file salaryDetector.js
 * @description Detects Morgan Stanley salary credit events from a list of expenses
 * and derives salary periods (the span between one salary and the next).
 *
 * Salary detection logic:
 *   - Type must be 'income'
 *   - The `note` field must contain a Morgan Stanley keyword (case-insensitive)
 *   - Keywords: 'MORGAN STANLEY', 'MORGANSTANLEY', 'MORGAN-STANLEY'
 *
 * Period end date logic:
 *   - Confirmed period (next salary known): ends the day before next salary
 *   - Active period (no next salary yet):   ends on the last day of the calendar
 *     month following the salary month, minus 1 day.
 *     e.g. salary Feb 27 → end = Mar 30  (since Mar 31 is the expected next salary)
 *          salary Mar 31 → end = Apr 29  (since Apr 30 is the expected next salary)
 *
 * Period savings formula:
 *   savings = endBalance − preSalaryBalance
 *   where preSalaryBalance = running balance of the transaction just before salary,
 *   and   endBalance        = running balance of the last transaction in the period.
 *
 * v1.7 — initial implementation
 * v1.8 — fixed active period end: last day of next calendar month − 1
 */

import {
  parseISO, differenceInDays, format,
  startOfMonth, endOfMonth, addMonths, subDays,
} from 'date-fns';
import logger from './logger';

// ---------------------------------------------------------------------------
// Types (JSDoc)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} SalaryEvent
 * @property {string} id                  - Expense id of the salary transaction
 * @property {string} date                - YYYY-MM-DD date of salary credit
 * @property {number} salaryAmount        - Amount credited
 * @property {number} preSalaryBalance    - Account balance before this salary
 * @property {number} postSalaryBalance   - Account balance after salary
 * @property {string} description         - Full note/remark of the salary transaction
 */

/**
 * @typedef {Object} SalaryPeriod
 * @property {number}        index             - 0-based index (0 = first period)
 * @property {string}        label             - Human-readable label (e.g. 'Jan 2026')
 * @property {string}        startDate         - YYYY-MM-DD — salary credit date
 * @property {string}        endDate           - YYYY-MM-DD — projected/actual period end
 * @property {boolean}       isCurrent         - True if this is the active (latest) period
 * @property {number}        salaryAmount      - Income credited in this period
 * @property {number}        preSalaryBalance  - Balance before salary
 * @property {number}        postSalaryBalance - Balance right after salary
 * @property {number}        endBalance        - Balance at end of period
 * @property {number}        actualSavings     - endBalance − preSalaryBalance
 * @property {number}        totalExpenses     - Sum of all expense transactions in this period
 * @property {number}        daysInPeriod      - Total calendar days in period
 * @property {import('../context/ExpenseContext').Expense[]} expenses - All transactions in period
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Keywords used to detect Morgan Stanley salary NEFT credits */
const MORGAN_KEYWORDS = ['MORGAN STANLEY', 'MORGANSTANLEY', 'MORGAN-STANLEY', 'MORGAN_STANLEY'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the expense note matches a Morgan Stanley salary keyword.
 * Exported so budgetEngine can identify extra-income (non-MS) deposits.
 * @param {string} note
 * @returns {boolean}
 */
export function isMorganStanleySalary(note) {
  const upper = (note || '').toUpperCase();
  return MORGAN_KEYWORDS.some((kw) => upper.includes(kw));
}

/**
 * Computes the projected end date for an active (no-next-salary) period.
 * Logic: last day of the calendar month following the salary month, minus 1 day.
 * This assumes salary arrives on the last day of the next month.
 *
 * Examples:
 *   salary Feb 27 → endOfMonth(Mar) = Mar 31 → subDays(1) = Mar 30
 *   salary Mar 31 → endOfMonth(Apr) = Apr 30 → subDays(1) = Apr 29
 *
 * @param {string} salaryDate - YYYY-MM-DD
 * @returns {string} - YYYY-MM-DD
 */
function projectedPeriodEnd(salaryDate) {
  const d = parseISO(salaryDate);
  // First day of the month after salary month, then end of that month, then minus 1
  const nextMonthEnd = endOfMonth(addMonths(startOfMonth(d), 1));
  return format(subDays(nextMonthEnd, 1), 'yyyy-MM-dd');
}

/**
 * Finds the running balance of the last expense strictly BEFORE the given date.
 * Returns 0 if no such expense exists.
 *
 * @param {import('../context/ExpenseContext').Expense[]} sortedExpenses - Sorted ascending
 * @param {string} beforeDate - YYYY-MM-DD
 * @returns {number}
 */
function balanceJustBefore(sortedExpenses, beforeDate) {
  const prior = sortedExpenses.filter((e) => e.balance > 0 && e.date < beforeDate);
  if (!prior.length) return 0;
  return prior[prior.length - 1].balance;
}

/**
 * Finds the running balance of the last expense on or before the given date.
 * @param {import('../context/ExpenseContext').Expense[]} sortedExpenses - Sorted ascending
 * @param {string} onOrBeforeDate - YYYY-MM-DD
 * @returns {number}
 */
function balanceOnOrBefore(sortedExpenses, onOrBeforeDate) {
  const prior = sortedExpenses.filter((e) => e.balance > 0 && e.date <= onOrBeforeDate);
  if (!prior.length) return 0;
  return prior[prior.length - 1].balance;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Detects all Morgan Stanley NEFT salary credit events from the expense list.
 * Returns them sorted ascending by date.
 *
 * @param {import('../context/ExpenseContext').Expense[]} expenses
 * @returns {SalaryEvent[]}
 */
export function detectSalaryEvents(expenses) {
  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  const events = expenses
    .filter((e) => e.type === 'income' && isMorganStanleySalary(e.note))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({
      id: e.id,
      date: e.date,
      salaryAmount: e.amount,
      preSalaryBalance: balanceJustBefore(sorted, e.date),
      postSalaryBalance: e.balance,
      description: e.note,
    }));

  logger.info('[salaryDetector] detectSalaryEvents: found', events.length, 'salary events');
  return events;
}

/**
 * Splits the expense list into salary-anchored periods.
 *
 * Confirmed periods (next salary known): end day before next salary.
 * Active period (last one): ends on last day of next calendar month − 1,
 * representing the expected arrival date of the next salary.
 *
 * @param {import('../context/ExpenseContext').Expense[]} expenses
 * @returns {SalaryPeriod[]}
 */
export function detectSalaryPeriods(expenses) {
  if (!expenses.length) return [];

  const salaryEvents = detectSalaryEvents(expenses);
  if (!salaryEvents.length) {
    logger.warn('[salaryDetector] No salary events found — cannot build periods');
    return [];
  }

  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));

  const periods = salaryEvents.map((event, i) => {
    const startDate = event.date;
    const nextSalary = salaryEvents[i + 1];
    const isCurrent = !nextSalary;

    // End date logic:
    //   Confirmed → day before next salary
    //   Active    → last day of next calendar month − 1 (projected)
    let endDate;
    if (nextSalary) {
      const d = parseISO(nextSalary.date);
      d.setDate(d.getDate() - 1);
      endDate = format(d, 'yyyy-MM-dd');
    } else {
      endDate = projectedPeriodEnd(startDate);
    }

    // endBalance = latest balance within this period's date range
    const endBalance = nextSalary
      ? balanceJustBefore(sorted, nextSalary.date)
      : balanceOnOrBefore(sorted, endDate);

    // Collect all transactions within this period
    const periodExpenses = sorted.filter(
      (e) => e.date >= startDate && e.date <= endDate
    );
    const totalExpenses = periodExpenses
      .filter((e) => e.type === 'expense')
      .reduce((s, e) => s + e.amount, 0);

    const actualSavings = endBalance - event.preSalaryBalance;
    const daysInPeriod = Math.max(1, differenceInDays(parseISO(endDate), parseISO(startDate)) + 1);

    logger.info(
      `[salaryDetector] Period ${i}: ${startDate} → ${endDate}`,
      `| salary: ${event.salaryAmount} | savings: ${actualSavings} | days: ${daysInPeriod}`
    );

    return {
      index: i,
      label: format(parseISO(startDate), 'MMM yyyy'),
      startDate,
      endDate,
      isCurrent,
      salaryAmount: event.salaryAmount,
      preSalaryBalance: event.preSalaryBalance,
      postSalaryBalance: event.postSalaryBalance,
      endBalance,
      actualSavings,
      totalExpenses,
      daysInPeriod,
      expenses: periodExpenses,
    };
  });

  logger.info('[salaryDetector] detectSalaryPeriods: built', periods.length, 'periods');
  return periods;
}
