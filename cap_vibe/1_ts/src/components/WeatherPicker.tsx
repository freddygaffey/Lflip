import React from 'react';
import type { WeatherCondition } from '../models/trip';

const OPTIONS: Array<{ value: WeatherCondition; label: string; icon: string }> = [
  { value: 'sunny',    label: 'Sunny',    icon: '☀️' },
  { value: 'overcast', label: 'Overcast', icon: '☁️' },
  { value: 'rain',     label: 'Rain',     icon: '🌧️' },
  { value: 'night',    label: 'Night',    icon: '🌙' },
];

interface Props {
  value: WeatherCondition | null;
  onChange: (v: WeatherCondition) => void;
}

export function WeatherPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${
            value === opt.value
              ? 'bg-primary-500/20 border border-primary-500'
              : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500'
          }`}
        >
          <span className="text-2xl">{opt.icon}</span>
          <span className="text-xs text-gray-600 dark:text-slate-300">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
