import type { Trip } from '../models/trip';
import type { GpsPoint } from '../models/gps';
import type { AccelPoint } from '../models/accel';
import type { Obd2TripData } from '../models/obd2';
import { totalDistanceKm } from './calculateDistance';
import { detectAccelEvents } from './detectAccelEvents';
import { isNightTime } from '../services/location/nightTime';

interface MergeOptions {
  trip: Partial<Trip>;
  gpsPoints: GpsPoint[];
  accelPoints: AccelPoint[];
  obd2Data: Obd2TripData | null;
  startTime: number;
  endTime: number;
}

export function mergeTrip(opts: MergeOptions): Partial<Trip> {
  const { gpsPoints, accelPoints, obd2Data, startTime, endTime } = opts;

  const distanceKm = totalDistanceKm(gpsPoints);
  const accelEvents = detectAccelEvents(accelPoints, gpsPoints);

  // Calculate day/night split
  const durationMs = endTime - startTime;
  const durationMin = durationMs / 1000 / 60;

  // Sample at hourly intervals to determine night/day split
  let nightMs = 0;
  const sampleInterval = 60_000; // 1 minute
  for (let t = startTime; t < endTime; t += sampleInterval) {
    if (isNightTime(new Date(t))) {
      nightMs += sampleInterval;
    }
  }
  const nightMinutes = Math.round(nightMs / 60_000);
  const dayMinutes = Math.round(durationMin - nightMinutes);

  // Speed stats from GPS
  const speeds = gpsPoints
    .map((p) => (p.speed ?? 0) * 3.6) // m/s → km/h
    .filter((s) => s > 0);
  const maxSpeedKmh = speeds.length > 0 ? Math.max(...speeds) : 0;
  const avgSpeedKmh =
    speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0;

  return {
    ...opts.trip,
    gpsPoints,
    accelPoints,
    accelEvents,
    obd2Data: obd2Data ?? undefined,
    obd2Status: obd2Data ? 'received' : opts.trip.obd2Status ?? 'skipped',
    startTime,
    endTime,
    distanceKm: Math.round(distanceKm * 10) / 10,
    dayMinutes,
    nightMinutes,
    maxSpeedKmh: Math.round(maxSpeedKmh),
    avgSpeedKmh: Math.round(avgSpeedKmh),
    status: 'complete',
    syncStatus: 'unsynced',
  };
}
