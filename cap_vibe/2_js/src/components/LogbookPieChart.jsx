import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { formatHoursDecimal } from '../utils/formatTime.js';
import { DEFAULT_TARGET_HOURS, NIGHT_HOURS_REQUIRED } from '../config.js';
import { useAuth } from '../context/AuthContext.jsx';

ChartJS.register(ArcElement, Tooltip);

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

function computeSummaryFromTrips(trips, targetTotal, targetNight) {
  const completed = trips.filter((t) => t.status === 'complete');
  const totalMinutes = completed.reduce((acc, t) => acc + (t.dayMinutes ?? 0) + (t.nightMinutes ?? 0), 0);
  const dayMinutes = completed.reduce((acc, t) => acc + (t.dayMinutes ?? 0), 0);
  const nightMinutes = completed.reduce((acc, t) => acc + (t.nightMinutes ?? 0), 0);
  return {
    totalHours: totalMinutes / 60,
    dayHours: dayMinutes / 60,
    nightHours: nightMinutes / 60,
    targetHours: targetTotal,
    nightTargetHours: targetNight,
  };
}

export function LogbookPieChart({ summary, learners = [], trips = [] }) {
  const { stateReqs } = useAuth();
  const targetTotal = stateReqs?.total ?? summary?.targetHours ?? DEFAULT_TARGET_HOURS;
  const targetNight = stateReqs?.night ?? summary?.nightTargetHours ?? NIGHT_HOURS_REQUIRED;
  const targetDay = targetTotal - targetNight;

  // Multi-kid: one row per learner
  if (learners.length > 0 && trips.length >= 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 shadow-sm dark:shadow-none border border-slate-200 dark:border-transparent space-y-6">
        {learners.map((learner) => {
          const learnerTrips = trips.filter((t) => t.learnerId === learner.id);
          const s = computeSummaryFromTrips(learnerTrips, targetTotal, targetNight);
          return (
            <div key={learner.id} className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{learner.name}</div>
              <div className="flex flex-wrap justify-around gap-4">
                <div className="hidden md:flex flex-col items-center">
                  <ProgressRing value={s.dayHours} target={targetDay} color="#f59e0b" label="day" />
                </div>
                <ProgressRing value={s.totalHours} target={targetTotal} color="#22c55e" label="total" />
                <div className="hidden md:flex flex-col items-center">
                  <ProgressRing value={s.nightHours} target={targetNight} color="#6366f1" label="night" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (!summary) return null;

  const dayHours = summary.dayHours ?? 0;
  const nightHours = summary.nightHours ?? 0;
  const totalHours = summary.totalHours ?? 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 mb-4 flex flex-wrap justify-around gap-4 shadow-sm dark:shadow-none border border-slate-200 dark:border-transparent">
      <div className="hidden md:flex flex-col items-center">
        <ProgressRing value={dayHours} target={targetDay} color="#f59e0b" label="day" />
      </div>
      <ProgressRing value={totalHours} target={targetTotal} color="#22c55e" label="total" />
      <div className="hidden md:flex flex-col items-center">
        <ProgressRing value={nightHours} target={targetNight} color="#6366f1" label="night" />
      </div>
    </div>
  );
}
