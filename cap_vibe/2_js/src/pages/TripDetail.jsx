import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RouteMap } from '../components/RouteMap.jsx';
import { SpeedChart } from '../components/SpeedChart.jsx';
import { apiService } from '../services/api/index.js';
import { formatDate, formatTime, formatHoursMinutes } from '../utils/formatTime.js';

const accelEventLabel = {
  hard_brake: 'Hard Brake',
  sharp_turn: 'Sharp Turn',
  rapid_acceleration: 'Rapid Accel',
};

export function TripDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    apiService
      .getTrip(id)
      .then(setTrip)
      .catch((e) => setError(e?.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading trip…</div>
      </div>
    );
  }
  if (error || !trip) {
    return (
      <div className="page-content flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-red-400">{error ?? 'Trip not found'}</div>
        <button onClick={() => navigate(-1)} className="btn-secondary">Back</button>
      </div>
    );
  }

  const totalMin = (trip.dayMinutes ?? 0) + (trip.nightMinutes ?? 0);

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-400 text-xl p-1">←</button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{formatDate(trip.startTime)}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {formatTime(trip.startTime)} – {formatTime(trip.endTime ?? trip.startTime)}
          </p>
        </div>
      </div>

      <RouteMap points={trip.gpsPoints ?? []} height={260} />

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-center">
          <div className="text-green-400 font-bold text-xl">{formatHoursMinutes(totalMin)}</div>
          <div className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">Duration</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-center">
          <div className="text-blue-400 font-bold text-xl">{trip.distanceKm ?? '–'} km</div>
          <div className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">Distance</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-center">
          <div className={`font-bold text-xl ${(trip.maxSpeedKmh ?? 0) > 90 ? 'text-red-400' : 'text-amber-400'}`}>
            {trip.maxSpeedKmh ?? '–'} km/h
          </div>
          <div className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">Max Speed</div>
        </div>
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 text-center">
          <div className="text-purple-400 font-bold text-xl">{trip.avgSpeedKmh ?? '–'} km/h</div>
          <div className="text-slate-600 dark:text-slate-400 text-xs mt-0.5">Avg Speed</div>
        </div>
      </div>

      {trip.gpsPoints?.length > 1 && (
        <SpeedChart gpsPoints={trip.gpsPoints} startTime={trip.startTime} />
      )}

      {(trip.accelEvents ?? []).length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-slate-700 dark:text-slate-300 font-semibold text-sm mb-2">Acceleration Events</div>
          {trip.accelEvents.map((ev, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">{accelEventLabel[ev.type] ?? ev.type}</span>
              <span className="text-slate-600 dark:text-slate-400">{ev.magnitude?.toFixed(1)} m/s²</span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 space-y-2">
        <div className="text-slate-700 dark:text-slate-300 font-semibold text-sm mb-2">Details</div>
        {[
          { label: 'Supervisor', value: trip.supervisorName },
          { label: 'Weather', value: trip.weather },
          { label: 'Day', value: formatHoursMinutes(trip.dayMinutes ?? 0) },
          { label: 'Night', value: formatHoursMinutes(trip.nightMinutes ?? 0) },
          { label: 'Start ODO', value: `${trip.startOdometer} km` },
          { label: 'End ODO', value: trip.endOdometer != null ? `${trip.endOdometer} km` : '–' },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">{label}</span>
            <span className="text-slate-900 dark:text-white capitalize">{String(value)}</span>
          </div>
        ))}
      </div>

      <div className="h-4" />
    </div>
  );
}
