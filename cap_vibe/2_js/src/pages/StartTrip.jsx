import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SupervisorPicker } from '../components/SupervisorPicker.jsx';
import { ConnectionBadge } from '../components/ConnectionBadge.jsx';
import { useTripContext } from '../context/TripContext.jsx';
import { useBle } from '../context/BleContext.jsx';
import { useCars } from '../hooks/useCars.js';
import { bleService } from '../services/ble/index.js';

export function StartTrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startTrip } = useTripContext();
  const { status: bleStatus } = useBle();
  const { cars, updateCar } = useCars();

  const guestCar = location.state?.guestCar === true;
  const selectedCar = location.state?.carId
    ? { id: location.state.carId, name: location.state.carName }
    : guestCar
      ? { id: null, name: 'Guest car' }
      : null;

  const [step, setStep] = useState('supervisor');
  const [supervisorId, setSupervisorId] = useState(null);
  const [supervisorName, setSupervisorName] = useState('');
  const [odoLast3, setOdoLast3] = useState('');
  const [odoManual, setOdoManual] = useState('');
  const [odoFromEsp, setOdoFromEsp] = useState(null);
  const [loadingOdo, setLoadingOdo] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const carForOdo = guestCar ? null : (selectedCar
    ? cars.find((c) => c.id === selectedCar.id) ?? cars[0]
    : cars[0]);

  // Pre-fill supervisor from car's default SD when available (not for guest car)
  useEffect(() => {
    if (carForOdo?.defaultSupervisorId && !supervisorId) {
      setSupervisorId(carForOdo.defaultSupervisorId);
      setSupervisorName(carForOdo.defaultSupervisorName ?? '');
    }
  }, [carForOdo?.id, carForOdo?.defaultSupervisorId, carForOdo?.defaultSupervisorName]);

  const lastOdo = odoFromEsp ?? carForOdo?.lastOdometer ?? 43200;
  const odoBase = Math.floor(lastOdo / 1000) * 1000;
  const fullOdoFromLast3 = odoLast3.length === 3 ? odoBase + parseInt(odoLast3, 10) : odoBase;
  const fullOdoManual = parseInt(odoManual.replace(/\D/g, ''), 10) || 0;
  const fullOdo = guestCar ? (odoFromEsp ?? fullOdoManual) : fullOdoFromLast3;

  const handleGetOdoFromEsp = async () => {
    setLoadingOdo(true);
    setError(null);
    try {
      const odo = await bleService.getCurrentOdometer?.();
      if (odo != null) {
        setOdoFromEsp(odo);
        setOdoLast3(String(odo).slice(-3));
        setOdoManual(String(odo));
        if (carForOdo?.id && !guestCar) {
          await updateCar?.(carForOdo.id, { lastOdometer: odo });
        }
      }
    } catch (err) {
      setError(err?.message ?? 'Failed to get odometer from ESP32');
    } finally {
      setLoadingOdo(false);
    }
  };

  const handleStart = async () => {
    if (!supervisorId || !supervisorName || fullOdo < 1) return;
    setStarting(true);
    setError(null);
    try {
      await startTrip({
        supervisorId,
        supervisorName,
        weather: 'sunny',
        startOdometer: Math.round(fullOdo),
      });
      navigate('/active', { replace: true });
    } catch (err) {
      setError(err?.message ?? 'Failed to start trip');
      setStarting(false);
    }
  };

  const handleNextFromSupervisor = async () => {
    if (!supervisorId || !supervisorName) return;
    setError(null);
    if (bleStatus === 'connected' && bleService.getCurrentOdometer) {
      setStarting(true);
      try {
        const odo = await bleService.getCurrentOdometer();
        if (odo != null) {
          setOdoFromEsp(odo);
          setOdoLast3(String(odo).slice(-3));
          setOdoManual(String(odo));
          if (carForOdo?.id && !guestCar) {
            await updateCar?.(carForOdo.id, { lastOdometer: odo });
          }
          await startTrip({
            supervisorId,
            supervisorName,
            weather: 'sunny',
            startOdometer: Math.round(odo),
          });
          navigate('/active', { replace: true });
          return;
        }
      } catch (err) {
        setError(err?.message ?? 'Could not get odometer from ESP32 — enter manually below.');
      } finally {
        setStarting(false);
      }
    }
    setStep('odo');
  };

  return (
    <div className="page-content px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-400 text-xl p-1">←</button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex-1">Start Trip</h1>
        <ConnectionBadge status={bleStatus} />
      </div>

      <div className="flex gap-2 mb-6">
        {['supervisor', 'odo'].map((s, i) => (
          <div
            key={s}
            className={`flex-1 h-1 rounded-full transition-colors ${
              ['supervisor', 'odo'].indexOf(step) >= i ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          />
        ))}
      </div>

      {step === 'supervisor' && (
        <div className="space-y-4">
          {selectedCar && (
            <div className="bg-slate-800 rounded-xl px-4 py-2 text-slate-400 text-sm">
              Car: <span className="text-white font-medium">{selectedCar.name}</span>
            </div>
          )}
          <h2 className="text-white font-semibold text-lg mb-1">Who is supervising?</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Must hold a full unrestricted Australian licence.</p>
          <SupervisorPicker
            value={supervisorId}
            onChange={(id, name) => {
              setSupervisorId(id);
              setSupervisorName(name);
            }}
          />
          <button onClick={() => navigate('/supervisors')} className="btn-ghost w-full text-sm">
            + Add new supervisor
          </button>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleNextFromSupervisor}
            disabled={!supervisorId || starting}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {starting ? 'Getting ODO…' : 'Next →'}
          </button>
        </div>
      )}

      {step === 'odo' && (
        <div className="space-y-4">
          <h2 className="text-slate-900 dark:text-white font-semibold text-lg mb-1">
            {guestCar ? 'Enter start odometer' : 'Confirm odometer'}
          </h2>
          {guestCar ? (
            <>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Enter the odometer reading at trip start. GPS & sensors will log during the trip.
              </p>
              {bleStatus === 'connected' && (
                <button
                  onClick={handleGetOdoFromEsp}
                  disabled={loadingOdo}
                  className="btn-secondary w-full mb-2"
                >
                  {loadingOdo ? 'Getting from ESP32…' : 'Get ODO from ESP32'}
                </button>
              )}
              <div>
                <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Start odometer (km)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={odoManual}
                  onChange={(e) => setOdoManual(e.target.value.replace(/\D/g, ''))}
                  placeholder="43250"
                  className="input-field text-xl font-mono text-center w-full"
                  autoFocus
                />
              </div>
              {(odoFromEsp ?? fullOdoManual) > 0 && (
                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center">
                  <span className="text-slate-600 dark:text-slate-400">Start: </span>
                  <span className="text-slate-900 dark:text-white font-mono text-xl">
                    {(odoFromEsp ?? fullOdoManual).toLocaleString()} km
                  </span>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-400 text-sm">
                Last known: {lastOdo.toLocaleString()} km. Enter last 3 digits to confirm.
              </p>
              {bleStatus === 'connected' && (
                <button
                  onClick={handleGetOdoFromEsp}
                  disabled={loadingOdo}
                  className="btn-secondary w-full mb-2"
                >
                  {loadingOdo ? 'Getting from ESP32…' : 'Get ODO from ESP32'}
                </button>
              )}
              <div>
                <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Last 3 digits of ODO</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={odoLast3}
                  onChange={(e) => setOdoLast3(e.target.value.replace(/\D/g, '').slice(-3))}
                  placeholder={String(lastOdo).slice(-3)}
                  className="input-field text-xl font-mono text-center"
                  autoFocus
                />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center">
                <span className="text-slate-600 dark:text-slate-400">Odometer: </span>
                <span className="text-slate-900 dark:text-white font-mono text-xl">
                  {odoLast3.length === 3 ? fullOdo.toLocaleString() : `${odoBase.toLocaleString()}XXX`} km
                </span>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {bleStatus !== 'connected' && !guestCar && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-3 text-amber-400 text-sm">
              ⚠️ ESP32 not connected — trip will use manual odometer.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep('supervisor')} className="btn-secondary flex-1">
              ← Back
            </button>
            <button
              onClick={handleStart}
              disabled={(guestCar ? fullOdo < 1 : odoLast3.length < 3) || starting}
              className="btn-primary flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-50"
            >
              {starting ? 'Starting…' : '🚗 Start'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
