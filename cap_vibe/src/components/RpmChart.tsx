import React from 'react';
import { Line } from 'react-chartjs-2';
import type { Obd2Sample } from '../models/obd2';
import { useTheme } from '../context/ThemeContext';

function sampleEveryN<T>(arr: T[], targetCount: number): T[] {
  if (arr.length <= targetCount) return arr;
  const step = arr.length / targetCount;
  return Array.from({ length: targetCount }, (_, i) => arr[Math.floor(i * step)]);
}

interface RpmChartProps {
  samples: Obd2Sample[];
  startTime: number;
}

export function RpmChart({ samples, startTime }: RpmChartProps) {
  const { isDark } = useTheme();
  const gridColor   = isDark ? '#1e293b' : '#e5e7eb';
  const tickColor   = isDark ? '#64748b' : '#6b7280';
  const legendColor = isDark ? '#94a3b8' : '#374151';

  const sampled = sampleEveryN(samples, 100);

  const labels = sampled.map((s) => {
    const min = Math.floor((s.timestamp - startTime) / 60_000);
    return `${min}m`;
  });

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: legendColor, font: { size: 11 } } },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      x: { ticks: { color: tickColor, maxTicksLimit: 8 }, grid: { color: gridColor } },
      y: {
        ticks: { color: tickColor },
        grid: { color: gridColor },
        title: { display: true, text: 'RPM', color: tickColor },
        min: 0,
      },
    },
  };

  const data = {
    labels,
    datasets: [
      {
        label: 'RPM',
        data: sampled.map((s) => s.rpm),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2,
      },
      {
        label: 'Engine Load (%)',
        data: sampled.map((s) => s.engineLoad * 40), // scale to RPM range for visibility
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168,85,247,0.05)',
        fill: false,
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 1.5,
        yAxisID: 'y',
        borderDash: [3, 3],
      },
    ],
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-transparent rounded-2xl p-4" style={{ height: 220 }}>
      <div className="text-gray-700 dark:text-slate-300 text-sm font-medium mb-3">Engine Data (OBD2)</div>
      <div style={{ height: 170 }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
