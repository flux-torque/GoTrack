/**
 * @file AnalysisPage.jsx
 * @description Dedicated financial analysis page.
 * Mobile-first redesign: cards stack vertically on mobile, 2-col on desktop.
 * Period selector stays compact on all screen sizes.
 *
 * v3.1: Mobile-first layout — collapsible/stacked cards, larger tap targets,
 *       summary metrics prominently at top, charts below.
 */

import { useEffect, useMemo } from 'react';
import {
  BarChart2, ArrowUpCircle, ArrowDownCircle, Activity,
  CreditCard, TrendingUp, DollarSign,
} from 'lucide-react';
import { getDay, parseISO } from 'date-fns';
import { PageWrapper } from '../components/layout/PageWrapper';
import { PeriodSelector } from '../components/expenses/PeriodSelector';
import { PeriodSummaryCard } from '../components/expenses/PeriodSummaryCard';
import { SpendingChart } from '../components/dashboard/SpendingChart';
import { CategoryBreakdown } from '../components/dashboard/CategoryBreakdown';
import { useExpenses } from '../context/ExpenseContext';
import { usePeriodAnalytics } from '../hooks/usePeriodAnalytics';
import {
  PAYMENT_TYPE_COLORS, PAYMENT_TYPE_LIST, detectPaymentType,
} from '../utils/paymentTypeDetector';
import { CATEGORY_MAP, APP_CONFIG } from '../constants';
import { cn } from '../utils/cn';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @param {number} n @returns {string} */
function fmt(n) {
  return APP_CONFIG.CURRENCY_SYMBOL + new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(n)));
}

