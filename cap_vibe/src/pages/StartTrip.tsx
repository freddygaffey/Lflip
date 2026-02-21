import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SupervisorPicker } from '../components/SupervisorPicker';
import { WeatherPicker } from '../components/WeatherPicker';
import { useTripContext } from '../context/TripContext';
import { useBle } from '../context/BleContext';
import { ConnectionBadge } from '../components/ConnectionBadge';
import type { WeatherCondition } from '../models/trip';

export function StartTrip() {
  const navigate = useNavigate();
  const { startTrip } = useTripContext();
  const { status: bleStatus } = useBle();

  const [step, setStep] = useState<'supervisor' | 'conditions' | 'odometer'>('supervisor');
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [supervisorName, setSupervisorName] = useState('');
  const [weather, setWeather] = useState<WeatherCondition | null>(null);
  const [odometer, setOdometer] = useState('');
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!supervisorId || !weather || !odometer) return;
    setStarting(true);
    setError(null);
    try {
      await startTrip({
        supervisorId,
        supervisorName,
        weather,
        startOdometer: parseFloat(odometer),
      });
      navigate('/active', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start trip');
      setStarting(false);
    }
  };

  return (
    <div className="page-content px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-xl p-1">←</button>
        <h1 className="text-xl font-bold text-white flex-1">Start New Trip</h1>
        <ConnectionBadge status={bleStatus} />
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {(['supervisor', 'conditions', 'odometer'] as const).map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full transition-colors ${
              ['supervisor', 'conditions', 'odometer'].indexOf(step) >= i
                ? 'bg-primary-500'
                : 'bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* Step: Supervisor */}
      {step === 'supervisor' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-white font-semibold text-lg mb-1">Who is supervising?</h2>
            <p className="text-slate-400 text-sm">Must hold a full unrestricted Australian licence.</p>
          </div>
          <SupervisorPicker
            value={supervisorId}
            onChange={(id, name) => { setSupervisorId(id); setSupervisorName(name); }}
          />
          <button
            onClick={() => navigate('/supervisors')}
            className="btn-ghost w-full text-sm"
          >
            + Add new supervisor
          </button>
          <button
            onClick={() => setStep('conditions')}
            disabled={!supervisorId}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}

      {/* Step: Conditions */}
      {step === 'conditions' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-white font-semibold text-lg mb-1">Weather &amp; conditions?</h2>
            <p className="text-slate-400 text-sm">Select the current driving conditions.</p>
          </div>
          <WeatherPicker value={weather} onChange={setWeather} />
          <div className="flex gap-3">
            <button onClick={() => setStep('supervisor')} className="btn-secondary flex-1">← Back</button>
            <button
              onClick={() => setStep('odometer')}
              disabled={!weather}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step: Odometer */}
      {step === 'odometer' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-white font-semibold text-lg mb-1">Start odometer reading</h2>
            <p className="text-slate-400 text-sm">Enter the current odometer reading in km.</p>
          </div>

          <div>
            <label className="text-slate-400 text-sm block mb-1.5">Odometer (km)</label>
            <input
              type="number"
              inputMode="numeric"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              placeholder="e.g. 43250"
              className="input-field text-xl font-mono"
              autoFocus
            />
          </div>

          <div className="bg-slate-800 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Supervisor</span>
              <span className="text-white">{supervisorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Weather</span>
              <span className="text-white capitalize">{weather}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {bleStatus !== 'connected' && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-3 text-amber-400 text-sm">
              ⚠️ ESP32 not connected — trip will continue without OBD2 data.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('conditions')} className="btn-secondary flex-1">← Back</button>
            <button
              onClick={handleStart}
              disabled={!odometer || starting}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {starting ? 'Starting…' : '🚗 Start Trip'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
