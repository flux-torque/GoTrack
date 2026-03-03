/**
 * @file budgetEngine.js
 * @description Pure calculation engine for the Budget tab (v3 — simple monthly model).
 * No salary tracking. No period detection. Just: budget vs actual spend for a month.
 *
 * Core model:
 *   spendingPower   = monthlyBudget + optedInCashInflows
 *   totalSpent      = sum of opted-in expense transactions in the budget month
 *   remaining       = spendingPower − totalSpent
 *   burnRate        = totalSpent / daysElapsed
 *   projectedSpend  = burnRate × daysInMonth
 *
 * Budget status is derived from projectedSpend vs spendingPower:
 *   < 80%   → Cruising    (well under budget)
 *   80–100% → On Track    (will land within budget)
 *   100–115%→ Pacing      (slightly over, rein in now)
 *   115–135%→ Heads Up    (meaningfully over pace)
 *   135–160%→ At Risk     (significant overspend)
 *   >160%   → Danger Zone (far above budget)
 *
 * v3: Initial implementation (no salary detector dependency).
 */

import {
  parseISO, format, eachDayOfInterval, differenceInDays, getDay, endOfMonth,
} from 'date-fns';
import logger from './logger';

// ---------------------------------------------------------------------------
// Types (JSDoc)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} BudgetStatus
 * @property {string} label
 * @property {string} description
 * @property {string} colorClass   - Tailwind text color
 * @property {string} bgClass      - Tailwind bg color
 * @property {string} barClass     - Tailwind bg color for progress bar fill
 * @property {string} borderClass  - Tailwind border color
 * @property {number} level        - 0=best … 5=worst
 */

/**
 * @typedef {Object} MonthlyBudgetMetrics
 * @property {string}       budgetMonth         - YYYY-MM of the tracked month
 * @property {string}       startDate           - First day of the month (YYYY-MM-DD)
 * @property {string}       endDate             - Last day of the month (YYYY-MM-DD)
 * @property {number}       monthlyBudget       - User-set spending limit
 * @property {number}       cashInflows         - Opted-in income in the month
 * @property {number}       spendingPower       - monthlyBudget + cashInflows (= spendableBudget alias)
 * @property {number}       spendableBudget     - Alias of spendingPower (backwards-compat)
 * @property {number}       totalSpent          - Opted-in expenses in the month
 * @property {number}       totalSpentInPeriod  - Alias of totalSpent (backwards-compat)
 * @property {number}       remaining           - spendingPower − totalSpent
 * @property {number}       moneyLeftToSpend    - Alias of remaining (backwards-compat)
 * @property {number}       burnRate            - Avg daily spend so far
 * @property {number}       safeToSpendToday    - remaining / daysRemaining
 * @property {number}       projectedSpend      - burnRate × daysInMonth
 * @property {number}       projectedTotalSpend - Alias of projectedSpend (backwards-compat)
 * @property {number}       projectedRemaining  - spendingPower − projectedSpend
 * @property {number}       projectedSavings    - Alias of projectedRemaining (backwards-compat)
 * @property {number}       daysInMonth         - Calendar days in month
 * @property {number}       daysInPeriod        - Alias of daysInMonth (backwards-compat)
 * @property {number}       daysElapsed         - Days since start of month (capped to today)
 * @property {number}       daysRemaining       - daysInMonth − daysElapsed
 * @property {number}       budgetUsedPct       - totalSpent / spendingPower × 100
 * @property {BudgetStatus} status
 */

/**
 * @typedef {Object} DailyDataPoint
 * @property {string}  date       - YYYY-MM-DD
 * @property {string}  label      - e.g. 'Mar 15'
 * @property {number}  cumSpend   - Cumulative spend up to this day
 * @property {number}  dailySpend - Spend on this specific day
 * @property {boolean} isFuture   - True if after today (projected)
 */

/**
 * @typedef {Object} MonthlyBudgetInsights
 * @property {{ date: string, amount: number } | null} topSpendingDay
 * @property {import('../context/ExpenseContext').Expense | null} largestTransaction
 * @property {number} essentialAmt
 * @property {number} discretionaryAmt
 * @property {number} essentialPct
 * @property {number} weekendAmt
 * @property {number} weekdayAmt
 * @property {number} weekendPct
 * @property {Object} paymentTypeSplit  - { [type]: { amount, count, pct } }
 * @property {number} firstHalfAmt     - Spend in days 1–15
 * @property {number} secondHalfAmt    - Spend in days 16–end
 * @property {number} avgDailySpend
 * @property {number} spendVariance
 * @property {boolean} isHighVariance
 * @property {number} totalExpense
 * @property {number} txCount
 */

