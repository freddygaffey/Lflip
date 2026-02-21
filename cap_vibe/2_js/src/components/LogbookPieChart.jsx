import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatHoursDecimal } from '../utils/formatTime.js';
import { DEFAULT_TARGET_HOURS, NIGHT_HOURS_REQUIRED } from '../config.js';

ChartJS.register(ArcElement, Tooltip);

const DAY_TARGET = DEFAULT_TARGET_HOURS - NIGHT_HOURS_REQUIRED; // 100h

function ProgressRing({ value, target, color, label }) {
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const remaining = Math.max(0, target - value);
  const remainingText = remaining < 0.1 ? '0' : formatHoursDecimal(remaining).replace(/h$/i, '');
  const data = {
    labels: [label],
    datasets: [{
      data: [pct, 1 - pct],
      backgroundColor: [color, 'rgba(148,163,184,0.25)'],
      borderWidth: 0,
      hoverOffset: 0,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: () => `${formatHoursDecimal(value)} / ${formatHoursDecimal(target)}`,
        },
      },
    },
  };
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40 flex-shrink-0">
        <Doughnut data={data} options={options} />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {remainingText}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">remaining</span>
        </div>
      </div>
      <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mt-2 capitalize">
        Progress {label}
      </div>
    </div>
  );
}

export function LogbookPieChart({ summary }) {
  if (!summary) return null;

  const dayHours = summary.dayHours ?? 0;
  const nightHours = summary.nightHours ?? 0;
  const totalHours = summary.totalHours ?? 0;
  const targetTotal = summary.targetHours ?? DEFAULT_TARGET_HOURS;
  const targetNight = summary.nightTargetHours ?? NIGHT_HOURS_REQUIRED;
  const targetDay = targetTotal - targetNight;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 flex flex-wrap justify-around gap-4 shadow-sm dark:shadow-none border border-slate-200 dark:border-transparent">
      <ProgressRing
        value={dayHours}
        target={targetDay}
        color="#f59e0b"
        label="day"
      />
      <ProgressRing
        value={totalHours}
        target={targetTotal}
        color="#22c55e"
        label="total"
      />
      <ProgressRing
        value={nightHours}
        target={targetNight}
        color="#6366f1"
        label="night"
      />
    </div>
  );
}
