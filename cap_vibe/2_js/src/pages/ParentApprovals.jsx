import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLinkedLearners } from '../hooks/useLinkedLearners.js';
import { useLogbook } from '../hooks/useLogbook.js';
import { apiService } from '../services/api/index.js';
import { formatDateOrDaysAgo, formatTime, formatHoursMinutes } from '../utils/formatTime.js';

const weatherIcon = {
  sunny: '☀️',
  overcast: '☁️',
  rain: '🌧️',
  night: '🌙',
};

const weatherLabel = {
  sunny: 'Sunny',
  overcast: 'Overcast',
  rain: 'Rain',
  night: 'Night',
};

export function ParentApprovals() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trips, loading, error, refresh } = useLogbook({});
  const { learners } = useLinkedLearners();
  const [learnerFilter, setLearnerFilter] = useState(null);

  if (user && user.role !== 'parent') {
    return (
      <div className="page-content px-4 py-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Parent Approvals</h1>
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">
          Only parents can approve trips.
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn-primary mt-4"
        >
          Back to Home
        </button>
      </div>
    );
  }
  const pendingTrips = trips
    .filter((t) => t.approvalState === 'pending')
    .filter((t) => !learnerFilter || t.learnerId === learnerFilter);

  const handleApprove = async (tripId) => {
    await apiService.approveTrip(tripId, true);
    await refresh();
  };

  const handleReject = async (tripId) => {
    await apiService.approveTrip(tripId, false);
    await refresh();
  };

  return (
    <div className="page-content px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Parent Approvals</h1>

      {loading && (
        <div className="text-slate-600 dark:text-slate-400 text-center py-12">Loading trips…</div>
      )}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}
      {!loading && pendingTrips.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <div className="text-5xl">✓</div>
          <p className="text-slate-600 dark:text-slate-400">No trips need approval</p>
        </div>
      )}

      {learners.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setLearnerFilter(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              learnerFilter === null
                ? 'bg-primary-500 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            All
          </button>
          {learners.map((l) => (
            <button
              key={l.id}
              onClick={() => setLearnerFilter(l.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                learnerFilter === l.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      {!loading && pendingTrips.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80">
                <th className="text-left py-2 pl-3 pr-1 font-semibold text-slate-700 dark:text-slate-300 w-16"></th>
                <th className="text-left py-2 pl-3 pr-1 font-semibold text-slate-700 dark:text-slate-300">Date</th>
                <th className="text-left py-2 pl-3 pr-1 font-semibold text-slate-700 dark:text-slate-300">Time</th>
                <th className="text-left py-2 pl-3 pr-1 font-semibold text-slate-700 dark:text-slate-300">Duration</th>
                <th className="text-left py-2 pl-3 pr-1 font-semibold text-slate-700 dark:text-slate-300">Distance</th>
                <th className="text-left py-2 pl-3 pr-1 font-semibold text-slate-700 dark:text-slate-300">Learner</th>
                <th className="text-left py-2 pl-3 pr-1 font-semibold text-slate-700 dark:text-slate-300">SD</th>
                <th className="text-left py-2 pl-3 pr-1 font-semibold text-slate-700 dark:text-slate-300">Conditions</th>
                <th className="text-left py-2 pl-3 pr-1 font-semibold text-slate-700 dark:text-slate-300">Day / Night</th>
              </tr>
            </thead>
            <tbody>
              {pendingTrips.map((trip) => {
                const totalMin = (trip.dayMinutes ?? 0) + (trip.nightMinutes ?? 0);
                const dayMin = trip.dayMinutes ?? 0;
                const nightMin = trip.nightMinutes ?? 0;
                return (
                  <tr
                    key={trip.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="py-2 pl-3 pr-1">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(trip.id)}
                          className="min-w-[36px] min-h-[36px] px-3 py-2 text-sm font-medium rounded bg-green-500 text-white hover:bg-green-600"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => handleReject(trip.id)}
                          className="min-w-[36px] min-h-[36px] px-3 py-2 text-sm font-medium rounded bg-red-500/90 text-white hover:bg-red-600"
                        >
                          ✗
                        </button>
                      </div>
                    </td>
                    <td className="py-2 pl-3 pr-1 text-slate-800 dark:text-slate-200 whitespace-nowrap">{formatDateOrDaysAgo(trip.startTime)}</td>
                    <td className="py-2 pl-3 pr-1 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatTime(trip.startTime)}</td>
                    <td className="py-2 pl-3 pr-1">{formatHoursMinutes(totalMin)}</td>
                    <td className="py-2 pl-3 pr-1">{trip.distanceKm != null ? `${trip.distanceKm} km` : '—'}</td>
                    <td className="py-2 pl-3 pr-1">{trip.learnerName ?? '—'}</td>
                    <td className="py-2 pl-3 pr-1">{trip.supervisorName ?? '—'}</td>
                    <td className="py-2 pl-3 pr-1" title={weatherLabel[trip.weather]}>{weatherIcon[trip.weather] ?? '–'}</td>
                    <td className="py-2 pl-3 pr-1 text-slate-600 dark:text-slate-400">
                      {dayMin > 0 && <span>☀️{formatHoursMinutes(dayMin)}</span>}
                      {dayMin > 0 && nightMin > 0 && ' '}
                      {nightMin > 0 && <span>🌙{formatHoursMinutes(nightMin)}</span>}
                      {dayMin === 0 && nightMin === 0 && '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="h-4" />
    </div>
  );
}
