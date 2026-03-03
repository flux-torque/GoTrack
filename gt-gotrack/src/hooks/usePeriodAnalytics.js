/**
 * @file usePeriodAnalytics.js
 * @description React hook for period-based financial analytics.
 *
 * Manages:
 *   - periodType: 'weekly' | 'monthly' | 'quarterly'
 *   - currentPeriod: the active PeriodKey (auto-anchors to latest transaction date)
 *   - Navigation controls: goToPrev, goToNext, with boundary enforcement
 *   - Derived summary: income, expense, netFlow, balances, smart indicators
 *
 * Automatically resets to the default period when periodType changes or
 * when a new set of expenses is imported.
 *
 * v1.6
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useExpenses } from '../context/ExpenseContext';
import {
  getPeriodKey,
  navigatePeriod,
  filterExpensesByPeriod,
  computePeriodSummary,
  computeExpenseTrend,
  getBoundaryPeriod,
} from '../utils/periodAnalytics';
import logger from '../utils/logger';

/**
 * Hook providing period navigation and financial analytics for the Expenses page.
 *
 * @param {'weekly'|'monthly'|'quarterly'} [initialPeriodType='monthly']
 * @returns {{
 *   periodType: import('../utils/periodAnalytics').PeriodType,
 *   setPeriodType: (t: string) => void,
 *   currentPeriod: import('../utils/periodAnalytics').PeriodKey,
 *   goToPrev: () => void,
 *   goToNext: () => void,
 *   canGoPrev: boolean,
 *   canGoNext: boolean,
 *   summary: import('../utils/periodAnalytics').PeriodSummary | null,
 *   periodExpenses: import('../context/ExpenseContext').Expense[],
 * }}
 */
export function usePeriodAnalytics(initialPeriodType = 'monthly') {
  const { state } = useExpenses();
  const { expenses, balanceMeta } = state;

  const [periodType, setPeriodTypeState] = useState(initialPeriodType);
  const [currentPeriod, setCurrentPeriod] = useState(null);

  // Track the expenses list identity to detect imports (clear navigation on new data)
  const expensesRef = useRef(expenses);
  useEffect(() => {
    if (expensesRef.current !== expenses) {
      expensesRef.current = expenses;
      setCurrentPeriod(null); // reset to default period when data changes
    }
  }, [expenses]);

  // Default period anchors to the most recent transaction date (not system clock)
  const defaultPeriod = useMemo(() => {
    if (!expenses.length) return getPeriodKey(new Date(), periodType);
    const latestDate = [...expenses].sort((a, b) => b.date.localeCompare(a.date))[0].date;
    return getPeriodKey(new Date(latestDate + 'T00:00:00'), periodType);
  }, [expenses, periodType]);

  const activePeriod = currentPeriod ?? defaultPeriod;

  // Boundary periods (earliest / latest that have data)
  const earliestPeriod = useMemo(() => getBoundaryPeriod(expenses, periodType, 'earliest'), [expenses, periodType]);
  const latestPeriod   = useMemo(() => getBoundaryPeriod(expenses, periodType, 'latest'),   [expenses, periodType]);

  const canGoPrev = earliestPeriod ? activePeriod.key > earliestPeriod.key : false;
  const canGoNext = latestPeriod   ? activePeriod.key < latestPeriod.key   : false;

  const goToPrev = useCallback(() => {
    if (!canGoPrev) return;
    setCurrentPeriod((prev) => navigatePeriod(prev ?? defaultPeriod, 'prev', periodType));
    logger.info('[usePeriodAnalytics] PERIOD_NAVIGATION -', periodType, '- prev');
  }, [canGoPrev, periodType, defaultPeriod]);

  const goToNext = useCallback(() => {
    if (!canGoNext) return;
    setCurrentPeriod((prev) => navigatePeriod(prev ?? defaultPeriod, 'next', periodType));
    logger.info('[usePeriodAnalytics] PERIOD_NAVIGATION -', periodType, '- next');
  }, [canGoNext, periodType, defaultPeriod]);

  const setPeriodType = useCallback((type) => {
    setPeriodTypeState(type);
    setCurrentPeriod(null); // reset to default for the new period type
    logger.info('[usePeriodAnalytics] Period type changed to:', type);
  }, []);

  const periodExpenses = useMemo(
    () => filterExpensesByPeriod(expenses, activePeriod),
    [expenses, activePeriod]
  );

  const summary = useMemo(() => {
    if (!expenses.length) return null;
    const base = computePeriodSummary(periodExpenses, activePeriod, expenses, balanceMeta);
    const expenseTrend = computeExpenseTrend(expenses, activePeriod, periodType);
    logger.info(
      '[usePeriodAnalytics] Summary for', activePeriod.label,
      '| income:', base.income, '| expense:', base.expense, '| score:', base.cashFlowScore
    );
    return { ...base, expenseTrend };
  }, [periodExpenses, activePeriod, expenses, balanceMeta, periodType]);

  return {
    periodType,
    setPeriodType,
    currentPeriod: activePeriod,
    goToPrev,
    goToNext,
    canGoPrev,
    canGoNext,
    summary,
    periodExpenses,
  };
}
