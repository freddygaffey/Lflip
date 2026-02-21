import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RouteMap } from '../components/RouteMap';
import { ConnectionBadge } from '../components/ConnectionBadge';
import { useTripContext } from '../context/TripContext';
import { useBle } from '../context/BleContext';
import { formatDuration } from '../utils/formatTime';
import { isNightTime } from '../services/location/nightTime';
import { MAX_LEARNER_SPEED_KMH } from '../config';

export function ActiveTrip() {
  const navigate = useNavigate();
  const { activeTrip } = useTripContext();
  const { status: bleStatus } = useBle();
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [isNight, setIsNight] = useState(isNightTime(new Date()));

  // Update day/night indicator every minute
  useEffect(() => {
    const id = setInterval(() => setIsNight(isNightTime(new Date())), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!activeTrip || activeTrip.phase === 'idle') {
    return (
      <div className="page-content flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-6xl">🚗</div>
        <p className="text-slate-400 text-center">No active trip. Start one from the dashboard.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Go to Dashboard</button>
      </div>
    );
  }

  const speedKmh = Math.round(activeTrip.currentSpeedKmh);
  const overSpeed = speedKmh > MAX_LEARNER_SPEED_KMH;

  return (
    <div className="page-content flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full record-dot" />
          <span className="text-green-400 text-sm font-medium">Recording</span>
          <span className="text-slate-500 text-sm">· {activeTrip.supervisorName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{isNight ? '🌙' : '☀️'}</span>
          <ConnectionBadge status={bleStatus} />
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0">
        {activeTrip.gpsPoints.length > 0 ? (
          <RouteMap
            points={activeTrip.gpsPoints}
            height={undefined}
            liveMode
          />
        ) : (
          <div className="h-full bg-slate-900 flex items-center justify-center text-slate-500 text-sm">
            Acquiring GPS signal…
          </div>
        )}
      </div>

      {/* Overlay stats */}
      <div className="bg-slate-900/95 backdrop-blur px-4 pt-4 pb-2 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {/* Elapsed time */}
          <div className="bg-slate-800 rounded-2xl p-3 text-center">
            <div className="text-green-400 font-bold text-2xl font-mono">
              {formatDuration(activeTrip.elapsedMs)}
            </div>
            <div className="text-slate-400 text-xs mt-1">elapsed</div>
          </div>

          {/* Speed */}
          <div className={`rounded-2xl p-3 text-center ${overSpeed ? 'bg-red-900/50 border border-red-500' : 'bg-slate-800'}`}>
            <div className={`font-bold text-2xl font-mono ${overSpeed ? 'text-red-400' : 'text-blue-400'}`}>
              {speedKmh}
            </div>
            <div className="text-slate-400 text-xs mt-1">km/h</div>
            {overSpeed && (
              <div className="text-red-400 text-xs font-bold animate-pulse">OVER 90!</div>
            )}
          </div>

          {/* GPS points count */}
          <div className="bg-slate-800 rounded-2xl p-3 text-center">
            <div className="text-amber-400 font-bold text-2xl font-mono">
              {activeTrip.gpsPoints.length}
            </div>
            <div className="text-slate-400 text-xs mt-1">GPS pts</div>
          </div>
        </div>

        {/* Speed warning */}
        {overSpeed && (
          <div className="bg-red-900/30 border border-red-500 rounded-xl px-4 py-2 text-center text-red-400 font-bold text-sm animate-pulse">
            ⚠️ OVER 90 km/h LEARNER LIMIT — SLOW DOWN
          </div>
        )}

        {/* STOP button */}
        {!showStopConfirm ? (
          <button
            onClick={() => setShowStopConfirm(true)}
            className="btn-danger w-full text-xl py-5"
          >
            ⏹ Stop Trip
          </button>
        ) : (
          <div className="space-y-2">
            <div className="text-center text-white font-semibold">End this trip?</div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => navigate('/stop')}
                className="btn-danger flex-1"
              >
                Yes, Stop
              </button>
            </div>
          </div>
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}
