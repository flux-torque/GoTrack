/**
 * @file AddExpenseForm.jsx
 * @description Form for manually recording a credit (income) or debit (expense) transaction.
 * Generates a unique transaction ID per entry. Dispatches ADD_EXPENSE to ExpenseContext on submit.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, Hash, RefreshCw, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

import { useExpenses } from '../../context/ExpenseContext';
import { CATEGORIES, ROUTES } from '../../constants';
import { generateTransactionId } from '../../utils/generateTransactionId';
import { apiFetch } from '../../services/api';
import { cn } from '../../utils/cn';
import logger from '../../utils/logger';
import { Input } from '../common/Input';
import { Select } from '../common/Select';

/** Today's date in YYYY-MM-DD format (used as default for the date picker) */
const TODAY = format(new Date(), 'yyyy-MM-dd');

/** Category options shaped for Select component */
const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c.id, label: c.label }));

/**
 * AddExpenseForm — full manual transaction entry form.
 * Handles both credit (income) and debit (expense) types.
 *
 * @returns {JSX.Element}
 */
export function AddExpenseForm() {
  const { addExpense, state: { expenses } } = useExpenses();
  const navigate = useNavigate();

  // ─── Form State ───────────────────────────────────────────────────────────
  const [type, setType] = useState('expense'); // 'expense' | 'income'
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(TODAY);
  const [note, setNote] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [txnId, setTxnId] = useState(() => generateTransactionId());
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Show opening balance field only when no transactions exist yet for the selected month
  const selectedMonth = date ? date.slice(0, 7) : null; // YYYY-MM
  const isFirstOfMonth = useMemo(() => {
    if (!selectedMonth) return false;
    return !expenses.some((e) => e.date?.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Regenerate txnId when date changes so the date portion stays accurate
  useEffect(() => {
    if (date) {
      setTxnId(generateTransactionId(parseISO(date)));
    }
  }, [date]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  /** Regenerate the transaction ID manually */
  const handleRegenerateTxnId = useCallback(() => {
    const newId = generateTransactionId(date ? parseISO(date) : new Date());
    setTxnId(newId);
    logger.info('[AddExpenseForm] Transaction ID regenerated:', newId);
  }, [date]);

  /** Validate fields, return true if valid */
  const validate = useCallback(() => {
    const errs = {};
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      errs.amount = 'Enter a valid amount greater than 0';
    }
    if (!title.trim()) {
      errs.title = 'Title is required';
    }
    if (!category) {
      errs.category = 'Select a category';
    }
    if (!date) {
      errs.date = 'Date is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [amount, title, category, date]);

  /** Handle form submission */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validate()) {
        logger.warn('[AddExpenseForm] Validation failed', errors);
        return;
      }

      setSaving(true);
      try {
        await addExpense({
          date,
          description: note.trim() || title.trim(),
          amount:      parseFloat(Number(amount).toFixed(2)),
          type,
          category,
        });

        // If an opening balance was provided for a new month, save it to DB
        if (isFirstOfMonth && openingBalance !== '' && !isNaN(Number(openingBalance))) {
          await apiFetch(`/statements/balances/${selectedMonth}`, {
            method: 'PATCH',
            body:   { opening_balance: parseFloat(Number(openingBalance).toFixed(2)) },
          });
          logger.info('[AddExpenseForm] Opening balance saved for', selectedMonth);
        }

        logger.info('[AddExpenseForm] Transaction saved');
        setSubmitted(true);
        setTimeout(() => navigate(ROUTES.EXPENSES), 900);
      } catch (err) {
        logger.error('[AddExpenseForm] Save failed:', err.message);
        setErrors({ submit: err.message || 'Failed to save. Please try again.' });
      } finally {
        setSaving(false);
      }
    },
    [validate, title, note, category, type, amount, date, addExpense, navigate, errors]
  );

  /** Reset form to defaults */
  const handleReset = useCallback(() => {
    setType('expense');
    setAmount('');
    setTitle('');
    setCategory('');
    setDate(TODAY);
    setNote('');
    setOpeningBalance('');
    setTxnId(generateTransactionId());
    setErrors({});
    setSubmitted(false);
    logger.info('[AddExpenseForm] Form reset');
  }, []);

  // ─── Success flash ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <CheckCircle className="w-12 h-12 text-emerald-500" />
        <p className="text-lg font-semibold text-gray-800">Transaction recorded!</p>
        <p className="text-sm text-gray-500">Redirecting to your expenses…</p>
      </div>
    );
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

      {/* ── Type Toggle: Debit / Credit ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Transaction Type
        </span>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all',
              type === 'expense'
                ? 'border-rose-400 bg-rose-50 text-rose-600'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            )}
          >
            <ArrowDownCircle className="w-4 h-4" />
            Debit
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-all',
              type === 'income'
                ? 'border-emerald-400 bg-emerald-50 text-emerald-600'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            )}
          >
            <ArrowUpCircle className="w-4 h-4" />
            Credit
          </button>
        </div>
      </div>

      {/* ── Amount ── */}
      <Input
        id="amount"
        label="Amount"
        type="number"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        error={errors.amount}
        required
        inputClassName="text-lg font-semibold"
        min="0"
        step="0.01"
      />

      {/* ── Title ── */}
      <Input
        id="title"
        label="Title"
        type="text"
        placeholder="e.g. Grocery run, Salary credit…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.title}
        required
      />

      {/* ── Category ── */}
      <Select
        id="category"
        label="Category"
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Select a category"
        error={errors.category}
        required
      />

      {/* ── Opening Balance (only shown for the first transaction of a month) ── */}
      {isFirstOfMonth && (
        <Input
          id="opening-balance"
          label="Opening Balance"
          type="number"
          placeholder="0.00"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          min="0"
          step="0.01"
          helper="First transaction of this month — set your account balance at the start of the month (optional)"
        />
      )}

      {/* ── Date ── */}
      <Input
        id="date"
        label="Date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        error={errors.date}
        required
        max={TODAY}
      />

      {/* ── Note (optional) ── */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="note"
          className="text-xs font-semibold text-gray-600 uppercase tracking-wide"
        >
          Note <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <textarea
          id="note"
          rows={3}
          placeholder="Add any extra details about this transaction…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-all resize-none placeholder:text-gray-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* ── Transaction ID (read-only, generated) ── */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Transaction ID
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5">
            <Hash className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="text-sm font-mono text-gray-600 tracking-wide">{txnId}</span>
          </div>
          <button
            type="button"
            onClick={handleRegenerateTxnId}
            title="Regenerate transaction ID"
            className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400">Auto-generated • used for reference only</p>
      </div>

      {/* ── Submit error ── */}
      {errors.submit && (
        <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">{errors.submit}</p>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleReset}
          className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={saving}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
            type === 'income'
              ? 'bg-emerald-500 hover:bg-emerald-600'
              : 'bg-indigo-600 hover:bg-indigo-700'
          )}
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : null}
          {saving ? 'Saving…' : `Record ${type === 'income' ? 'Credit' : 'Debit'}`}
        </button>
      </div>
    </form>
  );
}
