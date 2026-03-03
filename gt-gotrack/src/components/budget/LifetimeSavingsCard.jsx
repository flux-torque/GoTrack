/**
 * @file LifetimeSavingsCard.jsx
 * @description All-time savings summary card for the Budget page.
 * Shows total saved, average per period, best month, and a streak indicator
 * for consecutive periods that met the savings target.
 *
 * v1.7
 */

import { Trophy, Flame, TrendingUp, CalendarCheck2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { APP_CONFIG } from '../../constants';

/**
 * Formats a number as INR.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return APP_CONFIG.CURRENCY_SYMBOL + new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(n)));
}

/**
 * Individual stat row within the card.
 * @param {{ icon: React.ReactNode, label: string, value: string, sub?: string, color?: string }} props
 */
function StatRow({ icon, label, value, sub, color = 'text-indigo-500' }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-gray-50', color)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400">{label}</p>
        {sub && <p className="text-[10px] text-gray-300 truncate">{sub}</p>}
      </div>
      <p className="text-sm font-bold text-gray-800 tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Lifetime savings summary card.
 *
 * @param {Object} props
 * @param {import('../../utils/budgetEngine').LifetimeStats} props.stats
 * @param {number} props.targetSavings
 * @returns {JSX.Element}
 */
export function LifetimeSavingsCard({ stats, targetSavings }) {
  const {
    totalSaved, avgSavingsPerPeriod, bestSavings, bestPeriodLabel,
    periodsMetTarget, completedCount, currentStreak,
  } = stats;

  const hitRatePct = completedCount > 0
    ? Math.round((periodsMetTarget / completedCount) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Trophy size={16} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Lifetime Savings</h3>
          <p className="text-xs text-gray-400">Across all salary periods tracked</p>
        </div>
      </div>

      {/* Hero value */}
      <div className="mt-4 mb-3">
        <p className="text-3xl font-bold text-gray-900">{fmt(totalSaved)}</p>
        <p className="text-xs text-gray-400 mt-0.5">Total saved since tracking began</p>
      </div>

      {/* Stats rows */}
      <div className="mt-2">
        <StatRow
          icon={<TrendingUp size={15} />}
          label="Avg savings / period"
          value={fmt(avgSavingsPerPeriod)}
          color="text-indigo-500"
        />
        <StatRow
          icon={<Trophy size={15} />}
          label="Best period"
          sub={bestPeriodLabel}
          value={fmt(bestSavings)}
          color="text-amber-500"
        />
        <StatRow
          icon={<CalendarCheck2 size={15} />}
          label="Target hit rate"
          sub={`${periodsMetTarget} of ${completedCount} periods`}
          value={`${hitRatePct}%`}
          color="text-emerald-500"
        />
        <StatRow
          icon={<Flame size={15} />}
          label="Current streak"
          sub={currentStreak > 0 ? 'consecutive periods meeting target' : 'No streak yet'}
          value={currentStreak > 0 ? `${currentStreak} 🔥` : '0'}
          color={currentStreak >= 3 ? 'text-orange-500' : 'text-gray-400'}
        />
      </div>
    </div>
  );
}