function getCategoryEmoji(categoryId) {
  const map = {
    food: '🍽️', transport: '🚗', shopping: '🛍️',
    entertainment: '🎬', health: '🏥', utilities: '⚡',
    rent: '🏠', education: '📚', savings: '💰', other: '💳',
  };
  return map[categoryId] || '💳';
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
        <BarChart2 size={28} className="text-indigo-400" />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-1">No data to analyse</h3>
      <p className="text-sm text-gray-400 max-w-xs">
        Upload a bank statement from the Transactions page to unlock analytics.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile-friendly Section Card wrapper
// ---------------------------------------------------------------------------

/**
 * Reusable section container with icon + title header.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {string} [props.subtitle]
 * @param {React.ReactNode} props.icon
 * @param {string} props.iconBg
 * @param {string} props.iconColor
 * @param {React.ReactNode} props.children
 * @param {React.ReactNode} [props.badge]
 */
function SectionCard({ title, subtitle, icon, iconBg, iconColor, children, badge }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={cn('flex items-center justify-between px-4 sm:px-5 py-4 border-b border-gray-50')}>
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {badge}
      </div>
      <div className="px-4 sm:px-5 py-4">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bar row — reusable progress + label row
// ---------------------------------------------------------------------------

function BarRow({ label, value, pct, count, colorClass, hexColor, badge }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={cn('text-xs font-semibold truncate', colorClass)}>{label}</span>
          {badge && <span className="shrink-0">{badge}</span>}
          {count != null && <span className="text-[10px] text-gray-400 shrink-0">{count} tx</span>}
        </div>
        <span className="text-xs font-semibold text-gray-700 tabular-nums ml-2 shrink-0">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: hexColor }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cash Inflow Sources
// ---------------------------------------------------------------------------

/**
 * Groups income transactions in the period by sender/title and shows top sources.
 * @param {{ periodExpenses: Object[] }} props
 */
function CashInflowSources({ periodExpenses }) {
  const incomeOnly   = periodExpenses.filter((e) => e.type === 'income');
  const totalInflow  = incomeOnly.reduce((s, e) => s + e.amount, 0);

  const sources = useMemo(() => {
    const map = {};
    for (const e of incomeOnly) {
      const key = e.title;
      if (!map[key]) map[key] = { title: key, total: 0, count: 0, paymentType: detectPaymentType(e.note) };
      map[key].total += e.amount;
      map[key].count += 1;
    }
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map((s) => ({ ...s, pct: totalInflow > 0 ? Math.round((s.total / totalInflow) * 100) : 0 }));
  }, [incomeOnly, totalInflow]);

  return (
    <SectionCard
      title="Cash Inflow Sources"
      subtitle={incomeOnly.length > 0
        ? `${incomeOnly.length} credit transaction${incomeOnly.length !== 1 ? 's' : ''}`
        : 'No credits this period'}
      icon={<ArrowUpCircle size={15} className="text-emerald-600" />}
      iconBg="bg-emerald-50"
      badge={incomeOnly.length > 0 && (
        <span className="text-sm font-bold text-emerald-600">{fmt(totalInflow)}</span>
      )}
    >
      {sources.length > 0 ? (
        <div className="space-y-3">
          {sources.map(({ title, total, count, pct, paymentType }) => {
            const ptColors = PAYMENT_TYPE_COLORS[paymentType] ?? PAYMENT_TYPE_COLORS['Other'];
            return (
              <BarRow
                key={title}
                label={title}
                value={fmt(total)}
                pct={pct}
                count={count}
                colorClass="text-gray-700"
                hexColor="#34d399"
                badge={
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', ptColors.bg, ptColors.text)}>
                    {paymentType}
                  </span>
                }
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-2">No credits in this period.</p>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Payment method analysis
// ---------------------------------------------------------------------------

/**
 * Debit transaction breakdown by payment method.
 * @param {{ periodExpenses: Object[] }} props
 */
function PeriodPaymentBreakdown({ periodExpenses }) {
  const debits     = periodExpenses.filter((e) => e.type === 'expense');
  const totalDebit = debits.reduce((s, e) => s + e.amount, 0);

  const breakdown = useMemo(() => {
    const map = {};
    for (const e of debits) {
      const type = detectPaymentType(e.note);
      if (!map[type]) map[type] = { type, total: 0, count: 0 };
      map[type].total += e.amount;
      map[type].count += 1;
    }
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .map((s) => ({ ...s, pct: totalDebit > 0 ? Math.round((s.total / totalDebit) * 100) : 0 }));
  }, [debits, totalDebit]);

  return (
    <SectionCard
      title="Payment Methods"
      subtitle="Debits by payment rail"
      icon={<CreditCard size={15} className="text-violet-600" />}
      iconBg="bg-violet-50"
    >
      {breakdown.length > 0 ? (
        <div className="space-y-3">
          {breakdown.map(({ type, total, count, pct }) => {
            const colors = PAYMENT_TYPE_COLORS[type] ?? PAYMENT_TYPE_COLORS['Other'];
            return (
              <BarRow
                key={type}
                label={type}
                value={fmt(total)}
                pct={pct}
                count={count}
                colorClass={colors.text}
                hexColor={colors.hex ?? '#6366f1'}
              />
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-2">No debit transactions in this period.</p>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Category breakdown (mobile-friendly)
// ---------------------------------------------------------------------------

/**
 * Top spending categories for the period.
 * @param {{ periodExpenses: Object[] }} props
 */
function CategoryBreakdownCard({ periodExpenses }) {
  const debits    = periodExpenses.filter((e) => e.type === 'expense');
  const totalSpent = debits.reduce((s, e) => s + e.amount, 0);

  const categories = useMemo(() => {
    const map = {};
    for (const e of debits) {
      if (!map[e.category]) map[e.category] = { id: e.category, total: 0, count: 0 };
      map[e.category].total += e.amount;
      map[e.category].count += 1;
    }
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7)
      .map((c) => ({
        ...c,
        pct: totalSpent > 0 ? Math.round((c.total / totalSpent) * 100) : 0,
      }));
  }, [debits, totalSpent]);

  return (
    <SectionCard
      title="Spending by Category"
      subtitle="Where your money goes"
      icon={<DollarSign size={15} className="text-indigo-600" />}
      iconBg="bg-indigo-50"
    >
      {categories.length > 0 ? (
        <div className="space-y-3">
          {categories.map(({ id, total, count, pct }) => {
            const cat = CATEGORY_MAP[id] || CATEGORY_MAP['other'];
            return (
              <div key={id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-sm shrink-0">{getCategoryEmoji(id)}</span>
                    <span className="text-xs font-medium text-gray-700 truncate">{cat.label}</span>
                    <span className="text-[10px] text-gray-400 shrink-0">{count} tx</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-[10px] text-gray-400">{pct}%</span>
                    <span className="text-xs font-semibold text-gray-700 tabular-nums">{fmt(total)}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: cat.hex }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-2">No spending data for this period.</p>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Spending velocity (day-of-week heatmap)
// ---------------------------------------------------------------------------

/**
 * Shows spending spread across weekdays for the period.
 * Mobile-optimised bar chart.
 * @param {{ periodExpenses: Object[] }} props
 */
function SpendingVelocityCard({ periodExpenses }) {
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const debits = periodExpenses.filter((e) => e.type === 'expense');

  const dayTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const e of debits) {
      totals[getDay(parseISO(e.date))] += e.amount;
    }
    const maxVal = Math.max(...totals, 1);
    return totals.map((amt, i) => ({
      label: DAY_LABELS[i],
      amount: amt,
      pct: Math.round((amt / maxVal) * 100),
    }));
  }, [debits]);

  const totalDebit = debits.reduce((s, e) => s + e.amount, 0);
  const topDay = [...dayTotals].sort((a, b) => b.amount - a.amount)[0];

  return (
    <SectionCard
      title="Spending by Day of Week"
      subtitle={topDay?.amount > 0 ? `Most active: ${topDay.label} (${fmt(topDay.amount)})` : 'No spending data'}
      icon={<Activity size={15} className="text-sky-600" />}
      iconBg="bg-sky-50"
    >
      {totalDebit > 0 ? (
        <div className="flex items-end gap-1.5 sm:gap-2 h-24">
          {dayTotals.map(({ label, amount, pct }) => {
            const isTop = pct === 100;
            return (
              <div key={label} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center h-16 sm:h-20">
                  <div
                    className="w-full rounded-t-lg transition-all duration-700"
                    style={{
                      height: `${Math.max(4, pct)}%`,
                      backgroundColor: isTop ? '#6366f1' : '#c7d2fe',
                      minHeight: amount > 0 ? '4px' : '0',
                    }}
                  />
                </div>
                <span className={cn('text-[10px] font-medium', isTop ? 'text-indigo-600' : 'text-gray-400')}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 py-2">No spending data for this period.</p>
      )}
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Quick stats strip (mobile-friendly summary numbers)
// ---------------------------------------------------------------------------

/**
 * 2×2 grid of key summary numbers shown above the detailed cards.
 * @param {{ summary: Object, currentPeriod: Object }} props
 */
function QuickStats({ summary, currentPeriod }) {
  if (!summary) return null;

  const stats = [
    {
      label: 'Spent',
      value: fmt(summary.expense ?? 0),
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
    },
    {
      label: 'Cash Inflow',
      value: fmt(summary.income ?? 0),
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Net Flow',
      value: fmt(summary.netFlow ?? 0),
      color: (summary.netFlow ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600',
      bg: 'bg-white',
      border: 'border-gray-100',
    },
    {
      label: 'Savings Rate',
      value: `${summary.savingsRate ?? 0}%`,
      color: (summary.savingsRate ?? 0) >= 20 ? 'text-emerald-600' : 'text-gray-700',
      bg: 'bg-white',
      border: 'border-gray-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map(({ label, value, color, bg, border }) => (
        <div key={label} className={cn('rounded-2xl border p-4 shadow-sm', bg, border)}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
          <p className={cn('text-xl font-bold leading-tight', color)}>{value}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalysisPage
// ---------------------------------------------------------------------------

/**
 * Full financial analysis page. Mobile-first layout:
 *   - Period selector
 *   - Quick stats strip (4 numbers)
 *   - Period summary card
 *   - Single-column detail cards (2-col on md+)
 *   - Charts (stacked on mobile, 2-col on lg+)
 *
 * @returns {JSX.Element}
 */
export default function AnalysisPage() {
  const { state } = useExpenses();
  const { expenses } = state;

  const {
    periodType, setPeriodType,
    currentPeriod,
    goToPrev, goToNext,
    canGoPrev, canGoNext,
    summary,
    periodExpenses,
  } = usePeriodAnalytics('monthly');

  useEffect(() => {
    logger.info('[AnalysisPage] Mounted | expenses:', expenses.length);
  }, [expenses.length]);

  return (
    <PageWrapper>
      <div className="space-y-4 sm:space-y-6">

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Understand your money flow — period by period
          </p>
        </div>

        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <EmptyState />
          </div>
        ) : (
          <>
            {/* Period selector */}
            <PeriodSelector
              periodType={periodType}
              onPeriodTypeChange={setPeriodType}
              currentPeriod={currentPeriod}
              onPrev={goToPrev}
              onNext={goToNext}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
            />

            {/* Quick stats strip — always visible above the fold on mobile */}
            <QuickStats summary={summary} currentPeriod={currentPeriod} />

            {/* Full analytics summary card */}
            <PeriodSummaryCard summary={summary} currentPeriod={currentPeriod} />

            {/* Spending velocity — day of week heatmap */}
            <SpendingVelocityCard periodExpenses={periodExpenses} />

            {/* Category + Payment methods — stacked on mobile, 2-col on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              <CategoryBreakdownCard periodExpenses={periodExpenses} />
              <PeriodPaymentBreakdown periodExpenses={periodExpenses} />
            </div>

            {/* Cash inflow sources */}
            <CashInflowSources periodExpenses={periodExpenses} />

            {/* Charts — stacked on mobile, 2-col on lg+ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <SpendingChart />
              <CategoryBreakdown />
            </div>
          </>
        )}

      </div>
    </PageWrapper>
  );
}
