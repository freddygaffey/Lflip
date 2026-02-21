import React from 'react';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
  accent?: 'green' | 'blue' | 'amber' | 'purple';
  large?: boolean;
}

const accentMap = {
  green:  'text-green-600  dark:text-green-400',
  blue:   'text-blue-600   dark:text-blue-400',
  amber:  'text-amber-600  dark:text-amber-400',
  purple: 'text-purple-600 dark:text-purple-400',
};

export function StatCard({ label, value, sub, icon, accent = 'green', large }: StatCardProps) {
  return (
    <div className="stat-card flex flex-col gap-1">
      <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className={`font-bold ${large ? 'text-4xl' : 'text-2xl'} ${accentMap[accent]}`}>
        {value}
      </div>
      {sub && <div className="text-gray-400 dark:text-slate-500 text-sm">{sub}</div>}
    </div>
  );
}
