import React from 'react';
import { useTheme } from '../context/ThemeContext';

interface ProgressRingProps {
  value: number;      // 0-1
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 10,
  color = '#22c55e',
  bgColor,
  label,
  sublabel,
}: ProgressRingProps) {
  const { isDark } = useTheme();
  const trackColor = bgColor ?? (isDark ? '#1e293b' : '#e5e7eb');
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, value)) * circ;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={center} cy={center} r={r} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={center} cy={center} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={circ - filled}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {(label || sublabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {label && <span className="text-gray-900 dark:text-white font-bold text-lg leading-tight">{label}</span>}
          {sublabel && <span className="text-gray-500 dark:text-slate-400 text-xs">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
