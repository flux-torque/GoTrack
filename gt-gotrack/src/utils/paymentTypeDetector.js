/**
 * @file paymentTypeDetector.js
 * @description Detects the payment rail / method from a transaction note/remark.
 * Used in the Transactions page for filtering, grouping, and insights.
 *
 * Detection priority (highest → lowest):
 *   UPI → NEFT → IMPS → RTGS → ATM → Card → Auto-Debit → Other
 */

import logger from './logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** @enum {string} */
export const PAYMENT_TYPES = {
  UPI: 'UPI',
  NEFT: 'NEFT',
  IMPS: 'IMPS',
  RTGS: 'RTGS',
  ATM: 'ATM',
  CARD: 'Card',
  AUTO_DEBIT: 'Auto-Debit',
  OTHER: 'Other',
};

/** All payment type values as an ordered array — used for filter UI */
export const PAYMENT_TYPE_LIST = Object.values(PAYMENT_TYPES);

/** Display colors for each payment type (Tailwind-compatible) */
export const PAYMENT_TYPE_COLORS = {
  [PAYMENT_TYPES.UPI]:        { bg: 'bg-violet-50',  text: 'text-violet-700',  hex: '#7c3aed' },
  [PAYMENT_TYPES.NEFT]:       { bg: 'bg-blue-50',    text: 'text-blue-700',    hex: '#1d4ed8' },
  [PAYMENT_TYPES.IMPS]:       { bg: 'bg-cyan-50',    text: 'text-cyan-700',    hex: '#0e7490' },
  [PAYMENT_TYPES.RTGS]:       { bg: 'bg-indigo-50',  text: 'text-indigo-700',  hex: '#4338ca' },
  [PAYMENT_TYPES.ATM]:        { bg: 'bg-amber-50',   text: 'text-amber-700',   hex: '#b45309' },
  [PAYMENT_TYPES.CARD]:       { bg: 'bg-orange-50',  text: 'text-orange-700',  hex: '#c2410c' },
  [PAYMENT_TYPES.AUTO_DEBIT]: { bg: 'bg-rose-50',    text: 'text-rose-700',    hex: '#be123c' },
  [PAYMENT_TYPES.OTHER]:      { bg: 'bg-gray-50',    text: 'text-gray-600',    hex: '#6b7280' },
};

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/**
 * Infers the payment method from a transaction's note/remarks string.
 * Returns the most specific match found, falling back to 'Other'.
 *
 * @param {string} note - Full transaction remark (e.g. from ICICI statement)
 * @returns {string} One of the PAYMENT_TYPES values
 */
export function detectPaymentType(note) {
  const n = (note || '').toUpperCase();

  if (n.includes('UPI')) return PAYMENT_TYPES.UPI;
  if (n.includes('NEFT')) return PAYMENT_TYPES.NEFT;
  if (n.includes('IMPS')) return PAYMENT_TYPES.IMPS;
  if (n.includes('RTGS')) return PAYMENT_TYPES.RTGS;
  if (n.includes('ATM/CASH') || n.includes('ATM WDL') || n.includes('ATM')) return PAYMENT_TYPES.ATM;
  if (n.includes('POS') || n.includes('POINTOFSALE') || n.includes('DEBIT CARD')) return PAYMENT_TYPES.CARD;
  if (n.includes('ECS') || n.includes('NACH') || n.includes('ACH') || n.includes('MANDATE')) return PAYMENT_TYPES.AUTO_DEBIT;

  return PAYMENT_TYPES.OTHER;
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} PaymentTypeSummary
 * @property {string} type          - Payment type label
 * @property {number} count         - Number of transactions
 * @property {number} totalAmount   - Sum of amounts
 * @property {number} pct           - Percentage of total amount (0–100)
 * @property {string} hex           - Chart color hex
 */

/**
 * Groups a list of expenses by payment type and returns summary stats.
 * Sorted by totalAmount descending.
 *
 * @param {import('../context/ExpenseContext').Expense[]} expenses
 * @returns {PaymentTypeSummary[]}
 */
export function summariseByPaymentType(expenses) {
  const totals = {};

  for (const e of expenses) {
    const type = detectPaymentType(e.note);
    if (!totals[type]) totals[type] = { count: 0, totalAmount: 0 };
    totals[type].count += 1;
    totals[type].totalAmount += e.amount;
  }

  const grandTotal = Object.values(totals).reduce((s, v) => s + v.totalAmount, 0);

  const result = Object.entries(totals)
    .map(([type, { count, totalAmount }]) => ({
      type,
      count,
      totalAmount: Math.round(totalAmount),
      pct: grandTotal > 0 ? Math.round((totalAmount / grandTotal) * 100) : 0,
      hex: PAYMENT_TYPE_COLORS[type]?.hex ?? '#6b7280',
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  logger.info('[paymentTypeDetector] summariseByPaymentType: built', result.length, 'groups');
  return result;
}
