/**
 * @file SavingsHistoryChart.jsx
 * @description Monthly savings history chart showing actual savings per salary period
 * as a bar chart. Bars are colored emerald (met target) or rose (missed target).
 * A horizontal reference line shows the savings target.
 *
 * The current (in-progress) period is shown with a lighter/striped fill to
 * indicate it's still ongoing.
 *
 * Built with Recharts BarChart.
 * v1.7
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';
import { APP_CONFIG } from '../../constants';
import logger from '../../utils/logger';
import { useEffect } from 'react';

/**
 * Formats a compact INR value.
 * @param {number} n
 * @returns {string}
 */
function fmtK(n) {
  if (Math.abs(n) >= 100000) return `${APP_CONFIG.CURRENCY_SYMBOL}${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000)   return `${APP_CONFIG.CURRENCY_SYMBOL}${(n / 1000).toFixed(1)}k`;
  return `${APP_CONFIG.CURRENCY_SYMBOL}${Math.round(n)}`;
}

/**
 * Custom bar tooltip.
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-gray-100 shadow-md rounded-xl px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className={d?.metTarget ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
        Saved: {fmtK(d?.savings ?? 0)}
      </p>
      {d?.targetSavings != null && (
        <p className="text-gray-400">Target: {fmtK(d.targetSavings)}</p>
      )}
      {d?.isCurrent && <p className="text-indigo-400 italic mt-0.5">In progress</p>}
    </div>
  );
}

/**
 * Savings history bar chart.
 *
 * @param {Object} props
 * @param {import('../../utils/salaryDetector').SalaryPeriod[]} props.salaryPeriods
 * @param {number} props.targetSavings
 * @param {number} [props.highlightIndex] - Period index to highlight (selected in navigation)
 * @returns {JSX.Element}
 */
export function SavingsHistoryChart({ salaryPeriods, targetSavings, highlightIndex }) {
  useEffect(() => {
    logger.info('[SavingsHistoryChart] Mounted with', salaryPeriods.length, 'periods');
  }, [salaryPeriods.length]);

  if (!salaryPeriods.length) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-sm text-gray-400">No salary periods to display yet.</p>
      </div>
    );
  }

  const chartData = salaryPeriods.map((p) => ({
    label: p.label,
    savings: Math.round(p.actualSavings),
    targetSavings,
    metTarget: p.actualSavings >= targetSavings,
    isCurrent: p.isCurrent,
    isSelected: p.index === highlightIndex,
  }));

  const maxY = Math.max(
    targetSavings * 1.3,
    ...chartData.map((d) => d.savings)
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Savings History</h3>
          <p className="text-xs text-gray-400 mt-0.5">Savings per salary period vs your target</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
            Met Target
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-rose-400" />
            Missed
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtK}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={[0, maxY]}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Target reference line */}
          {targetSavings > 0 && (
            <ReferenceLine
              y={targetSavings}
              stroke="#6366f1"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: `Target: ${fmtK(targetSavings)}`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#6366f1',
              }}
            />
          )}

          <Bar dataKey="savings" radius={[6, 6, 0, 0]} maxBarSize={52}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={d.isSelected ? '#6366f1' : d.metTarget ? '#10b981' : '#f43f5e'}
                opacity={d.isCurrent ? 0.65 : 1}
                stroke={d.isSelected ? '#4338ca' : 'none'}
                strokeWidth={d.isSelected ? 2 : 0}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
