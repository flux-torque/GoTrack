/**
 * @file PeriodSelector.jsx
 * @description Combined period-type segmented control and period navigation bar.
 *
 * Left side: [ Weekly | Monthly | Quarterly ] toggle
 * Right side: ‹ [Period Label] › navigation with boundary-aware disabled states
 *
 * Props:
 *   periodType         - Active period type ('weekly'|'monthly'|'quarterly')
 *   onPeriodTypeChange - Called with new period type string
 *   currentPeriod      - Active PeriodKey ({ key, label, start, end })
 *   onPrev             - Navigate to previous period
 *   onNext             - Navigate to next period
 *   canGoPrev          - Whether previous navigation is allowed
 *   canGoNext          - Whether next navigation is allowed
 *
 * v1.6
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import logger from '../../utils/logger';

const PERIOD_TYPES = [
  { key: 'weekly',    label: 'Weekly' },
  { key: 'monthly',   label: 'Monthly' },
  { key: 'quarterly', label: 'Quarterly' },
];

/**
 * Period type + navigation control bar.
 *
 * @param {Object} props
 * @param {'weekly'|'monthly'|'quarterly'} props.periodType
 * @param {function(string): void} props.onPeriodTypeChange
 * @param {import('../../utils/periodAnalytics').PeriodKey} props.currentPeriod
 * @param {function(): void} props.onPrev
 * @param {function(): void} props.onNext
 * @param {boolean} props.canGoPrev
 * @param {boolean} props.canGoNext
 * @returns {JSX.Element}
 */
export function PeriodSelector({
  periodType,
  onPeriodTypeChange,
  currentPeriod,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}) {
  const handleTypeChange = (type) => {
    if (type === periodType) return;
    logger.info('[PeriodSelector] Type changed to:', type);
    onPeriodTypeChange(type);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* Period type toggle */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {PERIOD_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleTypeChange(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
              periodType === key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Period navigator */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
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

        <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
          {currentPeriod?.label ?? '—'}
        </span>

        <button
          onClick={onNext}
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
}
