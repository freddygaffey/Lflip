import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Trip } from '../models/trip';
import { formatDate, formatTime, formatDuration, formatHoursMinutes } from '../utils/formatTime';

const weatherIcon: Record<string, string> = {
  sunny: '☀️',
  overcast: '☁️',
  rain: '🌧️',
  night: '🌙',
};

export function TripCard({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const durationMs = trip.endTime ? trip.endTime - trip.startTime : 0;
  const totalMin = (trip.dayMinutes ?? 0) + (trip.nightMinutes ?? 0);

  return (
    <button
      onClick={() => navigate(`/trips/${trip.id}`)}
      className="w-full text-left bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 rounded-2xl p-4 space-y-3 transition-colors border border-gray-100 dark:border-transparent"
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">{formatDate(trip.startTime)}</div>
          <div className="text-gray-500 dark:text-slate-400 text-sm mt-0.5">
            {formatTime(trip.startTime)}
            {trip.endTime && ` – ${formatTime(trip.endTime)}`}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-lg">{weatherIcon[trip.weather] ?? '–'}</span>
          {trip.syncStatus === 'synced' && (
            <span className="text-xs text-green-500">✓ synced</span>
          )}
          {trip.syncStatus === 'unsynced' && (
            <span className="text-xs text-amber-400">↑ pending</span>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-2 text-center">
          <div className="text-green-600 dark:text-green-400 font-bold text-lg">{formatHoursMinutes(totalMin)}</div>
          <div className="text-gray-500 dark:text-slate-400 text-xs">duration</div>
        </div>
        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-2 text-center">
          <div className="text-blue-600 dark:text-blue-400 font-bold text-lg">
            {trip.distanceKm != null ? `${trip.distanceKm}km` : '–'}
          </div>
          <div className="text-gray-500 dark:text-slate-400 text-xs">distance</div>
        </div>
        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-xl p-2 text-center">
          <div className="text-amber-600 dark:text-amber-400 font-bold text-lg">{trip.supervisorName.split(' ')[0]}</div>
          <div className="text-gray-500 dark:text-slate-400 text-xs">supervisor</div>
        </div>
      </div>

      <div className="flex gap-2">
        {(trip.nightMinutes ?? 0) > 0 && (
          <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-medium px-2 py-0.5 rounded-full">
            🌙 {formatHoursMinutes(trip.nightMinutes ?? 0)} night
          </span>
        )}
        {(trip.dayMinutes ?? 0) > 0 && (
          <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-medium px-2 py-0.5 rounded-full">
            ☀️ {formatHoursMinutes(trip.dayMinutes ?? 0)} day
          </span>
        )}
        {trip.obd2Status === 'received' && (
          <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-xs font-medium px-2 py-0.5 rounded-full">
            OBD2 ✓
          </span>
        )}
      </div>
    </button>
  );
}
