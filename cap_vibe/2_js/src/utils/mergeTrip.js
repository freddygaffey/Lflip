import { totalDistanceKm } from './calculateDistance.js';
import { detectAccelEvents } from './detectAccelEvents.js';
import { isNightTime } from '../services/location/nightTime.js';

export function mergeTrip(opts) {
  const { gpsPoints, accelPoints, startTime, endTime, startOdometer, endOdometer, odoSource } = opts;

  const distanceKm = totalDistanceKm(gpsPoints);
  const accelEvents = detectAccelEvents(accelPoints, gpsPoints);

  const durationMs = endTime - startTime;
  const durationMin = durationMs / 1000 / 60;

  let nightMs = 0;
  const sampleInterval = 60_000;
  for (let t = startTime; t < endTime; t += sampleInterval) {
    if (isNightTime(new Date(t))) {
      nightMs += sampleInterval;
    }
  }
  const nightMinutes = Math.round(nightMs / 60_000);
  const dayMinutes = Math.round(durationMin - nightMinutes);

  const speeds = gpsPoints
    .map((p) => (p.speed ?? 0) * 3.6)
    .filter((s) => s > 0);
  const maxSpeedKmh = speeds.length > 0 ? Math.max(...speeds) : 0;
  const avgSpeedKmh = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

  const odoDistanceKm =
    endOdometer != null && startOdometer != null ? endOdometer - startOdometer : null;

  return {
    ...opts.trip,
    gpsPoints,
    accelPoints,
    accelEvents,
    startTime,
    endTime,
    startOdometer,
    endOdometer,
    odoSource: odoSource ?? 'manual',
    distanceKm: Math.round(distanceKm * 10) / 10,
    odoDistanceKm: odoDistanceKm != null ? Math.round(odoDistanceKm) : undefined,
    dayMinutes,
    nightMinutes,
    maxSpeedKmh: Math.round(maxSpeedKmh),
    avgSpeedKmh: Math.round(avgSpeedKmh),
    status: 'complete',
    syncStatus: 'unsynced',
    approvalState: 'pending',
  };
}
