import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext.jsx';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function sampleEveryN(arr, targetCount) {
  if (arr.length <= targetCount) return arr;
  const step = arr.length / targetCount;
  return Array.from({ length: targetCount }, (_, i) => arr[Math.floor(i * step)]);
}

export function SpeedChart({ gpsPoints, startTime }) {
  const { isDark } = useTheme();
  const gridColor = isDark ? '#1e293b' : '#e5e7eb';
  const tickColor = isDark ? '#64748b' : '#6b7280';

  const sampled = sampleEveryN(gpsPoints ?? [], 100);
  const labels = sampled.map((p) => {
    const min = Math.floor((p.timestamp - startTime) / 60_000);
    return `${min}m`;
  });
  const gpsSpeed = sampled.map((p) => (p.speed != null ? Math.round(p.speed * 3.6) : null));

  const datasets = [
    {
      label: 'GPS Speed (km/h)',
      data: gpsSpeed,
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34,197,94,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    },
  ];

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: tickColor, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false },
    },
    scales: {
      x: { ticks: { color: tickColor, maxTicksLimit: 8 }, grid: { color: gridColor } },
      y: {
        ticks: { color: tickColor },
        grid: { color: gridColor },
        title: { display: true, text: 'km/h', color: tickColor },
        min: 0,
      },
    },
  };

  return (
    <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4" style={{ height: 220 }}>
      <div className="text-slate-700 dark:text-slate-300 text-sm font-medium mb-3">Speed Over Time</div>
      <div style={{ height: 170 }}>
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}
