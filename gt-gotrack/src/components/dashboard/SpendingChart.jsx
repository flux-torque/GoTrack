/**
 * @file SpendingChart.jsx
 * @description Monthly spending bar chart showing Income vs Expenses for the
 * last 6 months. Uses Recharts BarChart with minimal styling — no heavy grid lines.
 * Data is derived from ExpenseContext.
 */

import { useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { useExpenses } from '../../context/ExpenseContext';
import { EXPENSE_TYPE, APP_CONFIG } from '../../constants';
import logger from '../../utils/logger';

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

/**
 * Custom chart tooltip component.
 * @param {Object} props - Recharts tooltip props
 * @returns {JSX.Element|null}
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-semibold text-gray-800">
            {APP_CONFIG.CURRENCY_SYMBOL}
            {new Intl.NumberFormat(APP_CONFIG.LOCALE).format(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpendingChart component
// ---------------------------------------------------------------------------

/**
 * Dashboard monthly income vs expense bar chart.
 * Shows last 6 months of data derived from ExpenseContext.
 * @returns {JSX.Element}
 */
export function SpendingChart() {
  const { state } = useExpenses();
  const { expenses } = state;

  /** Build last-6-months labels and aggregate data */
  const chartData = useMemo(() => {
    // Anchor to the most recent transaction month so imported statements show correctly.
    const anchor = expenses.length
      ? new Date([...expenses].sort((a, b) => b.date.localeCompare(a.date))[0].date + 'T00:00:00')
      : new Date();

    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(startOfMonth(anchor), 5 - i);
      return {
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM'),
      };
    });

    return months.map(({ key, label }) => {
      const income = expenses
        .filter((e) => e.type === EXPENSE_TYPE.INCOME && e.date.startsWith(key))
        .reduce((acc, e) => acc + e.amount, 0);
      const expense = expenses
        .filter((e) => e.type === EXPENSE_TYPE.EXPENSE && e.date.startsWith(key))
        .reduce((acc, e) => acc + e.amount, 0);
      return { month: label, 'Cash Inflow': income, Expenses: expense };
    });
  }, [expenses]);

  useEffect(() => {
    logger.info('[SpendingChart] Chart data computed', chartData.length, 'months');
  }, [chartData]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Monthly Overview</h2>
      <p className="text-xs text-gray-400 mb-5">Cash Inflow vs Expenses — last 6 months</p>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barGap={4} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              v >= 1000 ? `${APP_CONFIG.CURRENCY_SYMBOL}${(v / 1000).toFixed(0)}k` : `${APP_CONFIG.CURRENCY_SYMBOL}${v}`
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
          />
          <Bar dataKey="Cash Inflow" fill="#059669" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
