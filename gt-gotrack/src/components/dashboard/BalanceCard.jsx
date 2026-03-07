/**
 * @file BalanceCard.jsx
 * @description Dashboard balance card with editable opening balance and
 * expected balance for mismatch detection.
 *
 * Shows:
 *  - Computed current balance (opening + income - expenses for the month)
 *  - Editable opening balance (saved to DB via PATCH /statements/balances/:month)
 *  - Editable expected balance (saved in localStorage)
 *  - Mismatch chip if expected ≠ computed
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Wallet, Pencil, Check, X, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { APP_CONFIG } from '../../constants';
import { useMonthlyBalance } from '../../hooks/useMonthlyBalance';
import logger from '../../utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @param {number} n @returns {string} */
function fmtAmount(n) {
  return new Intl.NumberFormat(APP_CONFIG.LOCALE, { maximumFractionDigits: 0 }).format(n);
}

// ---------------------------------------------------------------------------
// InlineEditField
// ---------------------------------------------------------------------------

/**
 * Displays a numeric value with a pencil-icon edit trigger.
 * On click, switches to an inline input that saves on Enter / ✓ button.
 *
 * @param {Object}           props
 * @param {number|null}      props.value       - Current value (null → show "tap to set")
 * @param {(n:number)=>void} props.onSave      - Called with parsed float on confirm
 * @param {boolean}          [props.saving]    - Disables confirm while async save is in flight
 * @param {string}           [props.placeholder]
 */
function InlineEditField({ value, onSave, saving, placeholder = '0.00' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(value !== null ? String(value) : '');
    setEditing(true);
  };

  const confirm = () => {
    const num = parseFloat(draft);
    if (!isNaN(num) && num >= 0) onSave(num);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400">{APP_CONFIG.CURRENCY_SYMBOL}</span>
        <input
          ref={inputRef}
          type="number"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel(); }}
          className="w-20 text-xs border border-indigo-300 rounded-md px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-indigo-100"
          placeholder={placeholder}
          min="0"
          step="0.01"
        />
        <button onClick={confirm} disabled={saving} className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40">
          <Check size={12} />
        </button>
        <button onClick={cancel} className="text-gray-400 hover:text-gray-600">
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <button onClick={startEdit} className="flex items-center gap-1 group/edit text-left">
      <span className={cn('text-xs font-medium', value !== null ? 'text-gray-700' : 'text-gray-300 italic')}>
        {value !== null ? `${APP_CONFIG.CURRENCY_SYMBOL}${fmtAmount(value)}` : 'tap to set'}
      </span>
      <Pencil size={10} className="text-gray-300 group-hover/edit:text-indigo-400 transition-colors" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// BalanceCard
// ---------------------------------------------------------------------------

/**
 * Dashboard balance card.
 * Uses useMonthlyBalance hook to compute and display the current month's balance.
 *
 * @returns {JSX.Element}
 */
export function BalanceCard() {
  const {
    computedBalance,
    openingBalance,
    expectedBalance,
    mismatch,
    saving,
    updateOpeningBalance,
    updateExpectedBalance,
  } = useMonthlyBalance();

  const handleSaveOpening = useCallback(async (amount) => {
    try {
      await updateOpeningBalance(amount);
    } catch (err) {
      logger.error('[BalanceCard] Failed to save opening balance:', err.message);
    }
  }, [updateOpeningBalance]);

  const hasMismatch = mismatch !== null && Math.abs(mismatch) > 0.5;
  const mismatchPositive = mismatch > 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100">

      {/* Top row: icon + mismatch chip */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-50">
          <Wallet size={20} className="text-indigo-600" />
        </div>

        {hasMismatch && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
            mismatchPositive ? 'text-amber-700 bg-amber-50' : 'text-rose-600 bg-rose-50'
          )}>
            <AlertTriangle size={11} />
            {mismatchPositive
              ? `+${APP_CONFIG.CURRENCY_SYMBOL}${fmtAmount(mismatch)}`
              : `${APP_CONFIG.CURRENCY_SYMBOL}${fmtAmount(Math.abs(mismatch))} missing`}
          </div>
        )}
      </div>

      {/* Main balance amount */}
      <p className="text-2xl font-bold leading-tight text-indigo-700">
        {computedBalance !== null
          ? `${APP_CONFIG.CURRENCY_SYMBOL}${fmtAmount(computedBalance)}`
          : <span className="text-gray-300">—</span>}
      </p>
      <p className="text-xs text-gray-400 uppercase tracking-wide mt-1 font-medium">
        Current Balance
      </p>

      {/* Editable rows: opening + expected */}
      <div className="border-t border-gray-100 mt-3 pt-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Opening</span>
          <InlineEditField
            value={openingBalance}
            onSave={handleSaveOpening}
            saving={saving}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Expected</span>
          <InlineEditField
            value={expectedBalance}
            onSave={updateExpectedBalance}
          />
        </div>
      </div>

    </div>
  );
}
