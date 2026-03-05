/**
 * @file HomePage.jsx
 * @description Dashboard home page. Shows period-filtered stats, budget quick-stats,
 * spending chart, and category breakdown.
 *
 * Period modes:
 *   Weekly  — week-by-week navigation (via usePeriodAnalytics)
 *   Monthly — month-by-month navigation (via usePeriodAnalytics)
 *   Custom  — user-defined date range with two date pickers
 *
 * The Navbar slot renders the period selector (type toggle + navigator).
 *
 * v3.1: Added Custom date range mode alongside Weekly/Monthly.
 */

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Wallet, Coffee, Zap, Calendar, X } from 'lucide-react';
import { PageWrapper } from '../components/layout/PageWrapper';
import { StatsRow } from '../components/dashboard/StatsRow';
import { SpendingChart } from '../components/dashboard/SpendingChart';
import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown';
import { usePeriodAnalytics } from '../hooks/usePeriodAnalytics';
import { useBudget } from '../hooks/useBudget';
import { useExpenses } from '../context/ExpenseContext';
import { APP_CONFIG } from '../constants';
import { cn } from '../utils/cn';
import logger from '../utils/logger';

// Period type options shown in the navbar toggle
const PERIOD_OPTIONS = [
  { value: 'weekly',  label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom',  label: 'Custom' },
];

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** @param {number} n @returns {string} */
function fmt(n) {
  return APP_CONFIG.CURRENCY_SYMBOL + new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(n)));
}

// ---------------------------------------------------------------------------
// Budget quick-stats widget
// ---------------------------------------------------------------------------

/**
 * Compact budget summary strip shown on the Dashboard when budget is configured.
 *
 * @param {Object} props
 * @param {import('../utils/budgetEngine').MonthlyBudgetMetrics} props.metrics
 * @param {string} props.monthLabel
 */
function BudgetQuickStats({ metrics, monthLabel }) {
  const usedPct  = metrics.budgetUsedPct;
  const remaining = metrics.remaining;
  const isOver   = remaining < 0;

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
            backgroundColor: isOver ? '#f43f5e' : undefined,
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
  const { state: { expenses } } = useExpenses();

  // 'weekly' | 'monthly' | 'custom'
  const [periodType, setPeriodType] = useState('monthly');

  // Custom date range state
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');

  // Period analytics (used for weekly/monthly modes)
  const analyticsType = periodType === 'custom' ? 'monthly' : periodType;
  const {
    setPeriodType: syncPeriodType,
    currentPeriod,
    goToPrev, goToNext,
    canGoPrev, canGoNext,
    summary: analyticsSummary,
  } = usePeriodAnalytics(analyticsType);

  const budget = useBudget();
  const showBudgetWidget = budget.isConfigured && budget.metrics !== null;

  useEffect(() => {
    logger.info('[HomePage] Dashboard mounted');
  }, []);

  const handleTypeChange = (type) => {
    setPeriodType(type);
    if (type !== 'custom') {
      syncPeriodType(type);
    }
    logger.info('[HomePage] Period type switched to:', type);
  };

  // Custom date range summary — computed directly from expenses
  const customSummary = useMemo(() => {
    if (periodType !== 'custom') return null;
    const filtered = expenses.filter((e) => {
      if (customFrom && e.date < customFrom) return false;
      if (customTo   && e.date > customTo)   return false;
      return true;
    });
    const income  = filtered.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const expense = filtered.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
    return {
      income,
      expense,
      netFlow: income - expense,
      transactionCount: filtered.length,
    };
  }, [periodType, expenses, customFrom, customTo]);

  // Active summary: custom overrides analytics when in custom mode
  const activeSummary = periodType === 'custom' ? customSummary : analyticsSummary;

  // Custom period label shown in place of the navigator
  const customLabel = useMemo(() => {
    if (periodType !== 'custom') return null;
    if (!customFrom && !customTo) return 'All time';
    if (!customFrom) return `Until ${customTo}`;
    if (!customTo)   return `From ${customFrom}`;
    return `${customFrom} → ${customTo}`;
  }, [periodType, customFrom, customTo]);

  // Full period control rendered inside the Navbar via the headerActions slot
  const periodControl = (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
      {/* Type toggle: Weekly | Monthly | Custom */}
      <div className="flex items-center gap-0.5 sm:gap-1 p-1 bg-gray-100 rounded-xl">
        {PERIOD_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => handleTypeChange(value)}
            className={cn(
              'px-2.5 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-150',
              periodType === value
                ? 'bg-white text-indigo-600 shadow-sm font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {value === 'custom' ? <Calendar size={14} /> : label}
          </button>
        ))}
      </div>

      {/* Weekly/Monthly navigator */}
      {periodType !== 'custom' && (
        <div className="flex items-center gap-1 sm:gap-1.5">
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
          <span className="text-xs sm:text-sm font-semibold text-gray-800 min-w-[90px] sm:min-w-[110px] text-center">
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
      )}

      {/* Custom date range pickers */}
      {periodType === 'custom' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            max={customTo || undefined}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700 w-[120px] sm:w-[130px]"
            placeholder="From"
          />
          <span className="text-xs text-gray-400">→</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            min={customFrom || undefined}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700 w-[120px] sm:w-[130px]"
            placeholder="To"
          />
          {(customFrom || customTo) && (
            <button
              onClick={() => { setCustomFrom(''); setCustomTo(''); }}
              className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
              title="Clear"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <PageWrapper headerActions={periodControl}>
      <div className="space-y-6">

        {/* Custom date range info banner */}
        {periodType === 'custom' && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs">
            <Calendar size={13} className="text-indigo-400 shrink-0" />
            <span className="text-indigo-700 font-medium">{customLabel}</span>
            {customSummary && (
              <span className="text-indigo-500 ml-auto">
                {customSummary.transactionCount} transaction{customSummary.transactionCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {/* Stats — 4 cards */}
        <StatsRow
          summary={activeSummary}
          periodType={periodType === 'custom' ? 'custom' : periodType}
        />

        {/* Budget quick-stats */}
        {showBudgetWidget && (
          <BudgetQuickStats
            metrics={budget.metrics}
            monthLabel={budget.budgetMonth
              ? new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' })
                  .format(new Date(`${budget.budgetMonth}-01`))
              : ''}
          />
        )}

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SpendingChart />
          <CategoryBreakdown />
        </div>

      </div>
    </PageWrapper>
  );
}
