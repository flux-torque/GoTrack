/**
 * @file AnalysisPage.jsx
 * @description Dedicated financial analysis page.
 * Contains the full period analytics experience: period selector (Weekly/Monthly/Quarterly),
 * summary card (cash inflow, expenses, balances, savings rate, cash flow score, top categories),
 * plus the 6-month spending chart, category breakdown, payment method analysis,
 * cash inflow sources, and spending velocity card.
 *
 * v3: Renamed "Income" → "Cash Inflow", added enriched analysis sections.
 */

import { useEffect, useMemo } from 'react';
import { BarChart2, ArrowUpCircle, ArrowDownCircle, Activity, CreditCard } from 'lucide-react';
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

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

/**
 * Shown when no data has been imported yet.
 */
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
// Cash Inflow Sources
// ---------------------------------------------------------------------------

/**
 * Groups income transactions in the period by sender/title and shows top sources.
 * @param {{ periodExpenses: import('../context/ExpenseContext').Expense[] }} props
 */
function CashInflowSources({ periodExpenses }) {
  const incomeOnly = periodExpenses.filter((e) => e.type === 'income');
  const totalInflow = incomeOnly.reduce((s, e) => s + e.amount, 0);

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
      .map((s) => ({
        ...s,
        pct: totalInflow > 0 ? Math.round((s.total / totalInflow) * 100) : 0,
      }));
  }, [incomeOnly, totalInflow]);

  if (incomeOnly.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
            <ArrowUpCircle size={15} className="text-emerald-600" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Cash Inflow Sources</h3>
        </div>
        <p className="text-sm text-gray-400">No credits in this period.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
            <ArrowUpCircle size={15} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Cash Inflow Sources</h3>
            <p className="text-xs text-gray-400">{incomeOnly.length} credit transaction{incomeOnly.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <span className="text-sm font-bold text-emerald-600">{fmt(totalInflow)}</span>
      </div>
      <div className="space-y-2.5">
        {sources.map(({ title, total, count, pct, paymentType }) => {
          const ptColors = PAYMENT_TYPE_COLORS[paymentType] ?? PAYMENT_TYPE_COLORS['Other'];
          return (
            <div key={title}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{title}</p>
                  <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0', ptColors.bg, ptColors.text)}>
                    {paymentType}
                  </span>
                  <span className="text-[10px] text-gray-400 shrink-0">{count} tx</span>
                </div>
                <span className="text-xs font-semibold text-gray-800 tabular-nums shrink-0">{fmt(total)}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payment method analysis for the period
// ---------------------------------------------------------------------------

/**
 * Shows debit transaction breakdown by payment method for the selected period.
 * @param {{ periodExpenses: import('../context/ExpenseContext').Expense[] }} props
 */
function PeriodPaymentBreakdown({ periodExpenses }) {
  const debits = periodExpenses.filter((e) => e.type === 'expense');
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
      .map((s) => ({
        ...s,
        pct: totalDebit > 0 ? Math.round((s.total / totalDebit) * 100) : 0,
      }));
  }, [debits, totalDebit]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
          <CreditCard size={15} className="text-violet-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Payment Methods</h3>
          <p className="text-xs text-gray-400">Debits by payment rail</p>
        </div>
      </div>
      {breakdown.length > 0 ? (
        <div className="space-y-2.5">
          {breakdown.map(({ type, total, count, pct }) => {
            const colors = PAYMENT_TYPE_COLORS[type] ?? PAYMENT_TYPE_COLORS['Other'];
            return (
              <div key={type}>
                <div className="flex justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('text-xs font-semibold', colors.text)}>{type}</span>
                    <span className="text-[10px] text-gray-400">{count} tx</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 tabular-nums">{fmt(total)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: colors.hex }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No debit transactions in this period.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spending velocity card
// ---------------------------------------------------------------------------

/**
 * Shows spending spread across weekdays for the period.
 * @param {{ periodExpenses: import('../context/ExpenseContext').Expense[] }} props
 */
function SpendingVelocityCard({ periodExpenses }) {
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const debits = periodExpenses.filter((e) => e.type === 'expense');

  const dayTotals = useMemo(() => {
    const totals = [0, 0, 0, 0, 0, 0, 0];
    for (const e of debits) {
      const dayIdx = getDay(parseISO(e.date));
      totals[dayIdx] += e.amount;
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-sky-50 rounded-xl flex items-center justify-center">
          <Activity size={15} className="text-sky-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Spending by Day of Week</h3>
          <p className="text-xs text-gray-400">
            {topDay && topDay.amount > 0
              ? `Most active: ${topDay.label} (${fmt(topDay.amount)})`
              : 'No spending data'}
          </p>
        </div>
      </div>
      {totalDebit > 0 ? (
        <div className="flex items-end gap-2 h-20">
          {dayTotals.map(({ label, amount, pct }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center h-14">
                <div
                  className="w-full rounded-t-md transition-all duration-700"
                  style={{
                    height: `${Math.max(4, pct)}%`,
                    backgroundColor: pct === 100 ? '#6366f1' : '#e0e7ff',
                    minHeight: amount > 0 ? '4px' : '0',
                  }}
                />
              </div>
              <span className="text-[10px] text-gray-400 font-medium">{label}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No spending data for this period.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalysisPage
// ---------------------------------------------------------------------------

/**
 * Full financial analysis page with period navigation, summary card, and enriched analytics.
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
      <div className="space-y-6">

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
            {/* Period selector: type toggle + navigator */}
            <PeriodSelector
              periodType={periodType}
              onPeriodTypeChange={setPeriodType}
              currentPeriod={currentPeriod}
              onPrev={goToPrev}
              onNext={goToNext}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
            />

            {/* Analytics summary card */}
            <PeriodSummaryCard summary={summary} currentPeriod={currentPeriod} />

            {/* Charts — 6-month overview + category breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SpendingChart />
              <CategoryBreakdown />
            </div>

            {/* Enriched period analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <CashInflowSources periodExpenses={periodExpenses} />
              <PeriodPaymentBreakdown periodExpenses={periodExpenses} />
            </div>

            {/* Spending velocity */}
            <SpendingVelocityCard periodExpenses={periodExpenses} />
          </>
        )}

      </div>
    </PageWrapper>
  );
}
