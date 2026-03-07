/**
 * @file hooks/useMonthlyBalance.js
 * @description Hook for monthly balance management.
 * Fetches opening balance from the DB, computes current balance from
 * transactions in ExpenseContext, and manages expected balance in localStorage.
 *
 * Computed balance = openingBalance + monthIncome - monthExpenses
 * Mismatch        = expectedBalance - computedBalance
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { apiFetch } from '../services/api';
import { useExpenses } from '../context/ExpenseContext';
import logger from '../utils/logger';

/** @param {string} month - YYYY-MM @returns {string} */
const LS_EXPECTED_KEY = (month) => `gt_expected_balance_${month}`;

/**
 * Hook for monthly balance state.
 *
 * @param {string} [month] - YYYY-MM, defaults to current calendar month
 * @returns {{
 *   month: string,
 *   openingBalance: number | null,
 *   computedBalance: number | null,
 *   expectedBalance: number | null,
 *   mismatch: number | null,
 *   loading: boolean,
 *   saving: boolean,
 *   updateOpeningBalance: (amount: number) => Promise<void>,
 *   updateExpectedBalance: (amount: number | null) => void,
 * }}
 */
export function useMonthlyBalance(month) {
  const activeMonth = month || format(new Date(), 'yyyy-MM');
  const { state: { expenses } } = useExpenses();

  const [openingBalance, setOpeningBalance] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);

  // Expected balance persisted in localStorage
  const [expectedBalance, setExpectedBalance] = useState(() => {
    const raw = localStorage.getItem(LS_EXPECTED_KEY(activeMonth));
    return raw !== null ? parseFloat(raw) : null;
  });

  // Fetch monthly_balances from API when month changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch('/statements/balances')
      .then((rows) => {
        if (cancelled) return;
        const row = (rows || []).find((r) => r.month === activeMonth);
        setOpeningBalance(row?.opening_balance ?? null);
        logger.info(`[useMonthlyBalance] month=${activeMonth} opening=${row?.opening_balance ?? 'null'}`);
      })
      .catch((err) => {
        if (cancelled) return;
        logger.error('[useMonthlyBalance] fetch error:', err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeMonth]);

  // Compute balance from ExpenseContext transactions for this month
  const monthTxns   = expenses.filter((e) => e.date?.startsWith(activeMonth));
  const monthIncome = monthTxns.filter((e) => e.type === 'income').reduce((s, e)  => s + e.amount, 0);
  const monthSpend  = monthTxns.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  const computedBalance = openingBalance !== null
    ? openingBalance + monthIncome - monthSpend
    : null;

  // Positive mismatch = user thinks balance is higher than computed (transactions missing)
  // Negative mismatch = user thinks balance is lower (unexpected spending recorded)
  const mismatch = computedBalance !== null && expectedBalance !== null
    ? expectedBalance - computedBalance
    : null;

  /** Update opening balance via API PATCH */
  const updateOpeningBalance = useCallback(async (amount) => {
    setSaving(true);
    try {
      await apiFetch(`/statements/balances/${activeMonth}`, {
        method: 'PATCH',
        body: { opening_balance: amount },
      });
      setOpeningBalance(amount);
      logger.info(`[useMonthlyBalance] Opening balance updated to ${amount} for ${activeMonth}`);
    } finally {
      setSaving(false);
    }
  }, [activeMonth]);

  /** Persist expected balance to localStorage (pass null to clear) */
  const updateExpectedBalance = useCallback((amount) => {
    if (amount === null || amount === undefined) {
      localStorage.removeItem(LS_EXPECTED_KEY(activeMonth));
      setExpectedBalance(null);
    } else {
      localStorage.setItem(LS_EXPECTED_KEY(activeMonth), String(amount));
      setExpectedBalance(amount);
    }
    logger.info(`[useMonthlyBalance] Expected balance set to ${amount} for ${activeMonth}`);
  }, [activeMonth]);

  return {
    month: activeMonth,
    openingBalance,
    computedBalance,
    expectedBalance,
    mismatch,
    loading,
    saving,
    updateOpeningBalance,
    updateExpectedBalance,
  };
}
