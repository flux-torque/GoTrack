/**
 * @file BudgetStatCard.jsx
 * @description Reusable key-metric card for the Budget page.
 * Displays a title, a large primary value, an optional sub-value/note,
 * and an optional trend indicator.
 *
 * Variants: default (white), positive (emerald), warning (amber), danger (rose), neutral (gray)
 */

import { cn } from '../../utils/cn';

/** @type {Record<string, { card: string, value: string, icon: string }>} */
const VARIANT_STYLES = {
  default:  { card: 'bg-white border-gray-100',    value: 'text-gray-900',    icon: 'text-indigo-500 bg-indigo-50' },
  positive: { card: 'bg-emerald-50 border-emerald-100', value: 'text-emerald-700', icon: 'text-emerald-600 bg-emerald-100' },
  warning:  { card: 'bg-amber-50 border-amber-100', value: 'text-amber-700',   icon: 'text-amber-600 bg-amber-100' },
  danger:   { card: 'bg-rose-50 border-rose-100',   value: 'text-rose-700',    icon: 'text-rose-600 bg-rose-100' },
  neutral:  { card: 'bg-gray-50 border-gray-100',   value: 'text-gray-700',    icon: 'text-gray-500 bg-gray-100' },
};

/**
 * Budget metric card.
 *
 * @param {Object} props
 * @param {string}   props.title        - Card label (e.g. 'Money Left to Spend')
 * @param {string}   props.value        - Primary display value (e.g. '₹12,400')
 * @param {string}   [props.subtext]    - Small secondary line below the value
 * @param {React.ReactNode} [props.icon] - Lucide icon element
 * @param {'default'|'positive'|'warning'|'danger'|'neutral'} [props.variant='default']
 * @param {string}   [props.className]  - Extra classes on the outer wrapper
 * @returns {JSX.Element}
 */
export function BudgetStatCard({ title, value, subtext, icon, variant = 'default', className }) {
  const styles = VARIANT_STYLES[variant] ?? VARIANT_STYLES.default;

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 flex flex-col gap-3 shadow-sm',
        styles.card,
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide leading-tight">
          {title}
        </p>
        {icon && (
          <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0', styles.icon)}>
            {icon}
          </div>
        )}
      </div>

      <div>
        <p className={cn('text-2xl font-bold leading-tight', styles.value)}>
          {value}
        </p>
        {subtext && (
          <p className="text-xs text-gray-400 mt-1 leading-snug">{subtext}</p>
        )}
      </div>
    </div>
  );
}
