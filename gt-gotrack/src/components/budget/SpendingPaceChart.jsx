/**
 * @file SpendingPaceChart.jsx
 * @description Daily cumulative spending chart for the current salary period.
 * Shows an area chart of actual spend (indigo gradient) vs the spendable budget
 * ceiling (dashed rose reference line). Future days (after today) are shown
 * as a lighter projected area using the current burn rate.
 *
 * Built with Recharts AreaChart.
 * v1.7
 */

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts';
import { APP_CONFIG } from '../../constants';
import logger from '../../utils/logger';
import { useEffect } from 'react';

/**
 * Formats a number as compact INR (e.g. ₹12.4k).
 * @param {number} n
 * @returns {string}
 */
function fmtK(n) {
  if (Math.abs(n) >= 100000) return `${APP_CONFIG.CURRENCY_SYMBOL}${(n / 100000).toFixed(1)}L`;
  if (Math.abs(n) >= 1000)   return `${APP_CONFIG.CURRENCY_SYMBOL}${(n / 1000).toFixed(1)}k`;
  return `${APP_CONFIG.CURRENCY_SYMBOL}${Math.round(n)}`;
}

/**
 * Custom tooltip for the chart.
 */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const spend = payload.find((p) => p.dataKey === 'cumSpend')?.value;
  const daily = payload[0]?.payload?.dailySpend;
  const isFuture = payload[0]?.payload?.isFuture;

  return (
    <div className="bg-white border border-gray-100 shadow-md rounded-xl px-3 py-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {spend !== undefined && (
        <p className="text-indigo-600 font-medium">
          Cumulative: {APP_CONFIG.CURRENCY_SYMBOL}{spend.toLocaleString(APP_CONFIG.LOCALE)}
        </p>
      )}
      {daily !== undefined && (
        <p className={isFuture ? 'text-gray-400' : 'text-gray-500'}>
          {isFuture ? 'Projected: ' : 'Today: '}
          {APP_CONFIG.CURRENCY_SYMBOL}{daily.toLocaleString(APP_CONFIG.LOCALE)}
        </p>
      )}
      {isFuture && <p className="text-gray-400 italic mt-0.5">Projected at burn rate</p>}
    </div>
  );
}

/**
 * Spending pace area chart.
 *
 * @param {Object} props
 * @param {import('../../utils/budgetEngine').DailyDataPoint[]} props.timeline
 * @param {number} props.spendableBudget - The budget ceiling (dashed reference line)
 * @returns {JSX.Element}
 */
export function SpendingPaceChart({ timeline, spendableBudget }) {
  useEffect(() => {
    logger.info('[SpendingPaceChart] Mounted with', timeline.length, 'days');
  }, [timeline.length]);

  if (!timeline.length) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-2xl border border-gray-100">
        <p className="text-sm text-gray-400">No spending data for this period yet.</p>
      </div>
    );
  }

  // Thin the X-axis labels: show every 5th day only
  const tickFormatter = (_, index) => {
    if (index % 5 !== 0) return '';
    return timeline[index]?.label ?? '';
  };

  const maxY = Math.max(spendableBudget * 1.15, timeline[timeline.length - 1]?.cumSpend ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Spending Pace</h3>
          <p className="text-xs text-gray-400 mt-0.5">Cumulative spend this period — stay below the budget line</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-indigo-500 rounded" />
            Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 border-t-2 border-dashed border-rose-400" />
            Budget
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={timeline} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.10} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={tickFormatter}
            axisLine={false}
            tickLine={false}
            interval={0}
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

          {/* Budget ceiling reference line */}
          <ReferenceLine
            y={spendableBudget}
            stroke="#f43f5e"
            strokeDasharray="5 3"
            strokeWidth={1.5}
            label={{
              value: `Budget: ${fmtK(spendableBudget)}`,
              position: 'insideTopRight',
              fontSize: 10,
              fill: '#f43f5e',
            }}
          />

          {/* Actual spend area (past days) */}
          <Area
            type="monotone"
            dataKey="cumSpend"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#spendGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