// ---------------------------------------------------------------------------
// Status zones
// ---------------------------------------------------------------------------

/** @type {BudgetStatus[]} Ordered best → worst */
const STATUS_ZONES = [
  {
    label: 'Cruising',
    description: "You're spending well under budget — great discipline!",
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    barClass: 'bg-emerald-500',
    borderClass: 'border-emerald-200',
    level: 0,
  },
  {
    label: 'On Track',
    description: 'Spending is on pace with your budget — keep it steady.',
    colorClass: 'text-green-700',
    bgClass: 'bg-green-50',
    barClass: 'bg-green-500',
    borderClass: 'border-green-200',
    level: 1,
  },
  {
    label: 'Pacing',
    description: 'Slightly over pace — a few cutbacks will keep you on track.',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    barClass: 'bg-amber-500',
    borderClass: 'border-amber-200',
    level: 2,
  },
  {
    label: 'Heads Up',
    description: "You're spending faster than your budget allows — pull back now.",
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-50',
    barClass: 'bg-orange-500',
    borderClass: 'border-orange-200',
    level: 3,
  },
  {
    label: 'At Risk',
    description: 'Significant overspend — hard to recover without big cuts.',
    colorClass: 'text-rose-700',
    bgClass: 'bg-rose-50',
    barClass: 'bg-rose-500',
    borderClass: 'border-rose-200',
    level: 4,
  },
  {
    label: 'Danger Zone',
    description: 'Budget ceiling is out of reach at current spend rate.',
    colorClass: 'text-red-700',
    bgClass: 'bg-red-50',
    barClass: 'bg-red-600',
    borderClass: 'border-red-200',
    level: 5,
  },
];

export { STATUS_ZONES };

// ---------------------------------------------------------------------------
// Status resolver
// ---------------------------------------------------------------------------

/**
 * Maps projected spend vs spending power into a status zone.
 *
 * @param {number} projectedSpend
 * @param {number} spendingPower
 * @returns {BudgetStatus}
 */
export function getBudgetStatus(projectedSpend, spendingPower) {
  if (spendingPower <= 0) return STATUS_ZONES[1];
  const ratio = projectedSpend / spendingPower;
  if (ratio < 0.80) return STATUS_ZONES[0]; // Cruising
  if (ratio < 1.00) return STATUS_ZONES[1]; // On Track
  if (ratio < 1.15) return STATUS_ZONES[2]; // Pacing
  if (ratio < 1.35) return STATUS_ZONES[3]; // Heads Up
  if (ratio < 1.60) return STATUS_ZONES[4]; // At Risk
  return STATUS_ZONES[5];                   // Danger Zone
}

// ---------------------------------------------------------------------------
// Month helpers
// ---------------------------------------------------------------------------

/**
 * Finds the most relevant budget month from the expense list.
 * Prefers the current calendar month if it has data; otherwise uses the
 * most recent month that has transactions.
 *
 * @param {import('../context/ExpenseContext').Expense[]} expenses
 * @returns {string} YYYY-MM
 */
export function getBudgetMonth(expenses) {
  const today = format(new Date(), 'yyyy-MM');
  if (!expenses.length) return today;
  const hasCurrentMonth = expenses.some((e) => e.date.startsWith(today));
  if (hasCurrentMonth) return today;
  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0].date.substring(0, 7);
}

// ---------------------------------------------------------------------------
// Core monthly metrics
// ---------------------------------------------------------------------------

/**
 * Computes all monthly budget metrics from the expense list.
 * Opted-out transactions (budgetExcluded = true) are invisible here.
 * Any opted-in income adds to spendingPower on top of the monthlyBudget.
 *
 * @param {import('../context/ExpenseContext').Expense[]} expenses - All imported transactions
 * @param {number} monthlyBudget - User-set spending limit for the month
 * @param {string} budgetMonth   - YYYY-MM (from getBudgetMonth)
 * @returns {MonthlyBudgetMetrics}
 */
