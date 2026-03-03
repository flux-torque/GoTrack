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

      {/* ── Row 1: Main metrics ── */}
      <div className="grid grid-cols-5 gap-2 px-4 py-4">
        <MetricBox
          label="Opening"
          value={`${APP_CONFIG.CURRENCY_SYMBOL}${fmt(openingBalance)}`}
          valueClass="text-indigo-700"
        />
        <MetricBox
          label="Cash Inflow"
          value={`${APP_CONFIG.CURRENCY_SYMBOL}${fmt(income)}`}
          valueClass="text-emerald-600"
        />
        <MetricBox
          label="Expenses"
          value={`${APP_CONFIG.CURRENCY_SYMBOL}${fmt(expense)}`}
          valueClass="text-rose-600"
          sub={
            expenseTrend !== 0 ? (
              <span className={cn('text-[10px] font-semibold flex items-center gap-0.5', trendColor)}>
                <TrendIcon size={10} /> {trendLabel}
              </span>
            ) : null
          }
        />
        <MetricBox
          label="Net Flow"
          value={`${netPositive ? '+' : ''}${APP_CONFIG.CURRENCY_SYMBOL}${fmt(netFlow)}`}
          valueClass={netPositive ? 'text-emerald-600' : 'text-rose-600'}
        />
        <MetricBox
          label="Closing"
          value={`${APP_CONFIG.CURRENCY_SYMBOL}${fmt(closingBalance)}`}
          valueClass="text-indigo-700"
        />
      </div>

      {/* ── Row 2: Smart indicators ── */}
      <div className="flex flex-wrap items-center justify-around gap-3 px-4 py-3">
        {/* Savings Rate */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm">💰</span>
          <span className="text-xs text-gray-500">Savings Rate:</span>
          <span className={cn(
            'text-xs font-bold px-1.5 py-0.5 rounded-full',
            savingsRate >= 20 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'
          )}>
            {savingsRate}%
          </span>
        </div>

        {/* Avg Daily Spend */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📊</span>
          <span className="text-xs text-gray-500">Avg Daily:</span>
          <span className="text-xs font-bold text-gray-700">
            {APP_CONFIG.CURRENCY_SYMBOL}{fmt(avgDailySpend)}
          </span>
        </div>

        {/* Cash Flow Score */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🎯</span>
          <span className="text-xs text-gray-500">Score:</span>
          <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-full', sc.bg, sc.text)}>
            {cashFlowScore}/100
          </span>
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
