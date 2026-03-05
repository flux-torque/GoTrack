/**
 * @file BudgetPage.jsx
 * @description Budget tab — per-month budget tracking with month navigation and history.
 *
 * Layout states:
 *   1. No data        → upload prompt
 *   2. Not configured → BudgetSetupCard (sets the global default)
 *   3. Configured     → Full dashboard with month navigation
 *
 * Per-month budgets:
 *   Each month can have its own spending limit. The "Set Budget for [Month]" button
 *   sets a month-specific override. Months without an override use the global default.
 *   "Clear custom" removes the override and reverts the month to the default.
 *
 * History chart:
 *   Grouped bars — Spent (green/red) + Budget Limit (indigo) side-by-side per month.
 *   Each month's bar pair uses that month's own effective budget limit.
 *
 * v3.2: Per-month budgets. Grouped bar history chart (each month has its own budget bar).
 */

import { useState, useMemo } from 'react';
import {
  Upload, Wallet, Zap, Calendar, Coffee, Edit3,
  LayoutGrid, Lightbulb, TrendingUp, ArrowUpRight,
  ChevronLeft, ChevronRight, RotateCcw, CheckCircle2,
  CalendarDays, X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from 'recharts';

import { PageWrapper } from '../components/layout/PageWrapper';
import { BudgetSetupCard } from '../components/budget/BudgetSetupCard';
import { BudgetStatusBar } from '../components/budget/BudgetStatusBar';
import { BudgetStatCard } from '../components/budget/BudgetStatCard';
import { SpendingPaceChart } from '../components/budget/SpendingPaceChart';
import { BudgetInsights } from '../components/budget/BudgetInsights';

import { useBudget } from '../hooks/useBudget';
import { useWeeklyBudget, getWeeksForMonth, computeWeekMetrics } from '../hooks/useWeeklyBudget';
import {
  useBudgetSettings,
  getBudgetForMonth,
  hasMonthOverride,
  BUDGET_ACTIONS,
} from '../context/BudgetContext';
import { useExpenses } from '../context/ExpenseContext';
import {
  computeMonthlyBudgetMetrics,
  buildDailySpendingTimeline,
  computeMonthlyBudgetInsights,
} from '../utils/budgetEngine';
import { APP_CONFIG } from '../constants';
import { cn } from '../utils/cn';
import logger from '../utils/logger';

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/** @param {number} n @returns {string} */
function fmt(n) {
  return APP_CONFIG.CURRENCY_SYMBOL + new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(n)));
}

