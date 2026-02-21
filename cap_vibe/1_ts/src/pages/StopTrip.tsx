import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Obd2TransferProgress } from '../components/Obd2TransferProgress';
import { useTripContext } from '../context/TripContext';
import type { Trip } from '../models/trip';
import { formatDate, formatTime, formatDuration, formatHoursMinutes } from '../utils/formatTime';

export function StopTrip() {
  const navigate = useNavigate();
  const { activeTrip, stopTrip, lastCompletedTrip } = useTripContext();

  const [odometer, setOdometer] = useState('');
  const [phase, setPhase] = useState<'odometer' | 'transferring' | 'summary'>('odometer');
  const [obd2Progress, setObd2Progress] = useState(0);
  const [completedTrip, setCompletedTrip] = useState<Trip | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  // Track OBD2 progress from activeTrip state
  useEffect(() => {
    if (activeTrip?.phase === 'transferring-obd2') {
      setPhase('transferring');
      setObd2Progress(activeTrip.obd2Progress);
    } else if (activeTrip?.phase === 'saving') {
      setObd2Progress(100);
    } else if (activeTrip?.phase === 'complete' || activeTrip === null) {
      if (lastCompletedTrip) {
        setCompletedTrip(lastCompletedTrip);
        setPhase('summary');
      }
    }
  }, [activeTrip, lastCompletedTrip]);

  if (!activeTrip && !completedTrip) {
    return (
      <div className="page-content flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-400 text-center">No active trip to stop.</p>
        <button onClick={() => navigate('/')} className="btn-primary">Dashboard</button>
      </div>
    );
  }

  const handleStop = async () => {
    if (!odometer || !activeTrip) return;
    setStopping(true);
    setError(null);
    try {
      const trip = await stopTrip(parseFloat(odometer));
      setCompletedTrip(trip);
      setPhase('summary');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop trip');
      setStopping(false);
    }
  };

  // Odometer phase
  if (phase === 'odometer') {
    const startOdo = activeTrip?.startOdometer ?? 0;
    return (
      <div className="page-content px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/active')} className="text-slate-400 text-xl p-1">←</button>
          <h1 className="text-xl font-bold text-white">Stop Trip</h1>
        </div>

        <div>
          <label className="text-slate-400 text-sm block mb-1.5">End odometer reading (km)</label>
          <input
            type="number"
            inputMode="numeric"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            placeholder={`e.g. ${startOdo + 15}`}
            className="input-field text-xl font-mono"
            autoFocus
          />
          {odometer && parseFloat(odometer) <= startOdo && (
            <p className="text-red-400 text-xs mt-1">
              Must be greater than start odometer ({startOdo} km)
            </p>
          )}
        </div>

        {odometer && parseFloat(odometer) > startOdo && (
          <div className="bg-slate-800 rounded-xl p-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Distance (odometer)</span>
              <span className="text-white">{(parseFloat(odometer) - startOdo).toFixed(1)} km</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleStop}
          disabled={!odometer || stopping || parseFloat(odometer) <= (activeTrip?.startOdometer ?? 0)}
          className="btn-danger w-full disabled:opacity-50 text-xl py-5"
        >
          {stopping ? '⏳ Stopping…' : '⏹ Stop & Save Trip'}
        </button>
      </div>
    );
  }

  // OBD2 transfer phase
  if (phase === 'transferring') {
    return (
      <div className="page-content px-4 py-6 space-y-5">
        <h1 className="text-xl font-bold text-white">Finishing Trip…</h1>
        <Obd2TransferProgress
          progress={obd2Progress}
          onSkip={() => {
            // Skip handled by TripManager timing out — just show saving
          }}
        />
        {obd2Progress < 100 && (
          <p className="text-slate-400 text-sm text-center">
            Please keep the app open while data transfers.
          </p>
        )}
        {obd2Progress === 100 && (
          <p className="text-slate-400 text-sm text-center">Saving trip…</p>
        )}
      </div>
    );
  }

  // Summary phase
  if (phase === 'summary' && completedTrip) {
    const t = completedTrip;
    const durationMs = (t.endTime ?? 0) - t.startTime;
    const totalMin = (t.dayMinutes ?? 0) + (t.nightMinutes ?? 0);

    return (
      <div className="page-content px-4 py-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="text-4xl">🎉</div>
          <h1 className="text-xl font-bold text-white">Trip Complete!</h1>
          <p className="text-slate-400 text-sm">Great driving! Here's your summary.</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Date</span>
            <span className="text-white">{formatDate(t.startTime)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Time</span>
            <span className="text-white">{formatTime(t.startTime)} – {formatTime(t.endTime!)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Duration</span>
            <span className="text-green-400 font-semibold">{formatHoursMinutes(totalMin)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Distance (GPS)</span>
            <span className="text-white">{t.distanceKm ?? '–'} km</span>
          </div>
          {t.odoDistanceKm != null && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Distance (odometer)</span>
              <span className="text-white">{t.odoDistanceKm} km</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Day hours</span>
            <span className="text-amber-400">{formatHoursMinutes(t.dayMinutes ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Night hours</span>
            <span className="text-indigo-400">{formatHoursMinutes(t.nightMinutes ?? 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Max speed</span>
            <span className={`font-semibold ${(t.maxSpeedKmh ?? 0) > 90 ? 'text-red-400' : 'text-white'}`}>
              {t.maxSpeedKmh ?? '–'} km/h
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Supervisor</span>
            <span className="text-white">{t.supervisorName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Weather</span>
            <span className="text-white capitalize">{t.weather}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">OBD2 data</span>
            <span className={`capitalize ${t.obd2Status === 'received' ? 'text-green-400' : 'text-slate-400'}`}>
              {t.obd2Status}
            </span>
          </div>
          {t.accelEvents.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Accel events</span>
              <span className="text-amber-400">{t.accelEvents.length} detected</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/trips/${t.id}`)}
            className="btn-secondary flex-1"
          >
            View Detail
          </button>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="btn-primary flex-1"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