export function computeMonthlyBudgetMetrics(expenses, monthlyBudget, budgetMonth) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const startDate = `${budgetMonth}-01`;
  const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd');

  // Filter to this month, exclude opted-out transactions
  const monthExpenses = expenses.filter(
    (e) => e.date >= startDate && e.date <= endDate && !e.budgetExcluded
  );

  // Cash inflows (credited amounts) add to spending room
  const cashInflows = monthExpenses
    .filter((e) => e.type === 'income')
    .reduce((s, e) => s + e.amount, 0);

  // Total spent = opted-in debits in the month
  const totalSpent = monthExpenses
    .filter((e) => e.type === 'expense')
    .reduce((s, e) => s + e.amount, 0);

  const spendingPower = Math.max(0, monthlyBudget + cashInflows);
  const remaining = spendingPower - totalSpent;

  // Days math — capped to today if we're mid-month
  const daysInMonth = differenceInDays(parseISO(endDate), parseISO(startDate)) + 1;
  const daysElapsed = Math.min(
    daysInMonth,
    Math.max(1, differenceInDays(parseISO(today), parseISO(startDate)) + 1)
  );
  const daysRemaining = Math.max(0, daysInMonth - daysElapsed);

  const burnRate = daysElapsed > 0 ? totalSpent / daysElapsed : 0;
  const safeToSpendToday = daysRemaining > 0 ? Math.max(0, remaining / daysRemaining) : 0;
  const projectedSpend = burnRate * daysInMonth;
  const projectedRemaining = spendingPower - projectedSpend;

  const budgetUsedPct = spendingPower > 0
    ? Math.round((totalSpent / spendingPower) * 100)
    : 0;

  const status = getBudgetStatus(projectedSpend, spendingPower);

  logger.info(
    '[budgetEngine] Monthly metrics | month:', budgetMonth,
    '| spent:', Math.round(totalSpent),
    '| power:', Math.round(spendingPower),
    '| remaining:', Math.round(remaining),
    '| status:', status.label
  );

  return {
    budgetMonth,
    startDate,
    endDate,
    monthlyBudget,
    cashInflows,
    // Primary names
    spendingPower,
    totalSpent,
    remaining,
    burnRate,
    safeToSpendToday,
    projectedSpend,
    projectedRemaining,
    daysInMonth,
    daysElapsed,
    daysRemaining,
    budgetUsedPct,
    status,
    // Backwards-compat aliases (used by BudgetStatusBar, BudgetStatCard, SpendingPaceChart)
    spendableBudget:    spendingPower,
    totalSpentInPeriod: totalSpent,
    moneyLeftToSpend:   remaining,
    projectedTotalSpend: projectedSpend,
    projectedSavings:   projectedRemaining,
    daysInPeriod:       daysInMonth,
  };
}

// ---------------------------------------------------------------------------
// Daily spending timeline
// ---------------------------------------------------------------------------

/**
 * Builds a day-by-day cumulative spending array for the budget month.
 * Past days = actual; future days = projected at burnRate.
 * Opted-out transactions are skipped automatically (already excluded from periodExpenses).
 *
 * @param {import('../context/ExpenseContext').Expense[]} periodExpenses - Month expenses (not opted-out)
 * @param {string} periodStart - YYYY-MM-DD
 * @param {string} periodEnd   - YYYY-MM-DD
 * @param {number} burnRate    - Avg daily spend for projection
 * @returns {DailyDataPoint[]}
 */
export function buildDailySpendingTimeline(periodExpenses, periodStart, periodEnd, burnRate) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const start = parseISO(periodStart);
  const end = parseISO(periodEnd);

  // Build daily totals map — only expense-type, exclude opted-out
  const dailyMap = {};
  for (const e of periodExpenses) {
    if (e.type !== 'expense' || e.budgetExcluded) continue;
    dailyMap[e.date] = (dailyMap[e.date] ?? 0) + e.amount;
  }

  const days = eachDayOfInterval({ start, end });
  let cumSpend = 0;

  const timeline = days.map((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const isFuture = dateStr > today;
    const dailySpend = isFuture ? burnRate : (dailyMap[dateStr] ?? 0);
    cumSpend += dailySpend;

    return {
      date: dateStr,
      label: format(day, 'MMM d'),
      cumSpend: Math.round(cumSpend),
      dailySpend: Math.round(dailySpend),
      isFuture,
    };
  });

  logger.info('[budgetEngine] buildDailySpendingTimeline:', timeline.length, 'days');
  return timeline;
}

// ---------------------------------------------------------------------------
// Monthly insights
// ---------------------------------------------------------------------------

const ESSENTIAL_CATEGORIES = new Set(['food', 'transport', 'rent', 'health', 'utilities']);

/**
 * Computes smart insights for the budget month.
 *
 * @param {import('../context/ExpenseContext').Expense[]} expenses - All transactions
 * @param {string} budgetMonth - YYYY-MM
 * @returns {MonthlyBudgetInsights}
 */
