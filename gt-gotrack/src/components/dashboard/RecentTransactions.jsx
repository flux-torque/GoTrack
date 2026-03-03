/**
 * @file RecentTransactions.jsx
 * @description Shows the most recent N transactions on the dashboard.
 * Each row has a category icon, name/note, date, and color-coded amount.
 * "View all" is disabled in v1 — shows a toast message.
 */

import { useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import {
  UtensilsCrossed, Car, ShoppingBag, Tv2, HeartPulse,
  Zap, Home, BookOpen, PiggyBank, MoreHorizontal, ArrowRight,
} from 'lucide-react';
import { useExpenses } from '../../context/ExpenseContext';
import { CATEGORY_MAP, EXPENSE_TYPE, RECENT_TRANSACTIONS_LIMIT, APP_CONFIG } from '../../constants';
import { cn } from '../../utils/cn';
import logger from '../../utils/logger';

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

/** @type {Record<string, React.ComponentType>} Maps category icon names to Lucide components */
const ICON_MAP = {
  UtensilsCrossed, Car, ShoppingBag, Tv2, HeartPulse,
  Zap, Home, BookOpen, PiggyBank, MoreHorizontal,
};

// ---------------------------------------------------------------------------
// TransactionRow sub-component
// ---------------------------------------------------------------------------

/**
 * Single transaction list row.
 * @param {Object} props
 * @param {import('../../data/mockData').Expense} props.expense
 * @returns {JSX.Element}
 */
function TransactionRow({ expense }) {
  const cat = CATEGORY_MAP[expense.category] ?? CATEGORY_MAP['other'];
  const IconComponent = ICON_MAP[cat.icon] ?? MoreHorizontal;
  const isExpense = expense.type === EXPENSE_TYPE.EXPENSE;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      {/* Category icon */}
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cat.bgColor)}>
        <IconComponent size={16} className={cat.color} />
      </div>

      {/* Title + note */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{expense.title}</p>
        <p className="text-xs text-gray-400 truncate">{expense.note || cat.label}</p>
      </div>

      {/* Date */}
      <p className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
        {format(parseISO(expense.date), 'MMM d')}
      </p>

      {/* Amount */}
      <p
        className={cn(
          'text-sm font-bold flex-shrink-0 min-w-[72px] text-right',
          isExpense ? 'text-rose-500' : 'text-emerald-600'
        )}
      >
        {isExpense ? '-' : '+'}
        {APP_CONFIG.CURRENCY_SYMBOL}
        {new Intl.NumberFormat(APP_CONFIG.LOCALE).format(expense.amount)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentTransactions component
// ---------------------------------------------------------------------------

/**
 * Dashboard recent transactions list.
 * Shows last N transactions from ExpenseContext, sorted by date descending.
 * @returns {JSX.Element}
 */
export function RecentTransactions() {
  const { state } = useExpenses();
  const { expenses } = state;

  const recent = [...expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, RECENT_TRANSACTIONS_LIMIT);

  useEffect(() => {
    logger.info('[RecentTransactions] Showing', recent.length, 'transactions');
  }, [recent.length]);

  const handleViewAll = () => {
    logger.warn('[RecentTransactions] View all clicked — disabled in v1');
    // TODO: Replace with proper toast in Phase 5
    alert('Full expense list coming in v1 — navigate to Expenses page!');
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">Recent Transactions</h2>
          <p className="text-xs text-gray-400">Latest activity</p>
        </div>
        <button
          onClick={handleViewAll}
          className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View all
          <ArrowRight size={12} />
        </button>
      </div>

      {/* List */}
      {recent.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
          <p className="text-sm">No transactions yet</p>
          <p className="text-xs mt-1">Add your first expense to get started</p>
        </div>
      ) : (
        <div>
          {recent.map((expense) => (
            <TransactionRow key={expense.id} expense={expense} />
          ))}
        </div>
      )}
    </div>
  );
}
