/**
 * @file hooks/useWeeklyBudget.js
 * @description Hook for optional per-week budget tracking within a month.
 *
 * Week model (always relative to the calendar month):
 *   W1 — days 1–7
 *   W2 — days 8–14
 *   W3 — days 15–21
 *   W4 — days 22–28
 *   W5 — days 29–end (only if month has 29+ days)
 *
 * Storage: localStorage key `gt_weekly_budget_v1`
 * Schema:  { enabled: boolean, budgets: { 'YYYY-MM-W1': number, ... } }
 *
 * Per-week budgets are optional — a week without a budget limit still shows
 * its spending, but no over/under comparison.
 */

import { useState, useCallback, useMemo } from 'react';
import logger from '../utils/logger';

const STORAGE_KEY = 'gt_weekly_budget_v1';

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    logger.warn('[useWeeklyBudget] Failed to parse localStorage');
  }
  return { enabled: false, budgets: {} };
}

function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    logger.error('[useWeeklyBudget] Failed to write localStorage');
  }
}

// ---------------------------------------------------------------------------
// Week calculation
// ---------------------------------------------------------------------------

/**
 * Returns the 4–5 week ranges for a given month.
 * Week 5 only appears when the month has 29+ days.
 *
 * @param {string} yyyyMM  - e.g. '2026-03'
 * @returns {{
 *   key: string,        - e.g. '2026-03-W1'
 *   label: string,      - e.g. 'Week 1'
 *   weekNum: number,    - 1–5
 *   startDay: number,
 *   endDay: number,
 *   startDate: string,  - YYYY-MM-DD
 *   endDate: string,    - YYYY-MM-DD
 * }[]}
 */
export function getWeeksForMonth(yyyyMM) {
  if (!yyyyMM) return [];
  const [year, month] = yyyyMM.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const WEEK_DEFS = [
    { num: 1, start: 1,  end: 7 },
    { num: 2, start: 8,  end: 14 },
    { num: 3, start: 15, end: 21 },
    { num: 4, start: 22, end: 28 },
    { num: 5, start: 29, end: 31 },
  ];

  return WEEK_DEFS
    .filter(({ start }) => start <= daysInMonth)
    .map(({ num, start, end }) => {
      const actualEnd = Math.min(end, daysInMonth);
      const pad = (n) => String(n).padStart(2, '0');
      return {
        key:       `${yyyyMM}-W${num}`,
        label:     `Week ${num}`,
        weekNum:   num,
        startDay:  start,
        endDay:    actualEnd,
        startDate: `${yyyyMM}-${pad(start)}`,
        endDate:   `${yyyyMM}-${pad(actualEnd)}`,
      };
    });
}

/**
 * Computes spending metrics for a single week.
 *
 * @param {Object[]} expenses - All expenses (already filtered to the right month ideally)
 * @param {Object} week       - Week descriptor from getWeeksForMonth
 * @param {number|null} weeklyBudgetAmount - Optional budget for this week
 * @returns {{
 *   spent: number,
 *   income: number,
 *   txCount: number,
 *   hasLimit: boolean,
 *   limit: number|null,
 *   remaining: number|null,
 *   pct: number|null,       - 0–100+
 *   isOver: boolean,
 * }}
 */
export function computeWeekMetrics(expenses, week, weeklyBudgetAmount) {
  const weekExpenses = expenses.filter(
    (e) => e.date >= week.startDate && e.date <= week.endDate && !e.budgetExcluded
  );
  const spent  = weekExpenses.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const income = weekExpenses.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);

  const hasLimit  = weeklyBudgetAmount != null && weeklyBudgetAmount > 0;
  const limit     = hasLimit ? weeklyBudgetAmount : null;
  const remaining = hasLimit ? limit - spent : null;
  const pct       = hasLimit ? Math.round((spent / limit) * 100) : null;
  const isOver    = hasLimit ? spent > limit : false;

  return { spent, income, txCount: weekExpenses.length, hasLimit, limit, remaining, pct, isOver };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages optional per-week budgets for the active month.
 *
 * @returns {{
 *   enabled: boolean,
 *   budgets: Record<string, number>,
 *   toggleEnabled: () => void,
 *   setBudget: (weekKey: string, amount: number) => void,
 *   clearBudget: (weekKey: string) => void,
 *   getBudget: (weekKey: string) => number|null,
 * }}
 */
export function useWeeklyBudget() {
  const [stored, setStored] = useState(() => loadFromStorage());

  const persist = useCallback((next) => {
    setStored(next);
    saveToStorage(next);
  }, []);

  const toggleEnabled = useCallback(() => {
    const next = { ...stored, enabled: !stored.enabled };
    persist(next);
    logger.info('[useWeeklyBudget] Toggled enabled:', next.enabled);
  }, [stored, persist]);

  const setBudget = useCallback((weekKey, amount) => {
    const next = { ...stored, budgets: { ...stored.budgets, [weekKey]: amount } };
    persist(next);
    logger.info('[useWeeklyBudget] Set budget for', weekKey, ':', amount);
  }, [stored, persist]);

  const clearBudget = useCallback((weekKey) => {
    const { [weekKey]: _removed, ...rest } = stored.budgets;
    const next = { ...stored, budgets: rest };
    persist(next);
    logger.info('[useWeeklyBudget] Cleared budget for', weekKey);
  }, [stored, persist]);

  const getBudget = useCallback((weekKey) => {
    const v = stored.budgets[weekKey];
    return v !== undefined ? v : null;
  }, [stored.budgets]);

  return {
    enabled: stored.enabled,
    budgets: stored.budgets,
    toggleEnabled,
    setBudget,
    clearBudget,
    getBudget,
  };
}
