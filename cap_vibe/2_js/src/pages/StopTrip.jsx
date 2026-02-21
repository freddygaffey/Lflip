import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { WeatherPicker } from '../components/WeatherPicker.jsx';
import { useTripContext } from '../context/TripContext.jsx';
import { useBle } from '../context/BleContext.jsx';
import { bleService } from '../services/ble/index.js';
import { formatDate, formatTime, formatHoursMinutes } from '../utils/formatTime.js';

export function StopTrip() {
  const navigate = useNavigate();
  const { activeTrip, stopTrip, lastCompletedTrip } = useTripContext();
  const { status: bleStatus } = useBle();
  const triedEspRef = useRef(false);

  const [step, setStep] = useState('odometer');
  const [odometer, setOdometer] = useState('');
  const [weather, setWeather] = useState(null);
  const [completedTrip, setCompletedTrip] = useState(null);
  const [error, setError] = useState(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    if (lastCompletedTrip) {
      setCompletedTrip(lastCompletedTrip);
      setStep('summary');
    }
  }, [lastCompletedTrip]);

  useEffect(() => {
    if (!activeTrip || step !== 'odometer' || triedEspRef.current) return;
    if (bleStatus !== 'connected' || !bleService.getCurrentOdometer) return;
    triedEspRef.current = true;
    setStopping(true);
    setError(null);
    bleService.getCurrentOdometer()
      .then((endOdo) => {
        if (endOdo == null) return;
        const startOdo = activeTrip?.startOdometer ?? 0;
        if (endOdo <= startOdo) return;
        return stopTrip(Math.round(endOdo), 'sunny');
      })
      .then((trip) => {
        if (trip) {
          setCompletedTrip(trip);
          setStep('summary');
        }
      })
      .catch((err) => {
        setError(err?.message ?? 'Could not get odometer from ESP32 — enter manually below.');
      })
      .finally(() => {
        setStopping(false);
      });
  }, [activeTrip, step, bleStatus]);

  if (!activeTrip && !completedTrip) {
    return (
      <div className="page-content flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-slate-600 dark:text-slate-400 text-center">No active trip to stop.</p>
        <button onClick={() => navigate('/')} className="btn-primary">
          Dashboard
        </button>
      </div>
    );
  }

  const startOdo = activeTrip?.startOdometer ?? 0;

  const handleStop = async () => {
    if (!odometer || !activeTrip) return;
    const endOdo = parseFloat(odometer);
    if (endOdo <= startOdo) return;
    setStopping(true);
    setError(null);
    try {
      const trip = await stopTrip(endOdo, weather ?? 'sunny');
      setCompletedTrip(trip);
      setStep('summary');
    } catch (err) {
      setError(err?.message ?? 'Failed to stop trip');
      setStopping(false);
    }
  };

  if (step === 'odometer') {
    return (
      <div className="page-content px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/active')} className="text-slate-600 dark:text-slate-400 text-xl p-1">←</button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Stop Trip</h1>
        </div>

        {stopping && !error && (
          <p className="text-slate-600 dark:text-slate-400 text-sm text-center py-4">
            Getting end odometer from ESP32…
          </p>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {!stopping && (
        <div className="space-y-3">
          {bleStatus === 'connected' && (
            <button
              onClick={async () => {
                setStopping(true);
                setError(null);
                try {
                  const endOdo = await bleService.getCurrentOdometer?.();
                  if (endOdo != null && endOdo > startOdo) {
                    const trip = await stopTrip(Math.round(endOdo), 'sunny');
                    setCompletedTrip(trip);
                    setStep('summary');
                    return;
                  }
                } catch (e) {
                  setError(e?.message ?? 'Failed to get odometer');
                } finally {
                  setStopping(false);
                }
              }}
              disabled={stopping}
              className="btn-secondary w-full"
            >
              Get end ODO from ESP32
            </button>
          )}
          <div>
          <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">End odometer (km)</label>
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
            <p className="text-red-400 text-xs mt-1">Must be greater than start ({startOdo} km)</p>
          )}
        </div>

          {odometer && parseFloat(odometer) > startOdo && (
            <button
              onClick={() => setStep('weather')}
              className="btn-primary w-full"
            >
              Next: Weather →
            </button>
          )}
        </div>
        )}
      </div>
    );
  }

  if (step === 'weather') {
    return (
      <div className="page-content px-4 py-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => setStep('odometer')} className="text-slate-600 dark:text-slate-400 text-xl p-1">←</button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Weather?</h1>
        </div>

        <p className="text-slate-600 dark:text-slate-400 text-sm">Select current conditions (or skip)</p>
        <WeatherPicker value={weather} onChange={setWeather} />
        <button
          onClick={() => setWeather(null)}
          className="btn-ghost w-full text-sm"
        >
          Skip (use default)
        </button>

        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleStop}
          disabled={stopping}
          className="btn-danger w-full text-xl py-5 disabled:opacity-50"
        >
          {stopping ? '⏳ Stopping…' : '⏹ Stop & Save Trip'}
        </button>
      </div>
    );
  }

  if (step === 'summary' && completedTrip) {
    const t = completedTrip;
    const totalMin = (t.dayMinutes ?? 0) + (t.nightMinutes ?? 0);

    return (
      <div className="page-content px-4 py-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="text-4xl">🎉</div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Trip Complete!</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Here's your summary.</p>
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Date</span>
            <span className="text-slate-900 dark:text-white">{formatDate(t.startTime)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Time</span>
            <span className="text-slate-900 dark:text-white">{formatTime(t.startTime)} – {formatTime(t.endTime ?? t.startTime)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Duration</span>
            <span className="text-green-400 font-semibold">{formatHoursMinutes(totalMin)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Distance (GPS)</span>
            <span className="text-slate-900 dark:text-white">{t.distanceKm ?? '–'} km</span>
          </div>
          {t.odoDistanceKm != null && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Distance (odo)</span>
              <span className="text-slate-900 dark:text-white">{t.odoDistanceKm} km</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Supervisor</span>
            <span className="text-slate-900 dark:text-white">{t.supervisorName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Weather</span>
            <span className="text-slate-900 dark:text-white capitalize">{t.weather}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => navigate(`/trips/${t.id}`)} className="btn-secondary flex-1">
            View Detail
          </button>
          <button onClick={() => navigate('/', { replace: true })} className="btn-primary flex-1">
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
