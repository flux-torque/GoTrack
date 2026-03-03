/**
 * @file BudgetSetupCard.jsx
 * @description First-time budget setup card. Shown when the user has not yet
 * configured a savings target for the month. Displays a prompt and an inline
 * number input to set the target. Also doubles as the edit card when user
 * clicks "Change Target" on the budget page header.
 *
 * Props:
 *   onSave(amount: number) — called when user confirms their target
 *   initialValue?: number  — pre-fills input when editing existing target
 *   compact?: boolean      — renders a smaller version for the "edit" flow
 */

import { useState } from 'react';
import { PiggyBank, Target, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { APP_CONFIG } from '../../constants';
import logger from '../../utils/logger';

/**
 * Formats a number as INR display string.
 * @param {string} raw - raw input string
 * @returns {string}
 */
function sanitizeAmount(raw) {
  // Strip everything except digits and one decimal point
  return raw.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
}

/**
 * Budget setup / edit card component.
 *
 * @param {Object} props
 * @param {(amount: number) => void} props.onSave
 * @param {number} [props.initialValue]
 * @param {boolean} [props.compact=false]
 * @returns {JSX.Element}
 */
export function BudgetSetupCard({ onSave, initialValue, compact = false }) {
  const [rawValue, setRawValue] = useState(initialValue ? String(initialValue) : '');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setError('');
    setRawValue(sanitizeAmount(e.target.value));
  };

  const handleSave = () => {
    const amount = parseFloat(rawValue);
    if (!rawValue || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid savings target greater than ₹0.');
      return;
    }
    logger.info('[BudgetSetupCard] Saving target:', amount);
    onSave(amount);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium select-none">
            {APP_CONFIG.CURRENCY_SYMBOL}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={rawValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 10000"
            className={cn(
              'w-full pl-7 pr-3 py-2 rounded-xl border text-sm font-medium',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500',
              error ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-white'
            )}
          />
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <CheckCircle2 size={15} />
          Save
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm p-6 md:p-8">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
          <PiggyBank size={32} className="text-indigo-600" />
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-gray-900 mb-1">Set Your Monthly Budget</h2>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Tell GoTrack how much you can spend this month. Any cash inflows (deposits)
          automatically add to your spending power — and you can opt out individual transactions.
        </p>

        {/* Input */}
        <div className="w-full max-w-xs space-y-3">
          <label className="block text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Monthly Spending Budget
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-base font-semibold select-none">
              {APP_CONFIG.CURRENCY_SYMBOL}
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={rawValue}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 10,000"
              autoFocus
              className={cn(
                'w-full pl-9 pr-4 py-3 rounded-xl border text-base font-semibold',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'transition-colors',
                error ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-gray-50 focus:bg-white'
              )}
            />
          </div>
          {error && (
            <p className="text-xs text-rose-500 text-left">{error}</p>
          )}
          <button
            onClick={handleSave}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Target size={16} />
            Set Monthly Budget
          </button>
        </div>

        {/* Hint */}
        <p className="mt-4 text-xs text-gray-400">
          You can change this at any time from the Budget page.
        </p>
      </div>
    </div>
  );
}
