/**
 * @file ExpensesPage.jsx
 * @description Transactions page — full-featured transaction list with:
 *   - Period filter (All / Weekly / Monthly)
 *   - Date range filter (From → To date pickers)
 *   - Search, sort, and payment type filter
 *   - Edit mode: multi-select with bulk delete / budget-exclude
 *   - Delete animation (fade + slide before actual removal)
 *   - Insights tab
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Upload, Trash2, ArrowDownCircle, ArrowUpCircle, AlertTriangle,
  MinusCircle, PlusCircle, Search, X, SlidersHorizontal,
  LayoutList, Lightbulb, CreditCard, TrendingDown,
  ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight,
  CalendarDays, CheckSquare, Square, Edit2, Calendar,
} from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';

import { PageWrapper } from '../components/layout/PageWrapper';
import { BankUploadModal } from '../components/common/BankUploadModal';
import { useExpenses } from '../context/ExpenseContext';
import { usePeriodAnalytics } from '../hooks/usePeriodAnalytics';
import { CATEGORY_MAP, APP_CONFIG } from '../constants';
import {
  PAYMENT_TYPES, PAYMENT_TYPE_COLORS, PAYMENT_TYPE_LIST,
  detectPaymentType, summariseByPaymentType,
} from '../utils/paymentTypeDetector';
import { cn } from '../utils/cn';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** @param {string} dateStr @returns {string} */
function formatGroupHeader(dateStr) {
  const d = parseISO(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE, MMM d');
}

/** @param {number} amount @returns {string} */
function formatAmount(amount) {
  return new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
}

/** @param {number} n @returns {string} */
function fmt(n) {
  return APP_CONFIG.CURRENCY_SYMBOL + new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(n)));
}

/**
 * Groups expenses by date and sorts them.
 * @param {import('../context/ExpenseContext').Expense[]} expenses
 * @param {'date-desc'|'date-asc'|'amount-desc'|'amount-asc'} sortOrder
 */
function groupAndSort(expenses, sortOrder) {
  const sorted = [...expenses].sort((a, b) => {
    if (sortOrder === 'date-desc') return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
    if (sortOrder === 'date-asc')  return a.date.localeCompare(b.date) || a.id.localeCompare(b.id);
    if (sortOrder === 'amount-desc') return b.amount - a.amount;
    if (sortOrder === 'amount-asc')  return a.amount - b.amount;
    return 0;
  });

  if (sortOrder === 'date-desc' || sortOrder === 'date-asc') {
    const map = {};
    for (const exp of sorted) {
      if (!map[exp.date]) map[exp.date] = [];
      map[exp.date].push(exp);
    }
    const dateKeys = Object.keys(map);
    if (sortOrder === 'date-asc') dateKeys.sort((a, b) => a.localeCompare(b));
    else dateKeys.sort((a, b) => b.localeCompare(a));
    return dateKeys.map((date) => ({ date, items: map[date] }));
  }

  return [{ date: null, items: sorted }];
}

/** @param {string} categoryId @returns {string} */
function getCategoryEmoji(categoryId) {
  const map = {
    food: '🍽️', transport: '🚗', shopping: '🛍️',
    entertainment: '🎬', health: '🏥', utilities: '⚡',
    rent: '🏠', education: '📚', savings: '💰', other: '💳',
  };
  return map[categoryId] || '💳';
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: 'date-desc',   label: 'Newest first',   icon: ArrowDown },
  { value: 'date-asc',    label: 'Oldest first',   icon: ArrowUp },
  { value: 'amount-desc', label: 'Highest amount', icon: TrendingDown },
  { value: 'amount-asc',  label: 'Lowest amount',  icon: ArrowUpDown },
];

// ---------------------------------------------------------------------------
// Period filter bar
// ---------------------------------------------------------------------------

