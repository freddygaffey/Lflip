import React from 'react';

const OPTIONS = [
  { value: 'sunny', label: 'Sunny', icon: '☀️' },
  { value: 'overcast', label: 'Overcast', icon: '☁️' },
  { value: 'rain', label: 'Rain', icon: '🌧️' },
  { value: 'night', label: 'Night', icon: '🌙' },
];

export function WeatherPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${
            value === opt.value
              ? 'bg-primary-500/20 border border-primary-500'
              : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-500'
          }`}
        >
          <span className="text-2xl">{opt.icon}</span>
          <span className="text-xs text-slate-700 dark:text-slate-300">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
