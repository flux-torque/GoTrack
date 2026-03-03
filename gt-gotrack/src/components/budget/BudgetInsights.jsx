/**
 * @file BudgetInsights.jsx
 * @description Smart insight cards for the Budget Insights tab.
 * Shows 6 monthly spending analysis cards: peak day, largest tx, needs vs wants,
 * weekend vs weekday, payment method breakdown, and month rhythm (first/second half).
 *
 * v3: Updated for the simplified monthly budget model (no salary period concepts).
 */

import { format, parseISO } from 'date-fns';
import {
  CalendarDays, Receipt, Percent, Clock,
  CreditCard, TrendingUp, TrendingDown, Activity,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { APP_CONFIG } from '../../constants';
import { PAYMENT_TYPE_COLORS } from '../../utils/paymentTypeDetector';
import logger from '../../utils/logger';
import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n) {
  return APP_CONFIG.CURRENCY_SYMBOL + new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(n)));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InsightCard({ title, icon, iconBg, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          {icon}
        </div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      </div>
      {children}
    </div>
  );
}

function SegmentBar({ leftPct, leftColor, rightColor, leftLabel, rightLabel, leftAmt, rightAmt }) {
  const rightPct = 100 - leftPct;
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        <div className={cn('rounded-l-full transition-all duration-700', leftColor)} style={{ width: `${leftPct}%` }} />
        <div className={cn('rounded-r-full transition-all duration-700', rightColor)} style={{ width: `${rightPct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">
          <span className="font-semibold">{leftPct}%</span> {leftLabel} · {fmt(leftAmt)}
        </span>
        <span className="text-gray-500">{rightPct}% {rightLabel} · {fmt(rightAmt)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Monthly budget insights panel - 6 smart analysis cards.
 *
 * @param {Object} props
 * @param {import('../../utils/budgetEngine').MonthlyBudgetInsights} props.insights
 * @param {string} props.monthLabel - e.g. 'March 2026'
 * @returns {JSX.Element}
 */
export function BudgetInsights({ insights, monthLabel }) {
  useEffect(() => {
    logger.info('[BudgetInsights] Mounted for month:', monthLabel);
  }, [monthLabel]);

  const {
    topSpendingDay, largestTransaction,
    essentialAmt, discretionaryAmt, essentialPct,
    weekendAmt, weekdayAmt, weekendPct,
    paymentTypeSplit, firstHalfAmt, secondHalfAmt,
    avgDailySpend, isHighVariance, spendVariance, txCount,
  } = insights;

  const paymentEntries = Object.entries(paymentTypeSplit ?? {})
    .sort((a, b) => b[1].amount - a[1].amount);

  const firstHalfTotal = firstHalfAmt + secondHalfAmt;
  const firstHalfPct = firstHalfTotal > 0
    ? Math.round((firstHalfAmt / firstHalfTotal) * 100) : 0;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
        Spending Insights - {monthLabel}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* 1. Peak spending day */}
        <InsightCard title="Peak Spending Day" iconBg="bg-rose-50"
          icon={<CalendarDays size={15} className="text-rose-500" />}
        >
          {topSpendingDay ? (
            <>
              <p className="text-xl font-bold text-gray-900">{fmt(topSpendingDay.amount)}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {format(parseISO(topSpendingDay.date), 'EEEE, MMM d')}
              </p>
              <p className="text-xs text-gray-400 mt-1">Highest single-day spend this month</p>
            </>
          ) : <p className="text-sm text-gray-400">No spending data</p>}
        </InsightCard>

        {/* 2. Largest transaction */}
        <InsightCard title="Largest Transaction" iconBg="bg-orange-50"
          icon={<Receipt size={15} className="text-orange-500" />}
        >
          {largestTransaction ? (
            <>
              <p className="text-xl font-bold text-gray-900">{fmt(largestTransaction.amount)}</p>
              <p className="text-sm text-gray-500 mt-0.5 truncate" title={largestTransaction.title}>
                {largestTransaction.title}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {format(parseISO(largestTransaction.date), 'MMM d')} - {largestTransaction.category}
              </p>
            </>
          ) : <p className="text-sm text-gray-400">No transactions</p>}
        </InsightCard>

        {/* 3. Needs vs Wants */}
        <InsightCard title="Needs vs Wants" iconBg="bg-indigo-50"
          icon={<Percent size={15} className="text-indigo-500" />}
        >
          {essentialAmt + discretionaryAmt > 0 ? (
            <>
              <p className="text-xl font-bold text-gray-900 mb-1">{essentialPct}% essential</p>
              <p className="text-xs text-gray-400 mb-2">
                Food, transport, rent, health, utilities vs shopping and entertainment
              </p>
              <SegmentBar leftPct={essentialPct} leftColor="bg-indigo-400" rightColor="bg-pink-300"
                leftLabel="Needs" rightLabel="Wants" leftAmt={essentialAmt} rightAmt={discretionaryAmt} />
            </>
          ) : <p className="text-sm text-gray-400">No categorised data</p>}
        </InsightCard>

        {/* 4. Weekend vs Weekday */}
        <InsightCard title="Weekend vs Weekday" iconBg="bg-purple-50"
          icon={<Clock size={15} className="text-purple-500" />}
        >
          {weekendAmt + weekdayAmt > 0 ? (
            <>
              <p className="text-xl font-bold text-gray-900 mb-1">{weekendPct}% on weekends</p>
              <p className="text-xs text-gray-400 mb-2">
                {weekendPct > 40
                  ? 'Weekend spend is high - watch leisure and dining out.'
                  : 'Weekday spending dominates - likely routine expenses.'}
              </p>
              <SegmentBar leftPct={weekendPct} leftColor="bg-purple-400" rightColor="bg-gray-200"
                leftLabel="Weekend" rightLabel="Weekday" leftAmt={weekendAmt} rightAmt={weekdayAmt} />
            </>
          ) : <p className="text-sm text-gray-400">No spending data</p>}
        </InsightCard>

        {/* 5. Payment method breakdown */}
        <InsightCard title="Payment Methods" iconBg="bg-teal-50"
          icon={<CreditCard size={15} className="text-teal-500" />}
        >
          {paymentEntries.length > 0 ? (
            <div className="space-y-2.5">
              {paymentEntries.slice(0, 4).map(([type, { amount, count, pct }]) => {
                const colors = PAYMENT_TYPE_COLORS[type] ?? PAYMENT_TYPE_COLORS['Other'];
                return (
                  <div key={type}>
                    <div className="flex justify-between mb-0.5">
                      <span className={cn('text-xs font-semibold', colors.text)}>{type}</span>
                      <span className="text-xs text-gray-500">{fmt(amount)} - {count} tx</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: colors.hex }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400">No transaction data</p>}
        </InsightCard>

        {/* 6. Month rhythm - first vs second half */}
        <InsightCard title="Month Rhythm" iconBg="bg-sky-50"
          icon={firstHalfPct >= 60
            ? <TrendingDown size={15} className="text-sky-500" />
            : <TrendingUp size={15} className="text-sky-500" />}
        >
          {firstHalfTotal > 0 ? (
            <>
              <p className="text-xl font-bold text-gray-900 mb-1">{firstHalfPct}% first half</p>
              <p className="text-xs text-gray-400 mb-2">
                {firstHalfPct > 60
                  ? 'Heavy early-month spending - consider spreading it out.'
                  : firstHalfPct < 40
                    ? 'Back-loaded month - most expenses hit after day 15.'
                    : 'Spending is evenly spread across the month.'}
              </p>
              <SegmentBar leftPct={firstHalfPct} leftColor="bg-sky-400" rightColor="bg-sky-200"
                leftLabel="Days 1-15" rightLabel="Days 16+" leftAmt={firstHalfAmt} rightAmt={secondHalfAmt} />
            </>
          ) : <p className="text-sm text-gray-400">No spending data</p>}
        </InsightCard>

      </div>

      {/* Spending consistency banner */}
      <div className={cn(
        'rounded-2xl border px-5 py-4 flex items-start gap-3',
        isHighVariance ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'
      )}>
        <Activity size={16} className={cn('mt-0.5', isHighVariance ? 'text-amber-500' : 'text-emerald-500')} />
        <div>
          <p className={cn('text-sm font-semibold', isHighVariance ? 'text-amber-700' : 'text-emerald-700')}>
            {isHighVariance ? 'Inconsistent spending pattern' : 'Consistent spending pattern'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isHighVariance
              ? `Daily spend varies a lot (avg ${fmt(avgDailySpend)}/day, std dev ${fmt(spendVariance)}). A few high-spend days are inflating your totals.`
              : `Daily spend is relatively steady (avg ${fmt(avgDailySpend)}/day). Consistent patterns make budgeting easier.`}
            {' '}{txCount} transactions tracked this month.
          </p>
        </div>
      </div>
    </div>
  );
}
