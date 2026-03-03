/**
 * @file StatsRow.jsx
 * @description Dashboard stats row — 4 key metric cards: Balance, Cash Inflow,
 * Expenses, and Net Flow for the selected period.
 *
 * v3: Added Net Flow card, renamed "Income" → "Cash Inflow",
 *     increased to 4 cards in a responsive grid.
 */

import { useEffect } from 'react';
import { Wallet, ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { useExpenses } from '../../context/ExpenseContext';
import { cn } from '../../utils/cn';
import { APP_CONFIG } from '../../constants';
import logger from '../../utils/logger';

// ---------------------------------------------------------------------------
// Net Flow card
// ---------------------------------------------------------------------------

/**
 * Standalone net flow card — shows signed amount with color context.
 * Cannot reuse StatsCard since it always shows Math.abs(amount).
 *
 * @param {Object} props
 * @param {number} props.netFlow
 */
function NetFlowCard({ netFlow }) {
  const isPositive = netFlow >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const formattedAmount = new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(netFlow));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          isPositive ? 'bg-emerald-50' : 'bg-rose-50'
        )}>
          <Icon size={20} className={isPositive ? 'text-emerald-600' : 'text-rose-500'} />
        </div>
      </div>
      <p className={cn('text-2xl font-bold leading-tight', isPositive ? 'text-emerald-700' : 'text-rose-600')}>
        {isPositive ? '+' : '−'}{APP_CONFIG.CURRENCY_SYMBOL}{formattedAmount}
      </p>
      <p className="text-xs text-gray-400 uppercase tracking-wide mt-1 font-medium">
        Net Flow
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatsRow component
// ---------------------------------------------------------------------------

/**
 * Dashboard stats row — four metric cards for the selected period.
 *
 * @param {Object} props
 * @param {import('../../utils/periodAnalytics').PeriodSummary | null} props.summary
 * @param {'weekly' | 'monthly'} [props.periodType='monthly']
 * @returns {JSX.Element}
 */
export function StatsRow({ summary, periodType = 'monthly' }) {
  const { state } = useExpenses();
  const { expenses, balanceMeta } = state;

  // Prefer the closing balance from the imported statement.
  const totalBalance = balanceMeta?.closingBalance > 0
    ? balanceMeta.closingBalance
    : expenses.filter((e) => e.type === 'income').reduce((acc, e) => acc + e.amount, 0)
      - expenses.filter((e) => e.type === 'expense').reduce((acc, e) => acc + e.amount, 0);

  const periodIncome  = summary?.income  ?? 0;
  const periodExpense = summary?.expense ?? 0;
  const periodNetFlow = summary?.netFlow ?? 0;
  const periodLabel   = periodType === 'weekly' ? 'Week' : 'Month';

  useEffect(() => {
    logger.info('[StatsRow] income:', periodIncome, '| expense:', periodExpense, '| netFlow:', periodNetFlow);
  }, [periodIncome, periodExpense, periodNetFlow]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Balance"
        amount={totalBalance}
        icon={Wallet}
        variant="balance"
      />
      <StatsCard
        title={`${periodLabel} Cash Inflow`}
        amount={periodIncome}
        icon={ArrowDownLeft}
        variant="income"
      />
      <StatsCard
        title={`${periodLabel} Expenses`}
        amount={periodExpense}
        icon={ArrowUpRight}
        variant="expense"
      />
      <NetFlowCard netFlow={periodNetFlow} />
    </div>
  );
}
