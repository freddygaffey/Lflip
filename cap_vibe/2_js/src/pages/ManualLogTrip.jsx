import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { SupervisorPicker } from '../components/SupervisorPicker.jsx';
import { LearnerPicker } from '../components/LearnerPicker.jsx';
import { WeatherPicker } from '../components/WeatherPicker.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useCars } from '../hooks/useCars.js';
import { apiService } from '../services/api/index.js';
import { mergeTrip } from '../utils/mergeTrip.js';

export function ManualLogTrip() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cars, updateCar } = useCars();
  const isParent = user?.role === 'parent';

  const [carId, setCarId] = useState(null);
  const [supervisorId, setSupervisorId] = useState(null);
  const [supervisorName, setSupervisorName] = useState('');
  const [learnerId, setLearnerId] = useState(null);
  const [learnerName, setLearnerName] = useState('');
  const [startOdo, setStartOdo] = useState('');
  const [endOdo, setEndOdo] = useState('');
  const [durationMin, setDurationMin] = useState('');
  const [weather, setWeather] = useState('sunny');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const startOdoNum = parseInt(startOdo.replace(/\D/g, ''), 10) || 0;
  const endOdoNum = parseInt(endOdo.replace(/\D/g, ''), 10) || 0;
  const durationNum = parseInt(durationMin.replace(/\D/g, ''), 10) || 0;
  const sdOk = isParent ? true : (supervisorId && supervisorName);
  const learnerOk = isParent ? (learnerId && learnerName) : true;
  const isValid = sdOk && learnerOk && startOdoNum > 0 && endOdoNum > startOdoNum && durationNum > 0;

  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true);
    setError(null);
    try {
      const tripId = uuidv4();
      const endTime = Date.now();
      const startTime = endTime - durationNum * 60 * 1000;

      const sdId = isParent ? user.userId : supervisorId;
      const sdName = isParent ? user.name : supervisorName;
      const merged = mergeTrip({
        trip: {
          id: tripId,
          supervisorId: sdId,
          supervisorName: sdName,
          learnerId: learnerId || undefined,
          learnerName: learnerName || undefined,
          approvalState: isParent ? 'approved' : undefined,
          weather,
          carId: carId || undefined,
        },
        gpsPoints: [],
        accelPoints: [],
        startTime,
        endTime,
        startOdometer: startOdoNum,
        endOdometer: endOdoNum,
        odoSource: 'manual',
      });

      await apiService.saveLocalTrip(merged);
      if (carId) {
        await updateCar?.(carId, { lastOdometer: endOdoNum });
      }
      navigate(`/trips/${tripId}`, { replace: true });
    } catch (err) {
      setError(err?.message ?? 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-400 text-xl p-1">←</button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex-1">Log trip manually</h1>
      </div>

      <p className="text-slate-600 dark:text-slate-400 text-sm">
        Enter odometer readings and trip details. No GPS or BLE required.
      </p>

      <div>
        <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Car (optional)</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCarId(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              !carId ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
            }`}
          >
            None
          </button>
          {cars.map((car) => (
            <button
              key={car.id}
              onClick={() => {
                setCarId(car.id);
                if (car.lastOdometer && !startOdo) setStartOdo(String(car.lastOdometer));
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                carId === car.id ? 'bg-primary-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {car.name ?? car.numberPlate}
            </button>
          ))}
        </div>
      </div>

      <div>
        {isParent ? (
          <>
            <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Which learner?</label>
            <LearnerPicker
              value={learnerId}
              onChange={(id, name) => {
                setLearnerId(id);
                setLearnerName(name);
              }}
            />
            <div className="mt-2 text-slate-600 dark:text-slate-400 text-sm">
              Supervisor: <span className="font-medium text-slate-800 dark:text-slate-200">{user?.name}</span> (you)
            </div>
          </>
        ) : (
          <>
            <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Who supervised?</label>
            <SupervisorPicker
              value={supervisorId}
              onChange={(id, name) => {
                setSupervisorId(id);
                setSupervisorName(name);
              }}
            />
            <button onClick={() => navigate('/supervisors')} className="btn-ghost w-full text-sm mt-1">
              + Add supervisor
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Start odometer (km)</label>
          <input
            type="text"
            inputMode="numeric"
            value={startOdo}
            onChange={(e) => setStartOdo(e.target.value.replace(/\D/g, ''))}
            placeholder="43200"
            className="input-field text-lg font-mono w-full"
          />
        </div>
        <div>
          <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">End odometer (km)</label>
          <input
            type="text"
            inputMode="numeric"
            value={endOdo}
            onChange={(e) => setEndOdo(e.target.value.replace(/\D/g, ''))}
            placeholder="43250"
            className="input-field text-lg font-mono w-full"
          />
        </div>
      </div>

      {startOdoNum > 0 && endOdoNum > startOdoNum && (
        <p className="text-green-600 dark:text-green-400 text-sm">
          Distance: {endOdoNum - startOdoNum} km
        </p>
      )}

      <div>
        <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Duration (minutes)</label>
        <input
          type="text"
          inputMode="numeric"
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value.replace(/\D/g, ''))}
          placeholder="30"
          className="input-field text-lg font-mono w-full"
        />
      </div>

      <div>
        <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Weather</label>
        <WeatherPicker value={weather} onChange={setWeather} />
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={!isValid || saving}
        className="btn-primary w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save trip'}
      </button>
    </div>
  );
}