const PERIOD_TYPE_OPTIONS = [
  { value: 'all',     label: 'All' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly',  label: 'Weekly' },
];

/**
 * Period type toggle + ‹ Period › navigation.
 */
function PeriodFilterBar({
  periodType, onPeriodTypeChange,
  currentPeriod, onPrev, onNext, canPrev, canNext,
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1">
        <CalendarDays size={14} className="text-gray-400 mr-1" />
        {PERIOD_TYPE_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onPeriodTypeChange(value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              periodType === value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {periodType !== 'all' && currentPeriod && (
        <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            className={cn(
              'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
              canPrev ? 'hover:bg-white text-gray-600' : 'text-gray-300 cursor-not-allowed'
            )}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[110px] text-center">
            {currentPeriod.label}
          </span>
          <button
            onClick={onNext}
            disabled={!canNext}
            className={cn(
              'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
              canNext ? 'hover:bg-white text-gray-600' : 'text-gray-300 cursor-not-allowed'
            )}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Date Range Filter
// ---------------------------------------------------------------------------

/**
 * Expandable date range filter (From → To).
 *
 * @param {Object} props
 * @param {string} props.dateFrom  - YYYY-MM-DD
 * @param {string} props.dateTo    - YYYY-MM-DD
 * @param {function} props.onFromChange
 * @param {function} props.onToChange
 * @param {function} props.onClear
 * @param {boolean} props.isOpen
 * @param {function} props.onToggle
 */
function DateRangeFilter({ dateFrom, dateTo, onFromChange, onToChange, onClear, isOpen, onToggle }) {
  const hasFilter = dateFrom || dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors',
          hasFilter
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
        )}
      >
        <Calendar size={12} />
        {hasFilter ? `${dateFrom || '…'} → ${dateTo || '…'}` : 'Date Range'}
        {hasFilter && (
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="ml-1 text-indigo-400 hover:text-indigo-700"
          >
            <X size={11} />
          </button>
        )}
      </button>

      {isOpen && (
        <div className="flex items-center gap-2 flex-wrap animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onFromChange(e.target.value)}
              max={dateTo || undefined}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-700"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => onToChange(e.target.value)}
              min={dateFrom || undefined}
              className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-700"
            />
          </div>
          {hasFilter && (
            <button
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-rose-500 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ExpenseRow
// ---------------------------------------------------------------------------

/**
 * Single transaction row. In edit mode shows a checkbox + click-to-select.
 * Supports delete animation via isDeleting prop (fade + slide before removal).
 *
 * @param {Object} props
 * @param {Object} props.expense
 * @param {function} props.onDelete
 * @param {function} props.onToggleBudgetExclude
 * @param {boolean} [props.showDate]
 * @param {boolean} [props.editMode]
 * @param {boolean} [props.isSelected]
 * @param {function} [props.onToggleSelect]
 * @param {boolean} [props.isDeleting]
 */
function ExpenseRow({
  expense, onDelete, onToggleBudgetExclude, showDate = false,
  editMode = false, isSelected = false, onToggleSelect, isDeleting = false,
}) {
  const [showActions, setShowActions] = useState(false);
  const category = CATEGORY_MAP[expense.category] || CATEGORY_MAP['other'];
  const isExpense = expense.type === 'expense';
  const isExcluded = expense.budgetExcluded;
  const paymentType = detectPaymentType(expense.note);
  const ptColors = PAYMENT_TYPE_COLORS[paymentType] ?? PAYMENT_TYPE_COLORS[PAYMENT_TYPES.OTHER];

  const handleRowClick = () => {
    if (editMode && onToggleSelect) onToggleSelect(expense.id);
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 transition-all duration-300 rounded-xl',
        isDeleting
          ? 'opacity-0 -translate-x-3 bg-rose-50 pointer-events-none'
          : '',
        !isDeleting && isSelected && 'bg-indigo-50',
        !isDeleting && !isSelected && 'hover:bg-gray-50',
        editMode && !isDeleting && 'cursor-pointer',
        isExcluded && !isSelected && 'opacity-60',
      )}
      onMouseEnter={() => !editMode && setShowActions(true)}
      onMouseLeave={() => !editMode && setShowActions(false)}
      onClick={handleRowClick}
    >
      {/* Checkbox — only in edit mode */}
      {editMode && (
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => onToggleSelect && onToggleSelect(expense.id)}>
            {isSelected
              ? <CheckSquare size={16} className="text-indigo-600" />
              : <Square size={16} className="text-gray-300" />}
          </button>
        </div>
      )}

      <div className={cn('flex items-center justify-center w-9 h-9 rounded-xl shrink-0', category.bgColor)}>
        <span className="text-base">{getCategoryEmoji(expense.category)}</span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-gray-800 truncate">{expense.title}</p>
          {isExcluded && (
            <span className="shrink-0 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              Not in budget
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full', ptColors.bg, ptColors.text)}>
            {paymentType}
          </span>
          {showDate && (
            <span className="text-[10px] text-gray-400">{format(parseISO(expense.date), 'MMM d')}</span>
          )}
          {expense.note && expense.note !== expense.title && (
            <p className="text-xs text-gray-400 truncate">{expense.note.slice(0, 50)}</p>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className={cn(
          'text-sm font-bold',
          isExcluded ? 'text-gray-400' : isExpense ? 'text-rose-600' : 'text-emerald-600'
        )}>
          {isExpense ? '−' : '+'}{APP_CONFIG.CURRENCY_SYMBOL}{formatAmount(expense.amount)}
        </p>
        <div className="flex items-center justify-end gap-1 mt-0.5">
          {isExpense
            ? <ArrowDownCircle size={10} className="text-rose-400" />
            : <ArrowUpCircle size={10} className="text-emerald-400" />}
          <span className="text-[10px] text-gray-400">{isExpense ? 'Debit' : 'Credit'}</span>
        </div>
      </div>

      {/* Action buttons — only in non-edit mode, on hover */}
      {!editMode && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleBudgetExclude(expense.id); }}
            title={isExcluded ? 'Include in budget' : 'Exclude from budget'}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full transition-all duration-150 shrink-0',
              showActions ? 'opacity-100' : 'opacity-0',
              isExcluded
                ? 'bg-indigo-50 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-600'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
            )}
          >
            {isExcluded ? <PlusCircle size={13} /> : <MinusCircle size={13} />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-full transition-all duration-150 shrink-0',
              showActions ? 'opacity-100 bg-rose-50 text-rose-400 hover:bg-rose-100 hover:text-rose-600' : 'opacity-0'
            )}
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryBar
// ---------------------------------------------------------------------------

/** @param {{ expenses: Object[], periodLabel?: string }} props */
function SummaryBar({ expenses, periodLabel }) {
  const totalExpense = expenses.filter((e) => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const totalIncome  = expenses.filter((e) => e.type === 'income').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="flex items-center gap-4 px-5 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm">
      <span className="text-gray-500 font-medium mr-auto">
        {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
        {periodLabel && <span className="text-gray-400"> · {periodLabel}</span>}
      </span>
      <div className="flex items-center gap-1.5">
        <ArrowDownCircle size={14} className="text-rose-400" />
        <span className="text-rose-600 font-semibold">{APP_CONFIG.CURRENCY_SYMBOL}{formatAmount(totalExpense)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <ArrowUpCircle size={14} className="text-emerald-400" />
        <span className="text-emerald-600 font-semibold">{APP_CONFIG.CURRENCY_SYMBOL}{formatAmount(totalIncome)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar (search + sort + payment type)
// ---------------------------------------------------------------------------

/**
 * Search + sort + payment type filter controls.
 */
function FilterBar({
  search, onSearchChange,
  sortOrder, onSortChange,
  paymentFilter, onPaymentFilterChange,
  showSortDropdown, onToggleSortDropdown,
}) {
  const activeSort = SORT_OPTIONS.find((s) => s.value === sortOrder);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => onToggleSortDropdown(!showSortDropdown)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 bg-white transition-colors text-gray-600"
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">{activeSort?.label ?? 'Sort'}</span>
          </button>
          {showSortDropdown && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
              {SORT_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => { onSortChange(value); onToggleSortDropdown(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors',
                    sortOrder === value
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => onPaymentFilterChange(null)}
          className={cn(
            'px-3 py-1 text-xs font-medium rounded-full transition-colors',
            paymentFilter === null
              ? 'bg-gray-800 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          All
        </button>
        {PAYMENT_TYPE_LIST.map((type) => {
          const colors = PAYMENT_TYPE_COLORS[type];
          const isActive = paymentFilter === type;
          return (
            <button
              key={type}
              onClick={() => onPaymentFilterChange(isActive ? null : type)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                isActive ? cn(colors.bg, colors.text, 'ring-1') : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulk Selection Action Bar (floating at bottom)
// ---------------------------------------------------------------------------

/**
 * Floating action bar that appears when rows are selected in edit mode.
 *
 * @param {Object} props
 * @param {number} props.selectedCount
 * @param {number} props.totalVisible
 * @param {function} props.onSelectAll
 * @param {function} props.onBulkDelete
 * @param {function} props.onBulkExclude
 * @param {function} props.onBulkInclude
 * @param {function} props.onCancel
 */
function SelectionBar({
  selectedCount, totalVisible,
  onSelectAll, onBulkDelete, onBulkExclude, onBulkInclude, onCancel,
}) {
  const allSelected = selectedCount === totalVisible && totalVisible > 0;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-2xl border border-gray-700 flex-wrap max-w-[95vw]">
      <button
        onClick={onSelectAll}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors shrink-0"
      >
        {allSelected
          ? <CheckSquare size={14} className="text-indigo-400" />
          : <Square size={14} />}
        {allSelected ? 'Deselect all' : `Select all ${totalVisible}`}
      </button>

      <div className="w-px h-4 bg-gray-700 mx-1" />

      <span className="text-xs font-semibold text-indigo-300 shrink-0">
        {selectedCount} selected
      </span>

      {selectedCount > 0 && (
        <>
          <div className="w-px h-4 bg-gray-700 mx-1" />
          <button
            onClick={onBulkExclude}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors shrink-0"
          >
            <MinusCircle size={13} className="text-gray-400" />
            Exclude
          </button>
          <button
            onClick={onBulkInclude}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors shrink-0"
          >
            <PlusCircle size={13} className="text-indigo-400" />
            Include
          </button>
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shrink-0"
          >
            <Trash2 size={13} />
            Delete {selectedCount}
          </button>
        </>
      )}

      <div className="w-px h-4 bg-gray-700 mx-1" />
      <button
        onClick={onCancel}
        className="text-xs text-gray-400 hover:text-white transition-colors shrink-0"
      >
        Done
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Insights panel
// ---------------------------------------------------------------------------

function PaymentInsightRow({ type, totalAmount, count, pct, hex }) {
  const colors = PAYMENT_TYPE_COLORS[type] ?? PAYMENT_TYPE_COLORS[PAYMENT_TYPES.OTHER];
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-semibold', colors.text)}>{type}</span>
          <span className="text-[10px] text-gray-400">{count} tx</span>
        </div>
        <span className="text-xs font-semibold text-gray-700 tabular-nums">{fmt(totalAmount)}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: hex }}
        />
      </div>
    </div>
  );
}

/**
 * Transaction insights panel — respects the period filter.
 * @param {{ expenses: Object[], periodLabel?: string }} props
 */
function TransactionInsights({ expenses, periodLabel }) {
  const expenseOnly = expenses.filter((e) => e.type === 'expense');
  const incomeOnly  = expenses.filter((e) => e.type === 'income');
  const totalSpent  = expenseOnly.reduce((s, e) => s + e.amount, 0);
  const totalIncome = incomeOnly.reduce((s, e) => s + e.amount, 0);

  const paymentSummary = useMemo(() => summariseByPaymentType(expenseOnly), [expenseOnly]);

  const topMerchants = useMemo(() => {
    const map = {};
    for (const e of expenseOnly) {
      if (!map[e.title]) map[e.title] = { title: e.title, total: 0, count: 0, category: e.category };
      map[e.title].total += e.amount;
      map[e.title].count += 1;
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [expenseOnly]);

  const categorySummary = useMemo(() => {
    const map = {};
    for (const e of expenseOnly) {
      if (!map[e.category]) map[e.category] = { category: e.category, total: 0, count: 0 };
      map[e.category].total += e.amount;
      map[e.category].count += 1;
    }
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map((c) => ({ ...c, pct: totalSpent > 0 ? Math.round((c.total / totalSpent) * 100) : 0 }));
  }, [expenseOnly, totalSpent]);

  const incomePaymentSummary = useMemo(() => summariseByPaymentType(incomeOnly), [incomeOnly]);

  if (expenses.length === 0) {
    return <div className="text-center py-12 text-gray-400 text-sm">No transactions to analyse for this period.</div>;
  }

  return (
    <div className="space-y-5">
      {periodLabel && (
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
          Insights — {periodLabel}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Debits',  value: fmt(totalSpent),            color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-100' },
          { label: 'Total Credits', value: fmt(totalIncome),           color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Debit Count',   value: String(expenseOnly.length), color: 'text-gray-700',    bg: 'bg-white border-gray-100' },
          { label: 'Credit Count',  value: String(incomeOnly.length),  color: 'text-gray-700',    bg: 'bg-white border-gray-100' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={cn('rounded-2xl border p-4 shadow-sm', bg)}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
            <p className={cn('text-xl font-bold', color)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
              <CreditCard size={15} className="text-violet-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Debit by Payment Method</h3>
              <p className="text-xs text-gray-400">How you spend</p>
            </div>
          </div>
          {paymentSummary.length > 0
            ? <div className="space-y-3">{paymentSummary.map((s) => <PaymentInsightRow key={s.type} {...s} />)}</div>
            : <p className="text-sm text-gray-400">No debit data</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center">
              <TrendingDown size={15} className="text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Top Merchants</h3>
              <p className="text-xs text-gray-400">Largest spend destinations</p>
            </div>
          </div>
          {topMerchants.length > 0 ? (
            <div className="space-y-2.5">
              {topMerchants.map(({ title, total, count, category }) => {
                const cat = CATEGORY_MAP[category] || CATEGORY_MAP['other'];
                return (
                  <div key={title} className="flex items-center gap-2">
                    <span className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-xs shrink-0', cat.bgColor)}>
                      {getCategoryEmoji(category)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 truncate">{title}</p>
                      <p className="text-[10px] text-gray-400">{count} transaction{count !== 1 ? 's' : ''}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-800 tabular-nums shrink-0">{fmt(total)}</span>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400">No data</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <LayoutList size={15} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Spending by Category</h3>
              <p className="text-xs text-gray-400">Where your money goes</p>
            </div>
          </div>
          {categorySummary.length > 0 ? (
            <div className="space-y-2.5">
              {categorySummary.map(({ category, total, count, pct }) => {
                const cat = CATEGORY_MAP[category] || CATEGORY_MAP['other'];
                return (
                  <div key={category}>
                    <div className="flex justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{getCategoryEmoji(category)}</span>
                        <span className="text-xs font-medium text-gray-700">{cat.label}</span>
                        <span className="text-[10px] text-gray-400">{count} tx</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 tabular-nums">{fmt(total)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: cat.hex }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-sm text-gray-400">No spending data</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <ArrowUpCircle size={15} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Cash Inflow by Method</h3>
              <p className="text-xs text-gray-400">How money comes in</p>
            </div>
          </div>
          {incomePaymentSummary.length > 0
            ? <div className="space-y-3">{incomePaymentSummary.map((s) => <PaymentInsightRow key={s.type} {...s} />)}</div>
            : <p className="text-sm text-gray-400">No credit data</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'transactions', label: 'Transactions', icon: LayoutList },
  { id: 'insights',     label: 'Insights',     icon: Lightbulb },
];

function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            active === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState / ClearConfirm
// ---------------------------------------------------------------------------

function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
        <Upload size={28} className="text-indigo-400" />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-1">No transactions yet</h3>
      <p className="text-sm text-gray-400 max-w-xs mb-6">
        Upload a bank statement to automatically import and categorize your transactions.
      </p>
      <button
        onClick={onUpload}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
      >
        <Upload size={15} />
        Upload Statement
      </button>
    </div>
  );
}

function ClearConfirm({ count, onConfirm, onCancel }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm">
      <AlertTriangle size={15} className="text-amber-500 shrink-0" />
      <span className="text-amber-700 flex-1">
        Clear all <span className="font-semibold">{count}</span> transactions?
      </span>
      <button onClick={onConfirm} className="px-3 py-1 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition-colors">
        Clear
      </button>
      <button onClick={onCancel} className="px-3 py-1 bg-white border border-gray-200 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors">
        Cancel
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * ExpensesPage — transactions list with period filter, date range filter,
 * search, sort, payment filter, multi-select edit mode, and insights.
 * @returns {JSX.Element}
 */
export default function ExpensesPage() {
  const { state, deleteExpense, toggleBudgetExclude, clearExpenses } = useExpenses();
  const expenses = state.expenses;

  const [modalOpen, setModalOpen]               = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeTab, setActiveTab]               = useState('transactions');

  // Period filter
  const [periodType, setPeriodType]             = useState('all');
  const [syncedPeriodType, setSyncedPeriodType] = useState('monthly');

  // Search / sort / payment filter
  const [search, setSearch]               = useState('');
  const [sortOrder, setSortOrder]         = useState('date-desc');
  const [paymentFilter, setPaymentFilter] = useState(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Date range filter
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Edit (multi-select) mode
  const [editMode, setEditMode]           = useState(false);
  const [selectedIds, setSelectedIds]     = useState(new Set());

  // Delete animation — ids currently being removed
  const [deletingIds, setDeletingIds]     = useState(new Set());

  // Period analytics hook
  const {
    setPeriodType: syncAnalyticsPeriodType,
    currentPeriod,
    goToPrev, goToNext,
    canGoPrev, canGoNext,
    periodExpenses,
  } = usePeriodAnalytics(syncedPeriodType);

  const handlePeriodTypeChange = (type) => {
    setPeriodType(type);
    if (type !== 'all') {
      setSyncedPeriodType(type);
      syncAnalyticsPeriodType(type);
    }
    logger.info('[ExpensesPage] Period filter changed to:', type);
  };

  // --- Delete with animation ---
  const handleDelete = useCallback((id) => {
    setDeletingIds((prev) => new Set([...prev, id]));
    setTimeout(async () => {
      try {
        await deleteExpense(id);
      } finally {
        setDeletingIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
      }
      logger.warn('[ExpensesPage] Deleted expense:', id);
    }, 320);
  }, [deleteExpense]);

  const handleToggleBudgetExclude = useCallback((id) => {
    toggleBudgetExclude(id);
    logger.info('[ExpensesPage] Toggled budget exclude for:', id);
  }, [toggleBudgetExclude]);

  const handleClear = () => {
    clearExpenses();
    setShowClearConfirm(false);
    setSearch('');
    setPaymentFilter(null);
    setPeriodType('all');
    setDateFrom('');
    setDateTo('');
    setEditMode(false);
    setSelectedIds(new Set());
    logger.warn('[ExpensesPage] Cleared all expenses');
  };

  // --- Edit mode ---
  const enterEditMode = () => {
    setEditMode(true);
    setSelectedIds(new Set());
    logger.info('[ExpensesPage] Entered edit mode');
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSelectedIds(new Set());
    logger.info('[ExpensesPage] Exited edit mode');
  };

  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }, []);

  // --- Bulk actions ---
  const handleSelectAll = () => {
    if (selectedIds.size === filteredExpenses.length && filteredExpenses.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExpenses.map((e) => e.id)));
    }
  };

  const handleBulkDelete = () => {
    const ids = [...selectedIds];
    for (const id of ids) handleDelete(id);
    setSelectedIds(new Set());
    setEditMode(false);
    logger.warn('[ExpensesPage] Bulk deleted:', ids.length, 'transactions');
  };

  const handleBulkExclude = () => {
    for (const id of selectedIds) {
      const exp = expenses.find((e) => e.id === id);
      if (exp && !exp.budgetExcluded) toggleBudgetExclude(id);
    }
    setSelectedIds(new Set());
    logger.info('[ExpensesPage] Bulk excluded from budget');
  };

  const handleBulkInclude = () => {
    for (const id of selectedIds) {
      const exp = expenses.find((e) => e.id === id);
      if (exp && exp.budgetExcluded) toggleBudgetExclude(id);
    }
    setSelectedIds(new Set());
    logger.info('[ExpensesPage] Bulk included in budget');
  };

  // --- Derived data ---
  const baseExpenses = periodType !== 'all' ? periodExpenses : expenses;

  const filteredExpenses = useMemo(() => {
    let result = baseExpenses;
    // Date range
    if (dateFrom) result = result.filter((e) => e.date >= dateFrom);
    if (dateTo)   result = result.filter((e) => e.date <= dateTo);
    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) => e.title.toLowerCase().includes(q) || (e.note && e.note.toLowerCase().includes(q))
      );
    }
    // Payment type
    if (paymentFilter !== null) {
      result = result.filter((e) => detectPaymentType(e.note) === paymentFilter);
    }
    return result;
  }, [baseExpenses, dateFrom, dateTo, search, paymentFilter]);

  const groups = useMemo(() => groupAndSort(filteredExpenses, sortOrder), [filteredExpenses, sortOrder]);

  const isAmountSort = sortOrder === 'amount-desc' || sortOrder === 'amount-asc';
  const hasActiveFilters = search.trim() || paymentFilter !== null || dateFrom || dateTo;
  const periodLabel = periodType !== 'all' ? currentPeriod?.label : null;

  // Last transaction date (across all expenses, not filtered)
  const lastTransactionDate = useMemo(() => {
    if (!expenses.length) return null;
    const latest = [...expenses].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (!latest) return null;
    const d = parseISO(latest.date);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'dd MMM yyyy');
  }, [expenses]);

  return (
    <PageWrapper>
      <div className="space-y-4">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {lastTransactionDate
                ? <>Last saved: <span className="text-gray-600 font-medium">{lastTransactionDate}</span> · {expenses.length} total</>
                : 'Upload a statement to get started'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {expenses.length > 0 && !editMode && (
              <>
                <button
                  onClick={enterEditMode}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Edit2 size={14} />
                  Select
                </button>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                >
                  <Trash2 size={14} />
                  <span className="hidden sm:inline">Clear Data</span>
                </button>
              </>
            )}
            {editMode && (
              <button
                onClick={exitEditMode}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <X size={14} />
                Cancel Select
              </button>
            )}
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Upload size={15} />
              <span className="hidden sm:inline">Upload Statement</span>
              <span className="sm:hidden">Upload</span>
            </button>
          </div>
        </div>

        {showClearConfirm && (
          <ClearConfirm
            count={expenses.length}
            onConfirm={handleClear}
            onCancel={() => setShowClearConfirm(false)}
          />
        )}

        {expenses.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <EmptyState onUpload={() => setModalOpen(true)} />
          </div>
        )}

        {expenses.length > 0 && (
          <>
            <TabBar active={activeTab} onChange={setActiveTab} />

            {/* ── TRANSACTIONS TAB ── */}
            {activeTab === 'transactions' && (
              <>
                {/* Period filter */}
                <PeriodFilterBar
                  periodType={periodType}
                  onPeriodTypeChange={handlePeriodTypeChange}
                  currentPeriod={currentPeriod}
                  onPrev={goToPrev}
                  onNext={goToNext}
                  canPrev={canGoPrev}
                  canNext={canGoNext}
                />

                {/* Date range filter */}
                <DateRangeFilter
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onFromChange={setDateFrom}
                  onToChange={setDateTo}
                  onClear={() => { setDateFrom(''); setDateTo(''); }}
                  isOpen={showDateFilter}
                  onToggle={() => setShowDateFilter((v) => !v)}
                />

                {/* Search + sort + payment filter */}
                <FilterBar
                  search={search}
                  onSearchChange={setSearch}
                  sortOrder={sortOrder}
                  onSortChange={setSortOrder}
                  paymentFilter={paymentFilter}
                  onPaymentFilterChange={setPaymentFilter}
                  showSortDropdown={showSortDropdown}
                  onToggleSortDropdown={setShowSortDropdown}
                />

                {/* Filter info */}
                {(hasActiveFilters || periodType !== 'all') && filteredExpenses.length !== expenses.length && (
                  <p className="text-xs text-gray-400">
                    Showing {filteredExpenses.length} of {expenses.length} transactions
                    {' '}
                    <button
                      onClick={() => {
                        setSearch('');
                        setPaymentFilter(null);
                        setPeriodType('all');
                        setDateFrom('');
                        setDateTo('');
                      }}
                      className="text-indigo-500 hover:text-indigo-700 underline"
                    >
                      Clear all filters
                    </button>
                  </p>
                )}

                {filteredExpenses.length > 0 && (
                  <SummaryBar expenses={filteredExpenses} periodLabel={periodLabel} />
                )}

                {filteredExpenses.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {isAmountSort ? (
                      <div className="divide-y divide-gray-50">
                        {groups[0]?.items.map((exp) => (
                          <ExpenseRow
                            key={exp.id}
                            expense={exp}
                            onDelete={handleDelete}
                            onToggleBudgetExclude={handleToggleBudgetExclude}
                            showDate
                            editMode={editMode}
                            isSelected={selectedIds.has(exp.id)}
                            onToggleSelect={toggleSelect}
                            isDeleting={deletingIds.has(exp.id)}
                          />
                        ))}
                      </div>
                    ) : (
                      groups.map(({ date, items }) => (
                        <div key={date}>
                          <div className="px-4 py-2 bg-gray-50 border-y border-gray-100 first:border-t-0">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                              {formatGroupHeader(date)}
                            </span>
                            <span className="text-xs text-gray-300 ml-2">
                              {format(parseISO(date), 'dd MMM yyyy')}
                            </span>
                          </div>
                          <div className="divide-y divide-gray-50">
                            {items.map((exp) => (
                              <ExpenseRow
                                key={exp.id}
                                expense={exp}
                                onDelete={handleDelete}
                                onToggleBudgetExclude={handleToggleBudgetExclude}
                                editMode={editMode}
                                isSelected={selectedIds.has(exp.id)}
                                onToggleSelect={toggleSelect}
                                isDeleting={deletingIds.has(exp.id)}
                              />
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    No transactions match your filters.
                  </div>
                )}
              </>
            )}

            {/* ── INSIGHTS TAB ── */}
            {activeTab === 'insights' && (
              <>
                <PeriodFilterBar
                  periodType={periodType}
                  onPeriodTypeChange={handlePeriodTypeChange}
                  currentPeriod={currentPeriod}
                  onPrev={goToPrev}
                  onNext={goToNext}
                  canPrev={canGoPrev}
                  canNext={canGoNext}
                />
                <TransactionInsights
                  expenses={baseExpenses}
                  periodLabel={periodLabel}
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Floating selection bar */}
      {editMode && (
        <SelectionBar
          selectedCount={selectedIds.size}
          totalVisible={filteredExpenses.length}
          onSelectAll={handleSelectAll}
          onBulkDelete={handleBulkDelete}
          onBulkExclude={handleBulkExclude}
          onBulkInclude={handleBulkInclude}
          onCancel={exitEditMode}
        />
      )}

      <BankUploadModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </PageWrapper>
  );
}
