import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RouteMap } from '../components/RouteMap';
import { SpeedChart } from '../components/SpeedChart';
import { RpmChart } from '../components/RpmChart';
import { apiService } from '../services/api';
import type { Trip } from '../models/trip';
import { formatDate, formatTime, formatHoursMinutes } from '../utils/formatTime';

const accelEventLabel: Record<string, string> = {
  hard_brake: '🛑 Hard Brake',
  sharp_turn: '↩️ Sharp Turn',
  rapid_acceleration: '🚀 Rapid Accel',
};

export function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiService.getTrip(id)
      .then(setTrip)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center">
        <div className="text-slate-400">Loading trip…</div>
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
  const obd2 = trip.obd2Data?.samples;

  return (
    <div className="page-content px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-400 text-xl p-1">←</button>
        <div>
          <h1 className="text-xl font-bold text-white">{formatDate(trip.startTime)}</h1>
          <p className="text-slate-400 text-sm">{formatTime(trip.startTime)} – {formatTime(trip.endTime ?? trip.startTime)}</p>
        </div>
      </div>

      {/* Map */}
      <RouteMap points={trip.gpsPoints} height={260} />

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800 rounded-2xl p-3 text-center">
          <div className="text-green-400 font-bold text-xl">{formatHoursMinutes(totalMin)}</div>
          <div className="text-slate-400 text-xs mt-0.5">Duration</div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-3 text-center">
          <div className="text-blue-400 font-bold text-xl">{trip.distanceKm ?? '–'} km</div>
          <div className="text-slate-400 text-xs mt-0.5">Distance (GPS)</div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-3 text-center">
          <div className={`font-bold text-xl ${(trip.maxSpeedKmh ?? 0) > 90 ? 'text-red-400' : 'text-amber-400'}`}>
            {trip.maxSpeedKmh ?? '–'} km/h
          </div>
          <div className="text-slate-400 text-xs mt-0.5">Max Speed</div>
        </div>
        <div className="bg-slate-800 rounded-2xl p-3 text-center">
          <div className="text-purple-400 font-bold text-xl">{trip.avgSpeedKmh ?? '–'} km/h</div>
          <div className="text-slate-400 text-xs mt-0.5">Avg Speed</div>
        </div>
      </div>

      {/* Speed chart */}
      {trip.gpsPoints.length > 1 && (
        <SpeedChart
          gpsPoints={trip.gpsPoints}
          obd2Samples={obd2}
          startTime={trip.startTime}
        />
      )}

      {/* RPM / engine chart */}
      {obd2 && obd2.length > 1 && (
        <RpmChart samples={obd2} startTime={trip.startTime} />
      )}

      {/* OBD2 engine summary */}
      {obd2 && obd2.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-slate-300 font-semibold text-sm mb-3">Engine Summary (OBD2)</div>
          {[
            {
              label: 'Avg RPM',
              value: Math.round(obd2.reduce((a, s) => a + s.rpm, 0) / obd2.length),
              unit: 'rpm',
              color: 'text-amber-400',
            },
            {
              label: 'Avg Engine Load',
              value: Math.round(obd2.reduce((a, s) => a + s.engineLoad, 0) / obd2.length),
              unit: '%',
              color: 'text-purple-400',
            },
            {
              label: 'Avg OBD2 Speed',
              value: Math.round(obd2.reduce((a, s) => a + s.vehicleSpeed, 0) / obd2.length),
              unit: 'km/h',
              color: 'text-blue-400',
            },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-slate-400">{label}</span>
              <span className={`font-semibold ${color}`}>{value} {unit}</span>
            </div>
          ))}
          {obd2[obd2.length - 1].coolantTemp != null && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Coolant Temp Range</span>
              <span className="text-slate-300 font-semibold">
                {Math.round(Math.min(...obd2.map((s) => s.coolantTemp ?? 0)))}–
                {Math.round(Math.max(...obd2.map((s) => s.coolantTemp ?? 0)))} °C
              </span>
            </div>
          )}
          {trip.obd2Data?.dtcCodes && trip.obd2Data.dtcCodes.length > 0 && (
            <div className="mt-2 bg-red-900/20 border border-red-700/50 rounded-xl p-2">
              <div className="text-red-400 text-xs font-medium">
                DTC Codes: {trip.obd2Data.dtcCodes.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Acceleration events */}
      {trip.accelEvents.length > 0 && (
        <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-slate-300 font-semibold text-sm mb-2">
            Acceleration Events ({trip.accelEvents.length})
          </div>
          {trip.accelEvents.map((ev, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-300">{accelEventLabel[ev.type] ?? ev.type}</span>
              <span className="text-slate-400">{ev.magnitude.toFixed(1)} m/s²</span>
            </div>
          ))}
        </div>
      )}

      {/* Trip metadata */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
        <div className="text-slate-300 font-semibold text-sm mb-2">Trip Details</div>
        {[
          { label: 'Supervisor', value: trip.supervisorName },
          { label: 'Weather', value: trip.weather },
          { label: 'Day hours', value: formatHoursMinutes(trip.dayMinutes ?? 0) },
          { label: 'Night hours', value: formatHoursMinutes(trip.nightMinutes ?? 0) },
          { label: 'Start odometer', value: `${trip.startOdometer} km` },
          { label: 'End odometer', value: trip.endOdometer != null ? `${trip.endOdometer} km` : '–' },
          { label: 'OBD2 data', value: trip.obd2Status },
          { label: 'Sync status', value: trip.syncStatus },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-slate-400">{label}</span>
            <span className="text-white capitalize">{value}</span>
          </div>
        ))}
      </div>

      <div className="h-4" />
    </div>
  );
}
