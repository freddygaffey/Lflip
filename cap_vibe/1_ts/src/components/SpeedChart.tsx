import React from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { GpsPoint } from '../models/gps';
import type { Obd2Sample } from '../models/obd2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface SpeedChartProps {
  gpsPoints: GpsPoint[];
  obd2Samples?: Obd2Sample[];
  startTime: number;
}

function sampleEveryN<T>(arr: T[], targetCount: number): T[] {
  if (arr.length <= targetCount) return arr;
  const step = arr.length / targetCount;
  return Array.from({ length: targetCount }, (_, i) => arr[Math.floor(i * step)]);
}

export function SpeedChart({ gpsPoints, obd2Samples, startTime }: SpeedChartProps) {
  const { isDark } = useTheme();
  const gridColor   = isDark ? '#1e293b' : '#e5e7eb';
  const tickColor   = isDark ? '#64748b' : '#6b7280';
  const legendColor = isDark ? '#94a3b8' : '#374151';

  const sampled = sampleEveryN(gpsPoints, 100);

  const labels = sampled.map((p) => {
    const min = Math.floor((p.timestamp - startTime) / 60_000);
    return `${min}m`;
  });

  const gpsSpeed = sampled.map((p) =>
    p.speed != null ? Math.round(p.speed * 3.6) : null,
  );

  const datasets: Parameters<typeof Line>[0]['data']['datasets'] = [
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

  if (obd2Samples && obd2Samples.length > 0) {
    const sampledObd2 = sampleEveryN(obd2Samples, 100);
    datasets.push({
      label: 'OBD2 Speed (km/h)',
      data: sampledObd2.map((s) => s.vehicleSpeed),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.05)',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
      borderDash: [4, 4],
    });
  }

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
        title: { display: true, text: 'km/h', color: tickColor },
        min: 0,
      },
    },
    interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-transparent rounded-2xl p-4" style={{ height: 220 }}>
      <div className="text-gray-700 dark:text-slate-300 text-sm font-medium mb-3">Speed Over Time</div>
      <div style={{ height: 170 }}>
        <Line data={{ labels, datasets }} options={options} />
      </div>
    </div>
  );
}