export function computeMonthlyBudgetInsights(expenses, budgetMonth) {
  const startDate = `${budgetMonth}-01`;
  const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd');

  // Only budget-tracked expenses
  const monthExpenses = expenses.filter(
    (e) => e.date >= startDate && e.date <= endDate && e.type === 'expense' && !e.budgetExcluded
  );
  const totalExpense = monthExpenses.reduce((s, e) => s + e.amount, 0);

  // 1. Peak spending day
  const dailyMap = {};
  for (const e of monthExpenses) {
    dailyMap[e.date] = (dailyMap[e.date] ?? 0) + e.amount;
  }
  const sortedDays = Object.entries(dailyMap).sort((a, b) => b[1] - a[1]);
  const topSpendingDay = sortedDays[0]
    ? { date: sortedDays[0][0], amount: sortedDays[0][1] }
    : null;

  // 2. Largest single transaction
  const largestTransaction = monthExpenses.length > 0
    ? [...monthExpenses].sort((a, b) => b.amount - a.amount)[0]
    : null;

  // 3. Essential vs Discretionary
  const essentialAmt = monthExpenses
    .filter((e) => ESSENTIAL_CATEGORIES.has(e.category))
    .reduce((s, e) => s + e.amount, 0);
  const discretionaryAmt = totalExpense - essentialAmt;
  const essentialPct = totalExpense > 0 ? Math.round((essentialAmt / totalExpense) * 100) : 0;

  // 4. Weekend vs Weekday
  let weekendAmt = 0;
  for (const e of monthExpenses) {
    const day = getDay(parseISO(e.date)); // 0=Sun, 6=Sat
    if (day === 0 || day === 6) weekendAmt += e.amount;
  }
  const weekdayAmt = totalExpense - weekendAmt;
  const weekendPct = totalExpense > 0 ? Math.round((weekendAmt / totalExpense) * 100) : 0;

  // 5. Payment type split (using note field directly)
  const paymentTypeSplit = {};
  for (const e of monthExpenses) {
    // Inline detection to avoid circular import
    const n = (e.note || '').toUpperCase();
    let type = 'Other';
    if (n.includes('UPI')) type = 'UPI';
    else if (n.includes('NEFT')) type = 'NEFT';
    else if (n.includes('IMPS')) type = 'IMPS';
    else if (n.includes('RTGS')) type = 'RTGS';
    else if (n.includes('ATM')) type = 'ATM';
    else if (n.includes('POS') || n.includes('DEBIT CARD')) type = 'Card';
    else if (n.includes('ECS') || n.includes('NACH') || n.includes('ACH')) type = 'Auto-Debit';

    if (!paymentTypeSplit[type]) paymentTypeSplit[type] = { amount: 0, count: 0, pct: 0 };
    paymentTypeSplit[type].amount += e.amount;
    paymentTypeSplit[type].count += 1;
  }
  // Compute pct for each type
  for (const type of Object.keys(paymentTypeSplit)) {
    paymentTypeSplit[type].amount = Math.round(paymentTypeSplit[type].amount);
    paymentTypeSplit[type].pct = totalExpense > 0
      ? Math.round((paymentTypeSplit[type].amount / totalExpense) * 100)
      : 0;
  }

  // 6. First half vs Second half of month
  let firstHalfAmt = 0;
  let secondHalfAmt = 0;
  for (const e of monthExpenses) {
    const day = parseInt(e.date.split('-')[2], 10);
    if (day <= 15) firstHalfAmt += e.amount;
    else secondHalfAmt += e.amount;
  }

  // 7. Daily variance (for consistency banner)
  const dailyAmounts = Object.values(dailyMap);
  const avgDailySpend = dailyAmounts.length > 0
    ? dailyAmounts.reduce((s, v) => s + v, 0) / dailyAmounts.length
    : 0;
  const variance = dailyAmounts.length > 1
    ? Math.sqrt(
        dailyAmounts.reduce((s, v) => s + (v - avgDailySpend) ** 2, 0) / dailyAmounts.length
      )
    : 0;

  logger.info('[budgetEngine] computeMonthlyBudgetInsights for month:', budgetMonth);

  return {
    topSpendingDay,
    largestTransaction,
    essentialAmt: Math.round(essentialAmt),
    discretionaryAmt: Math.round(discretionaryAmt),
    essentialPct,
    weekendAmt: Math.round(weekendAmt),
    weekdayAmt: Math.round(weekdayAmt),
    weekendPct,
    paymentTypeSplit,
    firstHalfAmt: Math.round(firstHalfAmt),
    secondHalfAmt: Math.round(secondHalfAmt),
    avgDailySpend: Math.round(avgDailySpend),
    spendVariance: Math.round(variance),
    isHighVariance: avgDailySpend > 0 && variance > avgDailySpend * 0.8,
    totalExpense: Math.round(totalExpense),
    txCount: monthExpenses.length,
  };
}