/** @param {string} yyyyMM @returns {string} e.g. 'March 2026' */
function fmtMonth(yyyyMM) {
  return yyyyMM ? format(parseISO(`${yyyyMM}-01`), 'MMMM yyyy') : '';
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function NoDataState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Upload size={28} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">No transactions yet</h2>
      <p className="text-sm text-gray-500 max-w-xs">
        Upload a bank statement from the Transactions page to get started with Budget tracking.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
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
// Period breakdown card
// ---------------------------------------------------------------------------

function PeriodBreakdownCard({ metrics, isCustomBudget }) {
  const rows = [
    {
      label: isCustomBudget ? 'Budget (custom)' : 'Budget (default)',
      value: fmt(metrics.monthlyBudget),
      color: isCustomBudget ? 'text-indigo-600' : 'text-gray-700',
    },
    { label: 'Cash Inflows',   value: fmt(metrics.cashInflows),   color: 'text-emerald-600' },
    { label: 'Spending Power', value: fmt(metrics.spendingPower), color: 'text-indigo-600' },
    { label: 'Total Spent',    value: fmt(metrics.totalSpent),    color: 'text-rose-500' },
    {
      label: 'Budget Used',
      value: `${metrics.budgetUsedPct}%`,
      color: metrics.budgetUsedPct > 100 ? 'text-rose-600' : 'text-gray-700',
    },
    {
      label: 'Remaining',
      value: metrics.remaining >= 0 ? fmt(metrics.remaining) : `−${fmt(Math.abs(metrics.remaining))}`,
      color: metrics.remaining >= 0 ? 'text-emerald-600' : 'text-rose-600',
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
          <ArrowUpRight size={16} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Budget Breakdown</h3>
          <p className="text-xs text-gray-400">{metrics.daysElapsed} of {metrics.daysInMonth} days elapsed</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {rows.map(({ label, value, color }) => (
          <div key={label} className="flex justify-between items-center border-b border-gray-50 pb-2 last:border-0 last:pb-0">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={cn('text-sm font-semibold tabular-nums', color)}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monthly history chart — grouped bars (Spent + Budget per month)
// ---------------------------------------------------------------------------

/**
 * Custom tooltip for the monthly history chart.
 * Each month has its own budget value in the payload.
 */
function HistoryTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const spent  = payload.find((p) => p.dataKey === 'spent')?.value  ?? 0;
  const budget = payload.find((p) => p.dataKey === 'budget')?.value ?? 0;
  const isOver = spent > budget;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md px-4 py-3 text-sm min-w-[150px]">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      <div className="flex justify-between gap-4">
        <span className="text-gray-500">Spent</span>
        <span className={cn('font-bold', isOver ? 'text-rose-600' : 'text-emerald-600')}>{fmt(spent)}</span>
      </div>
      <div className="flex justify-between gap-4 mt-0.5">
        <span className="text-gray-500">Budget</span>
        <span className="font-medium text-indigo-600">{fmt(budget)}</span>
      </div>
      {isOver && (
        <p className="text-[10px] text-rose-500 mt-1.5">+{fmt(spent - budget)} over</p>
      )}
      {!isOver && budget > 0 && (
        <p className="text-[10px] text-emerald-500 mt-1.5">{fmt(budget - spent)} saved</p>
      )}
    </div>
  );
}

/**
 * Grouped bar chart: Spent vs Budget for each of the last N months.
 * Each bar pair uses that month's own effective budget.
 *
 * @param {Object} props
 * @param {{ month: string, monthKey: string, spent: number, budget: number, overBudget: boolean }[]} props.history
 * @param {string} props.selectedMonth - highlighted bar key (short label like 'Mar 26')
 */
function MonthlyHistoryChart({ history, selectedMonth }) {
  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Monthly Spending History</h3>
        <p className="text-xs text-gray-400 mt-0.5">Spent vs budget limit per month (each month uses its own limit)</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={history} barCategoryGap="20%" barGap={3}>
          <CartesianGrid vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              v >= 1000
                ? `${APP_CONFIG.CURRENCY_SYMBOL}${(v / 1000).toFixed(0)}k`
                : `${APP_CONFIG.CURRENCY_SYMBOL}${v}`
            }
          />
          <Tooltip content={<HistoryTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-500">
                {value === 'spent' ? 'Spent' : 'Budget Limit'}
              </span>
            )}
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          />

          {/* Spent bars — green if under budget, red if over */}
          <Bar dataKey="spent" name="spent" radius={[4, 4, 0, 0]}>
            {history.map((entry) => (
              <Cell
                key={entry.monthKey}
                fill={entry.overBudget ? '#f87171' : '#34d399'}
                opacity={entry.month === selectedMonth ? 1 : 0.75}
              />
            ))}
          </Bar>

          {/* Budget limit bars — semi-transparent indigo */}
          <Bar
            dataKey="budget"
            name="budget"
            radius={[4, 4, 0, 0]}
            fill="#a5b4fc"
            opacity={0.55}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline budget edit widget
// ---------------------------------------------------------------------------

/**
 * Compact inline input for changing the budget for a specific month.
 *
 * @param {Object} props
 * @param {number | null} props.initialValue
 * @param {string} props.monthLabel  - display label e.g. "March 2026"
 * @param {() => void} props.onCancel
 * @param {(amount: number) => void} props.onSave
 */
function InlineBudgetEdit({ initialValue, monthLabel, onCancel, onSave }) {
  const [raw, setRaw] = useState(initialValue != null ? String(initialValue) : '');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setError('');
    setRaw(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'));
  };

  const handleSave = () => {
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount > ₹0');
      return;
    }
    onSave(amount);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-gray-500 font-medium">Budget for {monthLabel}</p>
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
            {APP_CONFIG.CURRENCY_SYMBOL}
          </span>
          <input
            type="text"
            inputMode="decimal"
            value={raw}
            onChange={handleChange}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="e.g. 50000"
            autoFocus
            className={cn(
              'pl-7 pr-3 py-2 rounded-xl border text-sm font-medium w-36',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500',
              error ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-white'
            )}
          />
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <CheckCircle2 size={14} />
          Save
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 px-1"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekly Budget Section
// ---------------------------------------------------------------------------

/**
 * Inline editor for setting a week's budget.
 */
function WeekBudgetInput({ initialValue, onSave, onCancel, onClear }) {
  const [raw, setRaw] = useState(initialValue != null ? String(initialValue) : '');
  const [err, setErr] = useState('');

  const handleSave = () => {
    const amount = parseFloat(raw);
    if (!raw || isNaN(amount) || amount <= 0) { setErr('Enter a valid amount'); return; }
    onSave(amount);
  };

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs select-none">
          {APP_CONFIG.CURRENCY_SYMBOL}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          autoFocus
          onChange={(e) => { setErr(''); setRaw(e.target.value.replace(/[^0-9.]/g, '')); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="e.g. 2500"
          className={cn(
            'pl-6 pr-2 py-1.5 rounded-lg border text-xs font-medium w-28 focus:outline-none focus:ring-2 focus:ring-indigo-500',
            err ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-white'
          )}
        />
      </div>
      <button
        onClick={handleSave}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <CheckCircle2 size={12} /> Save
      </button>
      {initialValue != null && (
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
        >
          <X size={11} /> Remove
        </button>
      )}
      <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
      {err && <p className="w-full text-xs text-rose-500">{err}</p>}
    </div>
  );
}

/**
 * A single week row showing spending vs optional budget.
 */
function WeekRow({ week, expenses, weeklyBudget }) {
  const [editing, setEditing] = useState(false);
  const { setBudget, clearBudget } = weeklyBudget;

  const budgetAmount = weeklyBudget.getBudget(week.key);
  const metrics = useMemo(
    () => computeWeekMetrics(expenses, week, budgetAmount),
    [expenses, week, budgetAmount]
  );

  const barPct = metrics.hasLimit ? Math.min(100, metrics.pct) : 0;
  const barColor = metrics.isOver ? '#f87171' : '#34d399';

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-800">{week.label}</p>
          <p className="text-[10px] text-gray-400">
            {week.startDate} → {week.endDate} · {metrics.txCount} tx
          </p>
        </div>
        <div className="text-right">
          <p className={cn(
            'text-base font-bold',
            metrics.isOver ? 'text-rose-600' : 'text-gray-800'
          )}>
            {APP_CONFIG.CURRENCY_SYMBOL}{new Intl.NumberFormat(APP_CONFIG.LOCALE, { maximumFractionDigits: 0 }).format(metrics.spent)}
          </p>
          {metrics.hasLimit && (
            <p className={cn('text-[10px] font-medium', metrics.isOver ? 'text-rose-500' : 'text-gray-400')}>
              {metrics.isOver ? `+${APP_CONFIG.CURRENCY_SYMBOL}${Math.round(metrics.spent - metrics.limit)} over` : `${APP_CONFIG.CURRENCY_SYMBOL}${Math.round(metrics.remaining)} left`}
              {' of '}{APP_CONFIG.CURRENCY_SYMBOL}{new Intl.NumberFormat(APP_CONFIG.LOCALE, { maximumFractionDigits: 0 }).format(metrics.limit)}
            </p>
          )}
        </div>
      </div>

      {/* Progress bar — only when budget is set */}
      {metrics.hasLimit && (
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barPct}%`, backgroundColor: barColor }}
          />
        </div>
      )}

      {/* Set / edit budget link */}
      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
        >
          {budgetAmount != null ? `Budget: ${APP_CONFIG.CURRENCY_SYMBOL}${budgetAmount.toLocaleString()} · Edit` : '+ Set weekly limit'}
        </button>
      ) : (
        <WeekBudgetInput
          initialValue={budgetAmount}
          onSave={(amount) => { setBudget(week.key, amount); setEditing(false); }}
          onCancel={() => setEditing(false)}
          onClear={() => { clearBudget(week.key); setEditing(false); }}
        />
      )}
    </div>
  );
}

/**
 * Full weekly budget section — toggle + week cards for the active month.
 *
 * @param {Object} props
 * @param {string} props.activeMonth       - YYYY-MM
 * @param {string} props.monthLabel        - Display label e.g. "March 2026"
 * @param {Object[]} props.expenses
 * @param {Object} props.weeklyBudget      - From useWeeklyBudget()
 */
function WeeklyBudgetSection({ activeMonth, monthLabel, expenses, weeklyBudget }) {
  const weeks = useMemo(() => getWeeksForMonth(activeMonth), [activeMonth]);
  const { enabled, toggleEnabled } = weeklyBudget;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
            <CalendarDays size={15} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Weekly Budget</h3>
            <p className="text-xs text-gray-400">{monthLabel} · {weeks.length} weeks</p>
          </div>
        </div>
        <button
          onClick={toggleEnabled}
          className={cn(
            'relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none',
            enabled ? 'bg-indigo-600' : 'bg-gray-200'
          )}
          aria-label={enabled ? 'Disable weekly budget' : 'Enable weekly budget'}
        >
          <span
            className={cn(
              'inline-block w-4 h-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
              enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
      </div>

      {enabled ? (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {weeks.map((week) => (
            <WeekRow
              key={week.key}
              week={week}
              expenses={expenses}
              weeklyBudget={weeklyBudget}
            />
          ))}
        </div>
      ) : (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">
            Enable weekly budget to track spending for individual weeks.
          </p>
          <p className="text-xs text-gray-300 mt-1">
            You can set limits for specific weeks and leave others open.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/**
 * Budget page — per-month budget tracking with navigation.
 * @returns {JSX.Element}
 */
export default function BudgetPage() {
  const { state: { expenses } } = useExpenses();
  const budget = useBudget();
  const { settings, dispatch } = useBudgetSettings();
  const weeklyBudget = useWeeklyBudget();

  const [editingBudget, setEditingBudget] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState(null); // null = auto budgetMonth

  const { hasData, isConfigured, budgetMonth, defaultBudget } = budget;

  // All months with transaction data, newest first
  const availableMonths = useMemo(() => {
    if (!expenses.length) return [];
    return [...new Set(expenses.map((e) => e.date.substring(0, 7)))]
      .sort()
      .reverse();
  }, [expenses]);

  // Active month: user-selected or auto-detected
  const activeMonth = selectedMonth ?? budgetMonth;

  // Effective budget for the active month
  const activeBudget = getBudgetForMonth(settings, activeMonth);

  // Whether the active month has a custom override
  const isCustomBudget = hasMonthOverride(settings, activeMonth);

  // Month navigation
  const monthIndex = availableMonths.indexOf(activeMonth);
  const canGoPrev  = monthIndex < availableMonths.length - 1;
  const canGoNext  = monthIndex > 0;

  const goToPrev = () => {
    const next = availableMonths[monthIndex + 1];
    if (next) { setSelectedMonth(next); logger.info('[BudgetPage] Navigate to month:', next); }
  };
  const goToNext = () => {
    const prev = availableMonths[monthIndex - 1];
    if (prev) { setSelectedMonth(prev); logger.info('[BudgetPage] Navigate to month:', prev); }
  };

  // Metrics for the active month (uses that month's own budget)
  const activeMetrics = useMemo(() => {
    if (!isConfigured || activeBudget === null || !hasData) return null;
    return computeMonthlyBudgetMetrics(expenses, activeBudget, activeMonth);
  }, [expenses, isConfigured, activeBudget, activeMonth, hasData]);

  // Daily timeline for the active month
  const activeDailyTimeline = useMemo(() => {
    if (!activeMetrics) return [];
    const monthExpenses = expenses.filter(
      (e) => e.date >= activeMetrics.startDate && e.date <= activeMetrics.endDate && !e.budgetExcluded
    );
    return buildDailySpendingTimeline(
      monthExpenses,
      activeMetrics.startDate,
      activeMetrics.endDate,
      activeMetrics.burnRate
    );
  }, [expenses, activeMetrics]);

  // Insights for the active month
  const activeInsights = useMemo(() => {
    if (!hasData) return null;
    return computeMonthlyBudgetInsights(expenses, activeMonth);
  }, [expenses, activeMonth, hasData]);

  // Monthly history — last 6 months, each with their own effective budget
  const monthlyHistory = useMemo(() => {
    if (!hasData || !isConfigured) return [];
    return [...availableMonths]
      .slice(0, 6)
      .reverse()
      .map((month) => {
        const monthBudget = getBudgetForMonth(settings, month);
        if (monthBudget === null) return null;
        const m = computeMonthlyBudgetMetrics(expenses, monthBudget, month);
        return {
          month:      format(parseISO(`${month}-01`), 'MMM yy'),
          monthKey:   month,
          spent:      Math.round(m.totalSpent),
          budget:     Math.round(monthBudget),
          overBudget: m.totalSpent > m.spendingPower,
        };
      })
      .filter(Boolean);
  }, [expenses, settings, availableMonths, hasData, isConfigured]);

  const isCurrentMonth = activeMonth === budgetMonth && selectedMonth === null;
  const selectedMonthLabel = activeMonth ? fmtMonth(activeMonth) : '';
  const selectedMonthShort = activeMonth
    ? format(parseISO(`${activeMonth}-01`), 'MMM yy')
    : '';

  // ── Handlers ──

  /** First-time setup → sets the global default budget */
  const handleInitialSetup = (amount) => {
    logger.info('[BudgetPage] Initial setup, defaultBudget:', amount);
    dispatch({ type: BUDGET_ACTIONS.SET_DEFAULT_BUDGET, payload: amount });
  };

  /** Edit from configured view → sets a month-specific budget for activeMonth */
  const handleMonthBudgetSave = (amount) => {
    logger.info('[BudgetPage] SET_MONTH_BUDGET:', activeMonth, amount);
    dispatch({ type: BUDGET_ACTIONS.SET_MONTH_BUDGET, payload: { month: activeMonth, amount } });
    setEditingBudget(false);
  };

  /** Remove the month-specific override — reverts activeMonth to use defaultBudget */
  const handleClearMonthBudget = () => {
    logger.info('[BudgetPage] CLEAR_MONTH_BUDGET:', activeMonth);
    dispatch({ type: BUDGET_ACTIONS.CLEAR_MONTH_BUDGET, payload: { month: activeMonth } });
    setEditingBudget(false);
  };

  // ── Render cases ──

  if (!hasData) return <PageWrapper><NoDataState /></PageWrapper>;

  if (!isConfigured) {
    return (
      <PageWrapper>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Set a default monthly spending limit — you can customise it per month later.
          </p>
        </div>
        <BudgetSetupCard onSave={handleInitialSetup} />
      </PageWrapper>
    );
  }

  // ── Fully configured ──

  const moneyLeftVariant = activeMetrics
    ? (activeMetrics.remaining >= 0
        ? (activeMetrics.remaining > activeMetrics.spendingPower * 0.3 ? 'positive' : 'warning')
        : 'danger')
    : 'neutral';

  const projVariant = activeMetrics
    ? (activeMetrics.projectedRemaining >= 0 ? 'positive' : 'danger')
    : 'neutral';

  return (
    <PageWrapper>

      {/* ── HEADER ── */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Budget</h1>
          {/* Budget source indicator */}
          {activeBudget !== null ? (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm font-semibold text-indigo-600">{fmt(activeBudget)}</span>
              <span className={cn(
                'text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide',
                isCustomBudget
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-100 text-gray-500'
              )}>
                {isCustomBudget ? 'Custom' : 'Default'}
              </span>
            </div>
          ) : (
            <p className="text-xs text-amber-500 mt-0.5">No budget set for this month</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month navigator */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
              <button
                onClick={goToPrev}
                disabled={!canGoPrev}
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                  canGoPrev ? 'hover:bg-white text-gray-600' : 'text-gray-300 cursor-not-allowed'
                )}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center min-w-[120px]">
                <p className="text-sm font-semibold text-gray-800">{selectedMonthLabel}</p>
                {isCurrentMonth && (
                  <p className="text-[10px] text-indigo-500 font-medium">Current month</p>
                )}
              </div>
              <button
                onClick={goToNext}
                disabled={!canGoNext}
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                  canGoNext ? 'hover:bg-white text-gray-600' : 'text-gray-300 cursor-not-allowed'
                )}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Budget edit area */}
          {editingBudget ? (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3">
              <InlineBudgetEdit
                initialValue={activeBudget}
                monthLabel={selectedMonthLabel}
                onCancel={() => setEditingBudget(false)}
                onSave={handleMonthBudgetSave}
              />
              {/* Reset to global default — only shown when this month has a custom budget */}
              {isCustomBudget && defaultBudget !== null && (
                <button
                  onClick={handleClearMonthBudget}
                  className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-rose-500 transition-colors"
                >
                  <RotateCcw size={11} />
                  Reset to default ({fmt(defaultBudget)})
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => setEditingBudget(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit3 size={14} />
              {activeBudget !== null ? 'Change Budget' : 'Set Budget'}
            </button>
          )}
        </div>
      </div>

      {/* Past month banner */}
      {!isCurrentMonth && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
          <span className="text-xs font-medium text-amber-700">
            Viewing {selectedMonthLabel} — showing actual results.
          </span>
          <button
            onClick={() => { setSelectedMonth(null); setEditingBudget(false); }}
            className="ml-auto text-xs text-amber-600 underline hover:text-amber-800"
          >
            Back to current
          </button>
        </div>
      )}

      {/* No budget set for this month — prompt to set one */}
      {activeBudget === null && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-sm text-blue-700 font-medium">
            No budget configured for {selectedMonthLabel}.
          </p>
          <p className="text-xs text-blue-500 mt-0.5">
            Click "Set Budget" above to set a limit for this month, or go back to set a global default.
          </p>
        </div>
      )}

      {/* ── TAB BAR ── */}
      <div className="mb-5">
        <TabBar active={activeTab} onChange={setActiveTab} />
      </div>

      {/* ══════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {activeMetrics ? (
            <>
              {/* Status bar */}
              <div className="mb-5">
                <BudgetStatusBar metrics={activeMetrics} monthlyBudget={activeBudget} />
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-5">
                <BudgetStatCard
                  title="Money Left"
                  value={fmt(activeMetrics.remaining)}
                  subtext={activeMetrics.remaining >= 0 ? 'before hitting limit' : 'over budget'}
                  icon={<Wallet size={16} />}
                  variant={moneyLeftVariant}
                />
                <BudgetStatCard
                  title="Projected Spend"
                  value={fmt(activeMetrics.projectedSpend)}
                  subtext={activeMetrics.projectedRemaining >= 0
                    ? `${fmt(activeMetrics.projectedRemaining)} under`
                    : `${fmt(Math.abs(activeMetrics.projectedRemaining))} over`}
                  icon={<TrendingUp size={16} />}
                  variant={projVariant}
                />
                <BudgetStatCard
                  title="Burn Rate"
                  value={`${fmt(activeMetrics.burnRate)}/day`}
                  subtext={`${fmt(activeMetrics.totalSpent)} spent in ${activeMetrics.daysElapsed}d`}
                  icon={<Zap size={16} />}
                  variant={activeMetrics.burnRate > activeMetrics.spendingPower / activeMetrics.daysInMonth ? 'warning' : 'neutral'}
                />
                <BudgetStatCard
                  title="Days Remaining"
                  value={String(activeMetrics.daysRemaining)}
                  subtext={`of ${activeMetrics.daysInMonth} days`}
                  icon={<Calendar size={16} />}
                  variant="neutral"
                />
                <BudgetStatCard
                  title="Safe to Spend"
                  value={fmt(activeMetrics.safeToSpendToday)}
                  subtext="per day to stay on track"
                  icon={<Coffee size={16} />}
                  variant={activeMetrics.safeToSpendToday > 0 ? 'default' : 'danger'}
                />
              </div>

              {/* Spending pace chart */}
              {activeDailyTimeline.length > 0 && (
                <div className="mb-5">
                  <SpendingPaceChart
                    timeline={activeDailyTimeline}
                    spendableBudget={activeMetrics.spendingPower}
                  />
                </div>
              )}

              {/* Monthly history + breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <MonthlyHistoryChart
                  history={monthlyHistory}
                  selectedMonth={selectedMonthShort}
                />
                <PeriodBreakdownCard
                  metrics={activeMetrics}
                  isCustomBudget={isCustomBudget}
                />
              </div>

              {/* Weekly budget section */}
              <WeeklyBudgetSection
                activeMonth={activeMonth}
                monthLabel={selectedMonthLabel}
                expenses={expenses}
                weeklyBudget={weeklyBudget}
              />
            </>
          ) : (
            <>
              <div className="text-center py-16 text-gray-400 text-sm">
                No transactions found for {selectedMonthLabel}.
              </div>
              {/* Still show weekly section for months without budget configured */}
              <WeeklyBudgetSection
                activeMonth={activeMonth}
                monthLabel={selectedMonthLabel}
                expenses={expenses}
                weeklyBudget={weeklyBudget}
              />
            </>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════
          INSIGHTS TAB
      ══════════════════════════════════════════════ */}
      {activeTab === 'insights' && activeInsights && (
        <BudgetInsights insights={activeInsights} monthLabel={selectedMonthLabel} />
      )}
      {activeTab === 'insights' && !activeInsights && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No insight data available for {selectedMonthLabel}.
        </div>
      )}

    </PageWrapper>
  );
}
