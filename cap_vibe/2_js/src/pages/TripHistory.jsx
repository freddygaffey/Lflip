import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripCard } from '../components/TripCard.jsx';
import { LogbookPieChart } from '../components/LogbookPieChart.jsx';
import { useLogbook } from '../hooks/useLogbook.js';
import { useTranscribed } from '../hooks/useTranscribed.js';
import { formatDate, formatTime, formatHoursMinutes } from '../utils/formatTime.js';

export function TripHistory() {
  const navigate = useNavigate();
  const [nightOnly, setNightOnly] = useState(false);
  const [nswFormat, setNswFormat] = useState(false);
  const { trips, summary, loading, error, refresh } = useLogbook(
    nightOnly ? { nightOnly: true } : {},
  );
  const { isTranscribed, toggle: toggleTranscribed } = useTranscribed();

  return (
    <div className="page-content px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Logbook</h1>
        <button onClick={refresh} className="text-slate-600 dark:text-slate-400 text-xl p-1">↻</button>
      </div>

      {summary && <LogbookPieChart summary={summary} />}

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setNightOnly(!nightOnly)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            nightOnly ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shadow-sm dark:shadow-none'
          }`}
        >
          🌙 Night only
        </button>
        <button
          onClick={() => setNswFormat(!nswFormat)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium ${
            nswFormat ? 'bg-green-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shadow-sm dark:shadow-none'
          }`}
        >
          📋 Log book format
        </button>
      </div>

      {loading && <div className="text-slate-600 dark:text-slate-400 text-center py-12">Loading trips…</div>}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}
      {!loading && trips.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <div className="text-5xl">📋</div>
          <p className="text-slate-600 dark:text-slate-400">No trips recorded yet.</p>
          <button onClick={() => navigate('/start')} className="btn-primary">
            Start your first trip
          </button>
        </div>
      )}

      {nswFormat && trips.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm dark:shadow-none mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300 w-10" title="In logbook">
                  ✓
                </th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Start</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Finish</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Duration</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Day</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Night</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Supervisor</th>
                <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">Location</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => {
                const dayMin = trip.dayMinutes ?? 0;
                const nightMin = trip.nightMinutes ?? 0;
                const totalMin = dayMin + nightMin;
                const startLoc = trip.gpsPoints?.[0] ? 'Recorded' : '—';
                const endLoc = trip.gpsPoints?.length > 1 ? 'Recorded' : '—';
                return (
                  <tr
                    key={trip.id}
                    className={`border-b transition-colors ${
                      isTranscribed(trip.id)
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800/50'
                        : 'border-slate-100 dark:border-slate-700/50'
                    }`}
                  >
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleTranscribed(trip.id); }}
                        className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                          isTranscribed(trip.id)
                            ? 'border-green-500 bg-green-500/20 text-green-600 dark:text-green-400'
                            : 'border-slate-400 dark:border-slate-500 text-transparent'
                        }`}
                        title={isTranscribed(trip.id) ? 'In logbook' : 'Tick when transcribed'}
                      >
                        {isTranscribed(trip.id) && '✓'}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">{formatDate(trip.startTime)}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">{formatTime(trip.startTime)}</td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {trip.endTime ? formatTime(trip.endTime) : '—'}
                    </td>
                    <td className="py-2.5 px-3">{formatHoursMinutes(totalMin)}</td>
                    <td className="py-2.5 px-3 text-amber-600 dark:text-amber-400">{formatHoursMinutes(dayMin)}</td>
                    <td className="py-2.5 px-3 text-indigo-500 dark:text-indigo-400">{formatHoursMinutes(nightMin)}</td>
                    <td className="py-2.5 px-3">{trip.supervisorName ?? '—'}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                      {startLoc} – {endLoc}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="py-2 px-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">
            NSW learner logbook format. Tick ✓ when transcribed.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
      <div className="h-4" />
    </div>
  );
}
