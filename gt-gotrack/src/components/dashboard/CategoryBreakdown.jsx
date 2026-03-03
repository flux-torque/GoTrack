/**
 * @file CategoryBreakdown.jsx
 * @description Donut chart showing expense breakdown by category for the
 * current month. Includes a legend with category name, percentage, and amount.
 * Uses Recharts PieChart. Data sourced from ExpenseContext.
 */

import { useMemo, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useExpenses } from '../../context/ExpenseContext';
import { CATEGORY_MAP, EXPENSE_TYPE, APP_CONFIG } from '../../constants';
import logger from '../../utils/logger';

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

/**
 * @param {Object} props - Recharts tooltip props
 * @returns {JSX.Element|null}
 */
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700">{name}</p>
      <p className="text-gray-500">
        {APP_CONFIG.CURRENCY_SYMBOL}
        {new Intl.NumberFormat(APP_CONFIG.LOCALE).format(value)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CategoryBreakdown component
// ---------------------------------------------------------------------------

/**
 * Dashboard category donut chart.
 * Shows how this month's expenses are distributed across categories.
 * @returns {JSX.Element}
 */
export function CategoryBreakdown() {
  const { state } = useExpenses();
  const { expenses } = state;
  // Anchor to the most recent transaction month so imported statements display correctly.
  const currentMonthKey = useMemo(() => {
    if (!expenses.length) return format(new Date(), 'yyyy-MM');
    const latest = [...expenses].sort((a, b) => b.date.localeCompare(a.date))[0].date;
    return latest.slice(0, 7);
  }, [expenses]);

  const { chartData, total } = useMemo(() => {
    const monthExpenses = expenses.filter(
      (e) => e.type === EXPENSE_TYPE.EXPENSE && e.date.startsWith(currentMonthKey)
    );

    const totals = {};
    for (const e of monthExpenses) {
      totals[e.category] = (totals[e.category] ?? 0) + e.amount;
    }

    const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

    const data = Object.entries(totals)
      .map(([categoryId, amount]) => {
        const cat = CATEGORY_MAP[categoryId];
        return {
          name: cat?.label ?? categoryId,
          value: amount,
          hex: cat?.hex ?? '#6b7280',
          pct: grandTotal > 0 ? Math.round((amount / grandTotal) * 100) : 0,
        };
      })
      .sort((a, b) => b.value - a.value);

    return { chartData: data, total: grandTotal };
  }, [expenses, currentMonthKey]);

  useEffect(() => {
    logger.info('[CategoryBreakdown] Computed', chartData.length, 'categories for', currentMonthKey);
  }, [chartData, currentMonthKey]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[280px]">
        <p className="text-sm text-gray-400">No expenses this month</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h2 className="text-sm font-semibold text-gray-700 mb-1">Category Breakdown</h2>
      <p className="text-xs text-gray-400 mb-4">This month's spending by category</p>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Donut chart */}
        <div className="flex-shrink-0">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.hex} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 w-full">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.hex }}
              />
              <span className="text-xs text-gray-600 flex-1 truncate">{item.name}</span>
              <span className="text-xs text-gray-400 font-medium">{item.pct}%</span>
              <span className="text-xs font-semibold text-gray-700 text-right min-w-[56px]">
                {APP_CONFIG.CURRENCY_SYMBOL}
                {new Intl.NumberFormat(APP_CONFIG.LOCALE).format(item.value)}
              </span>
            </div>
          ))}

          {/* Total */}
          <div className="border-t border-gray-100 pt-2 flex justify-between mt-1">
            <span className="text-xs font-semibold text-gray-500">Total</span>
            <span className="text-xs font-bold text-gray-800">
              {APP_CONFIG.CURRENCY_SYMBOL}
              {new Intl.NumberFormat(APP_CONFIG.LOCALE).format(total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
