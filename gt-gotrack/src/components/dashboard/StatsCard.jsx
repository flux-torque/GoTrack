/**
 * @file StatsCard.jsx
 * @description A stat summary card showing a title, monetary amount, delta percentage,
 * and an icon. Used in the dashboard stats row.
 * Supports color variants: default, income, expense, balance.
 */

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { APP_CONFIG } from '../../constants';

// ---------------------------------------------------------------------------
// Variant config
// ---------------------------------------------------------------------------

/**
 * @typedef {'default' | 'income' | 'expense' | 'balance'} StatsCardVariant
 */

/** @type {Record<StatsCardVariant, { icon: string, iconBg: string, iconColor: string, amountColor: string }>} */
const VARIANT_STYLES = {
  default: {
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    amountColor: 'text-gray-900',
  },
  income: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    amountColor: 'text-emerald-700',
  },
  expense: {
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-500',
    amountColor: 'text-rose-600',
  },
  balance: {
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
    amountColor: 'text-indigo-700',
  },
};

// ---------------------------------------------------------------------------
// StatsCard component
// ---------------------------------------------------------------------------

/**
 * Dashboard stat card.
 *
 * @param {Object} props
 * @param {string} props.title - Card label (e.g. "Total Balance")
 * @param {number} props.amount - Numeric amount in INR
 * @param {number} [props.delta] - Percentage change vs last month (positive = up)
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {StatsCardVariant} [props.variant='default'] - Color theme
 * @returns {JSX.Element}
 */
export function StatsCard({ title, amount, delta, icon: Icon, variant = 'default' }) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default;
  const isPositiveDelta = delta !== undefined && delta >= 0;

  /** Format amount as Indian currency string */
  const formattedAmount = new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">
      {/* Top row: icon + delta */}
      <div className="flex items-start justify-between mb-4">
        {/* Icon */}
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', styles.iconBg)}>
          <Icon size={20} className={styles.iconColor} />
        </div>

        {/* Delta badge */}
        {delta !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
              isPositiveDelta
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-rose-600 bg-rose-50'
            )}
          >
            {isPositiveDelta ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {Math.abs(delta)}%
          </div>
        )}
      </div>

      {/* Amount */}
      <p className={cn('text-2xl font-bold leading-tight', styles.amountColor)}>
        {APP_CONFIG.CURRENCY_SYMBOL}
        {formattedAmount}
      </p>

      {/* Title */}
      <p className="text-xs text-gray-400 uppercase tracking-wide mt-1 font-medium">
        {title}
      </p>
    </div>
  );
}
