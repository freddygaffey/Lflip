import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate, formatTime, formatHoursMinutes } from '../utils/formatTime.js';

const weatherIcon = {
  sunny: '☀️',
  overcast: '☁️',
  rain: '🌧️',
  night: '🌙',
};

export function TripCard({ trip, showTranscribedCheckbox, isTranscribed, onTranscribedToggle }) {
  const navigate = useNavigate();
  const totalMin = (trip.dayMinutes ?? 0) + (trip.nightMinutes ?? 0);

  return (
    <button
      onClick={() => navigate(`/trips/${trip.id}`)}
      className="w-full text-left bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl p-4 space-y-3 transition-colors border border-slate-200 dark:border-transparent shadow-sm dark:shadow-none"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {showTranscribedCheckbox && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onTranscribedToggle?.(trip.id); }}
              className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                isTranscribed ? 'border-green-500 bg-green-500/20 text-green-600 dark:text-green-400' : 'border-slate-400 dark:border-slate-500'
              }`}
              title={isTranscribed ? 'In logbook' : 'Tick when transcribed'}
              aria-label={isTranscribed ? 'Transcribed' : 'Mark as transcribed'}
            >
              {isTranscribed && '✓'}
            </button>
          )}
          <div className="min-w-0">
          <div className="font-semibold text-slate-900 dark:text-white">{formatDate(trip.startTime)}</div>
          <div className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
            {formatTime(trip.startTime)}
            {trip.endTime && ` – ${formatTime(trip.endTime)}`}
          </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-lg">{weatherIcon[trip.weather] ?? '–'}</span>
          {trip.syncStatus === 'synced' && <span className="text-xs text-green-500">✓ synced</span>}
          {trip.syncStatus === 'unsynced' && <span className="text-xs text-amber-400">↑ pending</span>}
          {trip.approvalState === 'pending' && <span className="text-xs text-amber-400">Pending approval</span>}
          {trip.approvalState === 'approved' && <span className="text-xs text-green-500">✓ Approved</span>}
          {trip.approvalState === 'rejected' && <span className="text-xs text-red-500">Rejected</span>}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl p-2 text-center">
          <div className="text-green-400 font-bold text-lg">{formatHoursMinutes(totalMin)}</div>
          <div className="text-slate-600 dark:text-slate-400 text-xs">duration</div>
        </div>
        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl p-2 text-center">
          <div className="text-blue-400 font-bold text-lg">
            {trip.distanceKm != null ? `${trip.distanceKm}km` : '–'}
          </div>
          <div className="text-slate-600 dark:text-slate-400 text-xs">distance</div>
        </div>
        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl p-2 text-center min-w-0">
          <div className="text-amber-400 font-bold text-lg truncate" title={[trip.supervisorName, trip.learnerName].filter(Boolean).join(' · ')}>
            {trip.learnerName && trip.supervisorName
              ? `${trip.supervisorName.split(' ')[0]} · ${trip.learnerName}`
              : trip.learnerName ?? trip.supervisorName?.split(' ')[0] ?? '–'}
          </div>
          <div className="text-slate-600 dark:text-slate-400 text-xs">
            {trip.learnerName && trip.supervisorName ? 'SD · learner' : trip.learnerName ? 'learner' : 'supervisor'}
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(trip.nightMinutes ?? 0) > 0 && (
          <span className="bg-indigo-900 text-indigo-300 text-xs font-medium px-2 py-0.5 rounded-full">
            🌙 {formatHoursMinutes(trip.nightMinutes ?? 0)} night
          </span>
        )}
        {(trip.dayMinutes ?? 0) > 0 && (
          <span className="bg-amber-900/50 text-amber-300 text-xs font-medium px-2 py-0.5 rounded-full">
            ☀️ {formatHoursMinutes(trip.dayMinutes ?? 0)} day
          </span>
        )}
      </div>
    </button>
  );
}
