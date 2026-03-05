/**
 * @file PeriodSummaryCard.jsx
 * @description Rich analytics card for the selected period.
 *
 * Three-row layout:
 *   Row 1 — Opening Bal | Income | Expenses (with trend ↑↓) | Net Flow | Closing Bal
 *   Row 2 — Savings Rate | Avg Daily Spend | Cash Flow Score
 *   Row 3 — Top 3 spending categories
 *
 * Shows an empty state when there are no transactions in the period.
 *
 * v1.6
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { APP_CONFIG } from '../../constants';
import logger from '../../utils/logger';
import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a number as INR currency string (no decimals).
 * @param {number} amount
 * @returns {string}
 */
function fmt(amount) {
  return new Intl.NumberFormat(APP_CONFIG.LOCALE, { maximumFractionDigits: 0 }).format(amount);
}

/**
 * Returns color classes for the Cash Flow Score.
 * @param {number} score
 * @returns {{ bg: string, text: string }}
 */
function scoreColor(score) {
  if (score >= 71) return { bg: 'bg-emerald-50', text: 'text-emerald-700' };
  if (score >= 41) return { bg: 'bg-amber-50',   text: 'text-amber-700'   };
  return               { bg: 'bg-rose-50',    text: 'text-rose-600'   };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * A single metric box in the top row.
 * @param {{ label: string, value: string, valueClass?: string, sub?: JSX.Element }} props
 */
function MetricBox({ label, value, valueClass, sub }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <p className={cn('text-sm font-bold text-gray-900 truncate', valueClass)}>{value}</p>
      {sub && <div className="flex items-center gap-0.5">{sub}</div>}
      <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mt-0.5">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Period analytics summary card.
 *
 * @param {Object} props
 * @param {import('../../utils/periodAnalytics').PeriodSummary} props.summary
 * @param {import('../../utils/periodAnalytics').PeriodKey} props.currentPeriod
 * @returns {JSX.Element}
 */
export function PeriodSummaryCard({ summary, currentPeriod }) {
  useEffect(() => {
    if (summary) {
      logger.info('[PeriodSummaryCard] Rendered for', currentPeriod?.label, '| score:', summary.cashFlowScore);
    }
  }, [summary, currentPeriod]);

  if (!summary || summary.txCount === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8 text-center">
        <p className="text-sm text-gray-400">No transactions in this period</p>
      </div>
    );
  }

  const { income, expense, netFlow, openingBalance, closingBalance,
          savingsRate, avgDailySpend, cashFlowScore, expenseTrend, topCategories } = summary;

  const netPositive = netFlow >= 0;
  const sc = scoreColor(cashFlowScore);

  // Expense trend indicator
  let TrendIcon = Minus;
  let trendColor = 'text-gray-400';
  let trendLabel = '—';
  if (expenseTrend > 0) {
    TrendIcon = TrendingUp; trendColor = 'text-rose-500'; trendLabel = `+${expenseTrend}%`;
  } else if (expenseTrend < 0) {
    TrendIcon = TrendingDown; trendColor = 'text-emerald-600'; trendLabel = `${expenseTrend}%`;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">

      {/* ── Row 1: Main metrics — scrollable on mobile ── */}
      <div className="overflow-x-auto">
        <div className="flex items-start divide-x divide-gray-100 min-w-[420px] sm:min-w-0 sm:grid sm:grid-cols-5 px-0">
          {[
            { label: 'Opening',     value: `${APP_CONFIG.CURRENCY_SYMBOL}${fmt(openingBalance)}`, cls: 'text-indigo-700' },
            { label: 'Cash Inflow', value: `${APP_CONFIG.CURRENCY_SYMBOL}${fmt(income)}`,         cls: 'text-emerald-600' },
            { label: 'Expenses',    value: `${APP_CONFIG.CURRENCY_SYMBOL}${fmt(expense)}`,        cls: 'text-rose-600',    sub: expenseTrend !== 0 },
            { label: 'Net Flow',    value: `${netPositive ? '+' : ''}${APP_CONFIG.CURRENCY_SYMBOL}${fmt(netFlow)}`, cls: netPositive ? 'text-emerald-600' : 'text-rose-600' },
            { label: 'Closing',     value: `${APP_CONFIG.CURRENCY_SYMBOL}${fmt(closingBalance)}`, cls: 'text-indigo-700' },
          ].map(({ label, value, cls, sub }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-0.5 px-3 py-4 min-w-0">
              <p className={cn('text-sm font-bold truncate', cls)}>{value}</p>
              {sub && (
                <div className="flex items-center gap-0.5">
                  <span className={cn('text-[10px] font-semibold flex items-center gap-0.5', trendColor)}>
                    <TrendIcon size={10} /> {trendLabel}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 2: Smart indicators — 3-col grid ── */}
      <div className="grid grid-cols-3 divide-x divide-gray-100">
        <div className="flex flex-col items-center gap-1 px-2 py-3">
          <span className="text-base leading-none">💰</span>
          <span className={cn(
            'text-xs font-bold px-1.5 py-0.5 rounded-full',
            savingsRate >= 20 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'
          )}>
            {savingsRate}%
          </span>
          <span className="text-[10px] text-gray-400 leading-none">Savings</span>
        </div>

        <div className="flex flex-col items-center gap-1 px-2 py-3">
          <span className="text-base leading-none">📊</span>
          <span className="text-xs font-bold text-gray-700">
            {APP_CONFIG.CURRENCY_SYMBOL}{fmt(avgDailySpend)}
          </span>
          <span className="text-[10px] text-gray-400 leading-none">Avg Daily</span>
        </div>

        <div className="flex flex-col items-center gap-1 px-2 py-3">
          <span className="text-base leading-none">🎯</span>
          <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', sc.bg, sc.text)}>
            {cashFlowScore}/100
          </span>
          <span className="text-[10px] text-gray-400 leading-none">Score</span>
        </div>
      </div>

      {/* ── Row 3: Top categories ── */}
      {topCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3">
          <span className="text-[10px] text-gray-400 uppercase tracking-wide mr-1">Top spending:</span>
          {topCategories.map((cat) => (
            <div
              key={cat.categoryId}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: cat.hex }}
              />
              <span className="text-xs text-gray-700 font-medium">{cat.label}</span>
              <span className="text-[10px] text-gray-400">{cat.pct}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
