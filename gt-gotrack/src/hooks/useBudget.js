/**
 * @file useBudget.js
 * @description Combined hook — merges expense data + budget settings into a
 * single ready-to-render budget state for the Budget tab.
 *
 * Derives (all memoized):
 *   budgetMonth        → YYYY-MM of the relevant month (current or most recent with data)
 *   activeMonthBudget  → effective spending limit for budgetMonth (month-specific or default)
 *   metrics            → MonthlyBudgetMetrics for budgetMonth
 *   dailyTimeline      → day-by-day cumulative spend for the pace chart
 *   insights           → smart analysis for the month
 *   hasData            → any transactions imported?
 *   isConfigured       → user has set any budget (default or month-specific)?
 *
 * Also exposes:
 *   defaultBudget      → global fallback budget
 *   monthlyBudgets     → { [YYYY-MM]: number } per-month overrides map
 *   getBudgetFor(month) → resolve effective budget for any month
 *
 * v4: Per-month budget support — resolves effective budget via getBudgetForMonth().
 */

import { useMemo } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import { useBudgetSettings, getBudgetForMonth } from '../context/BudgetContext';
import {
  getBudgetMonth,
  computeMonthlyBudgetMetrics,
  buildDailySpendingTimeline,
  computeMonthlyBudgetInsights,
} from '../utils/budgetEngine';
import logger from '../utils/logger';

/**
 * @typedef {Object} BudgetState
 * @property {boolean} hasData
 * @property {boolean} isConfigured
 * @property {number | null} defaultBudget
 * @property {{ [month: string]: number }} monthlyBudgets
 * @property {number | null} activeMonthBudget          - Effective budget for budgetMonth
 * @property {number | null} monthlyBudget              - Alias for activeMonthBudget (backwards compat)
 * @property {string} budgetMonth                       - YYYY-MM
 * @property {import('../utils/budgetEngine').MonthlyBudgetMetrics | null} metrics
 * @property {import('../utils/budgetEngine').DailyDataPoint[]} dailyTimeline
 * @property {import('../utils/budgetEngine').MonthlyBudgetInsights | null} insights
 * @property {(month: string) => number | null} getBudgetFor
 */

/**
 * Returns the complete budget state derived from expenses + budget settings.
 * @returns {BudgetState}
 */
export function useBudget() {
  const { state: { expenses } } = useExpenses();
  const { settings } = useBudgetSettings();
  const { defaultBudget, monthlyBudgets, budgetConfigured } = settings;

  const hasData = expenses.length > 0;

  // Most relevant month (current calendar month, or most recent month with data)
  const budgetMonth = useMemo(() => {
    const month = getBudgetMonth(expenses);
    logger.info('[useBudget] budgetMonth:', month);
    return month;
  }, [expenses]);

  // Effective budget for the auto-detected month
  const activeMonthBudget = useMemo(
    () => getBudgetForMonth(settings, budgetMonth),
    [settings, budgetMonth]
  );

  // Monthly metrics — only when configured + effective budget set + data exists
  const metrics = useMemo(() => {
    if (!budgetConfigured || activeMonthBudget === null || !hasData) return null;
    return computeMonthlyBudgetMetrics(expenses, activeMonthBudget, budgetMonth);
  }, [expenses, budgetConfigured, activeMonthBudget, budgetMonth, hasData]);

  // Daily cumulative spending timeline for the pace chart
  const dailyTimeline = useMemo(() => {
    if (!metrics) return [];
    const monthExpenses = expenses.filter(
      (e) => e.date >= metrics.startDate && e.date <= metrics.endDate && !e.budgetExcluded
    );
    return buildDailySpendingTimeline(
      monthExpenses,
      metrics.startDate,
      metrics.endDate,
      metrics.burnRate
    );
  }, [expenses, metrics]);

  // Smart insights for the budget month
  const insights = useMemo(() => {
    if (!hasData) return null;
    return computeMonthlyBudgetInsights(expenses, budgetMonth);
  }, [expenses, budgetMonth, hasData]);

  /** Resolve effective spending limit for any month (month-specific → default → null) */
  const getBudgetFor = (month) => getBudgetForMonth(settings, month);

  return {
    hasData,
    isConfigured: budgetConfigured,
    defaultBudget,
    monthlyBudgets,
    activeMonthBudget,
    monthlyBudget: activeMonthBudget, // backwards-compat alias (used by HomePage widget)
    budgetMonth,
    metrics,
    dailyTimeline,
    insights,
    getBudgetFor,
  };
}
