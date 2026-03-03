/**
 * @file HomePage.jsx
 * @description Dashboard home page. Shows period-filtered stats, budget quick-stats,
 * spending chart, and category breakdown.
 *
 * The Navbar slot renders:
 *   [Weekly | Monthly]   ‹  March 2026  ›
 * so the user can both switch period type and navigate back/forward.
 *
 * v3: Added 4-card stats row (Net Flow), budget quick-stats widget.
 */

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Wallet, Coffee, Zap } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { StatsRow } from '../components/dashboard/StatsRow';
import { SpendingChart } from '../components/dashboard/SpendingChart';
import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown';
import { usePeriodAnalytics } from '../hooks/usePeriodAnalytics';
import { useBudget } from '../hooks/useBudget';
import { APP_CONFIG } from '../constants';
import { cn } from '../utils/cn';
import logger from '../utils/logger';

// Period type options
const PERIOD_OPTIONS = [
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// ---------------------------------------------------------------------------
// Budget quick-stats widget
// ---------------------------------------------------------------------------

/** @param {number} n @returns {string} */
function fmt(n) {
  return APP_CONFIG.CURRENCY_SYMBOL + new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(n)));
}

/**
 * Compact budget summary strip shown on the Dashboard when budget is configured.
 * Shows: budget used %, balance left, safe daily spend.
 *
 * @param {Object} props
 * @param {import('../utils/budgetEngine').MonthlyBudgetMetrics} props.metrics
 * @param {string} props.monthLabel
 */
function BudgetQuickStats({ metrics, monthLabel }) {
  const usedPct = metrics.budgetUsedPct;
  const remaining = metrics.remaining;
  const isOver = remaining < 0;

  return (
    <div className={cn(
      'rounded-2xl border p-4 shadow-sm',
      metrics.status.borderClass,
      metrics.status.bgClass.replace('bg-', 'bg-opacity-30 bg-')
    )}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Budget — {monthLabel}
          </p>
          <div className={cn(
            'inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5',
            metrics.status.bgClass, metrics.status.colorClass
          )}>
            {metrics.status.label}
          </div>
        </div>
        <p className="text-sm font-bold text-gray-700">
          {usedPct}% used of {fmt(metrics.spendingPower)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(100, usedPct)}%`,
            backgroundColor: isOver ? '#f43f5e' : metrics.status.barClass.replace('bg-', ''),
            background: isOver ? '#f43f5e' : undefined,
          }}
        />
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            icon: <Wallet size={13} />,
            label: isOver ? 'Over Budget' : 'Left to Spend',
            value: fmt(Math.abs(remaining)),
            color: isOver ? 'text-rose-600' : 'text-emerald-600',
            iconBg: isOver ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500',
          },
          {
            icon: <Zap size={13} />,
            label: 'Burn Rate',
            value: `${fmt(metrics.burnRate)}/day`,
            color: 'text-gray-700',
            iconBg: 'bg-amber-50 text-amber-500',
          },
          {
            icon: <Coffee size={13} />,
            label: 'Safe Today',
            value: fmt(metrics.safeToSpendToday),
            color: metrics.safeToSpendToday > 0 ? 'text-indigo-600' : 'text-rose-600',
            iconBg: 'bg-indigo-50 text-indigo-500',
          },
        ].map(({ icon, label, value, color, iconBg }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
              {icon}
            </div>
            <div>
              <p className={cn('text-sm font-bold', color)}>{value}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HomePage
// ---------------------------------------------------------------------------

/**
 * Home / Dashboard page.
 * @returns {JSX.Element}
 */
export default function HomePage() {
  const [periodType, setPeriodType] = useState('monthly');

  const {
    setPeriodType: syncPeriodType,
    currentPeriod,
    goToPrev, goToNext,
    canGoPrev, canGoNext,
    summary,
  } = usePeriodAnalytics(periodType);

  const budget = useBudget();
  const showBudgetWidget = budget.isConfigured && budget.metrics !== null;

  useEffect(() => {
    logger.info('[HomePage] Dashboard mounted');
  }, []);

  const handleTypeChange = (type) => {
    setPeriodType(type);
    syncPeriodType(type);
    logger.info('[HomePage] Period type switched to:', type);
  };

  // Full period control rendered inside the Navbar via the headerActions slot
  const periodControl = (
    <div className="flex items-center gap-3">
      {/* Weekly / Monthly segmented toggle */}
      <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleTypeChange(value)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-150',
              periodType === value
                ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ‹ Period Label › navigator */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={goToPrev}
          disabled={!canGoPrev}
          aria-label="Previous period"
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 transition-colors',
            canGoPrev
              ? 'text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              : 'text-gray-300 border-gray-100 cursor-not-allowed opacity-40'
          )}
        >
          <ChevronLeft size={14} />
        </button>

        <span className="text-sm font-semibold text-gray-800 min-w-[110px] text-center">
          {currentPeriod?.label ?? '—'}
        </span>

        <button
          onClick={goToNext}
          disabled={!canGoNext}
          aria-label="Next period"
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 transition-colors',
            canGoNext
              ? 'text-gray-600 hover:bg-gray-50 hover:border-gray-300'
              : 'text-gray-300 border-gray-100 cursor-not-allowed opacity-40'
          )}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <PageWrapper headerActions={periodControl}>
      <div className="space-y-6">

        {/* Stats — 4 cards: Balance, Cash Inflow, Expenses, Net Flow */}
        <StatsRow summary={summary} periodType={periodType} />

        {/* Budget quick-stats — only when budget is configured */}
        {showBudgetWidget && (
          <BudgetQuickStats
            metrics={budget.metrics}
            monthLabel={budget.budgetMonth
              ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
                  .format(new Date(`${budget.budgetMonth}-01`))
              : ''}
          />
        )}

        {/* Charts row — side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingChart />
          <CategoryBreakdown />
        </div>

      </div>
    </PageWrapper>
  );
}
