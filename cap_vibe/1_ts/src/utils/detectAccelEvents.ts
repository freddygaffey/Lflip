import type { AccelPoint, AccelEvent, AccelEventType } from '../models/accel';
import type { GpsPoint } from '../models/gps';

const THRESHOLDS: Record<AccelEventType, number> = {
  hard_brake: 6,         // m/s² deceleration (negative Y)
  rapid_acceleration: 4, // m/s² acceleration (positive Y)
  sharp_turn: 5,         // m/s² lateral (X axis)
};

function nearestGps(timestamp: number, gpsPoints: GpsPoint[]): GpsPoint | undefined {
  return gpsPoints.reduce((best, p) => {
    if (!best) return p;
    return Math.abs(p.timestamp - timestamp) < Math.abs(best.timestamp - timestamp) ? p : best;
  }, undefined as GpsPoint | undefined);
}

export function detectAccelEvents(
  accelPoints: AccelPoint[],
  gpsPoints: GpsPoint[],
): AccelEvent[] {
  const events: AccelEvent[] = [];
  let lastEventTime = 0;
  const DEBOUNCE_MS = 3000; // don't log events within 3s of each other

  for (const point of accelPoints) {
    if (point.timestamp - lastEventTime < DEBOUNCE_MS) continue;

    const lateralMag = Math.abs(point.x);
    const longMag = point.y;

    let type: AccelEventType | null = null;
    let magnitude = 0;

    if (longMag < -THRESHOLDS.hard_brake) {
      type = 'hard_brake';
      magnitude = Math.abs(longMag);
    } else if (longMag > THRESHOLDS.rapid_acceleration) {
      type = 'rapid_acceleration';
      magnitude = longMag;
    } else if (lateralMag > THRESHOLDS.sharp_turn) {
      type = 'sharp_turn';
      magnitude = lateralMag;
    }

    if (type) {
      const gps = nearestGps(point.timestamp, gpsPoints);
      events.push({
        type,
        timestamp: point.timestamp,
        magnitude,
        lat: gps?.lat,
        lng: gps?.lng,
      });
      lastEventTime = point.timestamp;
    }
  }

  return events;
}
