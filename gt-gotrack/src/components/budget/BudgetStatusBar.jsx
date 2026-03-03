/**
 * @file BudgetStatusBar.jsx
 * @description Full-width animated status bar for the budget page.
 * Shows a gradient progress bar with colored zones (Cruising → Danger Zone)
 * and a needle marker at the current spend position.
 * A status chip above the bar shows the current zone label + description.
 *
 * v1.7
 */

import { useEffect, useRef, useState } from 'react';
import {
  TrendingUp, CheckCircle2, AlertTriangle, AlertCircle,
  ShieldAlert, Flame, Rocket
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { STATUS_ZONES } from '../../utils/budgetEngine';
import { APP_CONFIG } from '../../constants';
import logger from '../../utils/logger';

// ---------------------------------------------------------------------------
// Zone icons
// ---------------------------------------------------------------------------

const ZONE_ICONS = [
  <Rocket size={15} />,       // Cruising
  <CheckCircle2 size={15} />, // On Track
  <TrendingUp size={15} />,   // Pacing
  <AlertTriangle size={15} />,// Heads Up
  <AlertCircle size={15} />,  // At Risk
  <Flame size={15} />,        // Danger Zone
];

// Each zone occupies a fraction of the bar (the bar = 0–100% budget used)
// Zones map: 0–50% = Cruising, 50–70% = On Track, 70–85% = Pacing, 85–95% = Heads Up, 95–110% = At Risk, 110%+ = Danger
// But since bar only goes to 100% we use proportional widths
const ZONE_WIDTHS = ['20%', '20%', '20%', '20%', '10%', '10%'];

const ZONE_BAR_COLORS = [
  '#10b981', // emerald-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#f97316', // orange-500
  '#f43f5e', // rose-500
  '#dc2626', // red-600
];

/**
 * Formats a number as INR.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  return APP_CONFIG.CURRENCY_SYMBOL + new Intl.NumberFormat(APP_CONFIG.LOCALE, {
    maximumFractionDigits: 0,
  }).format(Math.abs(Math.round(n)));
}

/**
 * Budget status bar component.
 *
 * @param {Object} props
 * @param {import('../../utils/budgetEngine').MonthlyBudgetMetrics} props.metrics
 * @param {number} props.monthlyBudget - User's set spending limit (for display)
 * @returns {JSX.Element}
 */
export function BudgetStatusBar({ metrics, monthlyBudget }) {
  const { status, budgetUsedPct, totalSpentInPeriod, spendableBudget, moneyLeftToSpend } = metrics;
  const [animated, setAnimated] = useState(false);
  const barRef = useRef(null);

  useEffect(() => {
    logger.info('[BudgetStatusBar] Mounted, budgetUsedPct:', budgetUsedPct);
    const t = setTimeout(() => setAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Clamp needle position to 0–100% of bar width
  const needlePct = Math.min(100, Math.max(0, budgetUsedPct));

  const statusIcon = ZONE_ICONS[status.level] ?? ZONE_ICONS[1];

  return (
    <div className={cn('rounded-2xl border p-5 bg-white shadow-sm', status.borderClass)}>
      {/* Status chip + description */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold mb-1',
            status.bgClass, status.colorClass
          )}>
            {statusIcon}
            {status.label}
          </div>
          <p className="text-sm text-gray-500">{status.description}</p>
        </div>

        {/* Spend summary */}
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-gray-900">{fmt(totalSpentInPeriod)}</p>
          <p className="text-xs text-gray-400">of {fmt(spendableBudget)} budget</p>
        </div>
      </div>

      {/* Gradient zone bar */}
      <div className="relative h-4 rounded-full overflow-hidden flex mb-2" ref={barRef}>
        {ZONE_WIDTHS.map((width, i) => (
          <div
            key={i}
            style={{ width, backgroundColor: ZONE_BAR_COLORS[i], opacity: 0.25 }}
          />
        ))}

        {/* Filled progress overlay */}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: animated ? `${needlePct}%` : '0%',
            backgroundColor: status.barClass.replace('bg-', ''),
            background: `linear-gradient(90deg, ${ZONE_BAR_COLORS[0]}aa, ${ZONE_BAR_COLORS[status.level]})`,
          }}
        />

        {/* Needle marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-gray-800 transition-all duration-1000 ease-out"
          style={{ left: animated ? `${needlePct}%` : '0%' }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-800 rounded-full" />
        </div>
      </div>

      {/* Zone labels */}
      <div className="flex justify-between mt-1">
        {STATUS_ZONES.map((z, i) => (
          <span key={i} className="text-[10px] text-gray-400">{z.label}</span>
        ))}
      </div>

      {/* Below bar: remaining + budget reference */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {moneyLeftToSpend >= 0
            ? `${fmt(moneyLeftToSpend)} remaining`
            : `${fmt(Math.abs(moneyLeftToSpend))} over budget`}
        </p>
        <p className="text-xs text-gray-400">
          Monthly budget: {fmt(monthlyBudget)}
        </p>
      </div>
    </div>
  );
}
