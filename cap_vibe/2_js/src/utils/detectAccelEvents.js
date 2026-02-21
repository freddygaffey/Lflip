const THRESHOLDS = {
  hard_brake: 6,
  rapid_acceleration: 4,
  sharp_turn: 5,
};

function nearestGps(timestamp, gpsPoints) {
  return gpsPoints.reduce((best, p) => {
    if (!best) return p;
    return Math.abs(p.timestamp - timestamp) < Math.abs(best.timestamp - timestamp)
      ? p
      : best;
  }, undefined);
}

export function detectAccelEvents(accelPoints, gpsPoints) {
  const events = [];
  let lastEventTime = 0;
  const DEBOUNCE_MS = 3000;

  for (const point of accelPoints) {
    if (point.timestamp - lastEventTime < DEBOUNCE_MS) continue;

    const lateralMag = Math.abs(point.x);
    const longMag = point.y;

    let type = null;
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
