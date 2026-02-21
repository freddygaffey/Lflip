import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { ProgressRing } from '../components/ProgressRing';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { TripCard } from '../components/TripCard';
import { useBle } from '../context/BleContext';
import { useTripContext } from '../context/TripContext';
import { useLogbook } from '../hooks/useLogbook';
import { formatHoursDecimal } from '../utils/formatTime';
import { DEFAULT_TARGET_HOURS, NIGHT_HOURS_REQUIRED } from '../config';

export function Dashboard() {
  const navigate = useNavigate();
  const { status: bleStatus } = useBle();
  const { activeTrip } = useTripContext();
  const { trips, summary, loading } = useLogbook();

  const totalH = summary?.totalHours ?? 0;
  const nightH = summary?.nightHours ?? 0;
  const targetH = summary?.targetHours ?? DEFAULT_TARGET_HOURS;
  const nightTarget = summary?.nightTargetHours ?? NIGHT_HOURS_REQUIRED;

  const recentTrips = trips.slice(0, 3);

  return (
    <div className="page-content px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">L-Plate Tracker</h1>
          <p className="text-slate-400 text-sm mt-0.5">NSW Learner Logbook</p>
        </div>
        <ConnectionBadge status={bleStatus} />
      </div>

      {/* Active trip banner */}
      {activeTrip && (
        <button
          onClick={() => navigate('/active')}
          className="w-full bg-green-500/20 border border-green-500 rounded-2xl p-4 flex items-center gap-3 animate-pulse-slow"
        >
          <div className="w-3 h-3 bg-green-400 rounded-full record-dot" />
          <div className="text-left">
            <div className="text-green-400 font-bold">Trip in Progress</div>
            <div className="text-slate-300 text-sm">Tap to view active trip</div>
          </div>
          <div className="ml-auto text-green-400">→</div>
        </button>
      )}

      {/* Progress overview */}
      {!loading && (
        <div className="bg-slate-800 rounded-2xl p-5">
          <div className="text-slate-300 font-semibold mb-4">Overall Progress</div>
          <div className="flex items-center gap-6">
            <ProgressRing
              value={totalH / targetH}
              size={110}
              label={`${Math.round((totalH / targetH) * 100)}%`}
              sublabel="total"
              color={totalH >= targetH ? '#22c55e' : '#3b82f6'}
            />
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Total hours</span>
                  <span className="text-white font-mono">{formatHoursDecimal(totalH)} / {targetH}h</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (totalH / targetH) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Night hours 🌙</span>
                  <span className="text-white font-mono">{formatHoursDecimal(nightH)} / {nightTarget}h</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (nightH / nightTarget) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Milestone messages */}
          {totalH >= targetH && (
            <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-green-400 text-sm text-center font-medium">
              🎉 120 hours complete! Ready for P1 test!
            </div>
          )}
          {totalH >= targetH * 0.75 && totalH < targetH && (
            <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-blue-400 text-sm text-center">
              🚗 75% there — only {formatHoursDecimal(targetH - totalH)} to go!
            </div>
          )}
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Total Hours"
          value={formatHoursDecimal(totalH)}
          sub={`${summary?.tripCount ?? 0} trips`}
          icon="⏱️"
          accent="green"
        />
        <StatCard
          label="Night Hours"
          value={formatHoursDecimal(nightH)}
          sub={`${formatHoursDecimal(Math.max(0, nightTarget - nightH))} remaining`}
          icon="🌙"
          accent="purple"
        />
        <StatCard
          label="Hours Remaining"
          value={formatHoursDecimal(Math.max(0, targetH - totalH))}
          sub="to reach 120h"
          icon="🎯"
          accent="amber"
        />
        <StatCard
          label="Trips"
          value={String(summary?.tripCount ?? 0)}
          sub="completed"
          icon="📋"
          accent="blue"
        />
      </div>

      {/* Start button (only if no active trip) */}
      {!activeTrip && (
        <button onClick={() => navigate('/start')} className="btn-primary w-full text-center text-xl py-6">
          🚗 Start New Trip
        </button>
      )}

      {/* NSW Reminders */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
        <div className="text-slate-300 font-semibold text-sm">Pre-Drive Checklist</div>
        <div className="space-y-1.5 text-sm text-slate-400">
          <div>✅ L-plates displayed (front & rear)</div>
          <div>✅ Zero BAC — no alcohol</div>
          <div>✅ Max speed 90 km/h</div>
          <div>✅ Fully licensed supervisor present</div>
        </div>
      </div>

      {/* Recent trips */}
      {recentTrips.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold">Recent Trips</h2>
            <button onClick={() => navigate('/history')} className="text-primary-400 text-sm">
              See all →
            </button>
          </div>
          {recentTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      <div className="h-4" /> {/* Bottom padding */}
    </div>
  );
}
