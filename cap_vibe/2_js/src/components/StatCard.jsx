import React from 'react';

const accentMap = {
  green: 'text-green-400',
  blue: 'text-blue-400',
  amber: 'text-amber-400',
  purple: 'text-purple-400',
};

export function StatCard({ label, value, sub, icon, accent = 'green', large }) {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wide">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className={`font-bold ${large ? 'text-4xl' : 'text-2xl'} ${accentMap[accent]}`}>
        {value}
      </div>
      {sub && <div className="text-slate-500 dark:text-slate-500 text-sm">{sub}</div>}
    </div>
  );
}
