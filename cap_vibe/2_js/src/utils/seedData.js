import { v4 as uuidv4 } from 'uuid';

const ROUTE_POINTS = [
  { lat: -35.2809, lng: 149.1300 },
  { lat: -35.2835, lng: 149.1310 },
  { lat: -35.2880, lng: 149.1330 },
  { lat: -35.2960, lng: 149.1340 },
  { lat: -35.3008, lng: 149.1290 },
  { lat: -35.2990, lng: 149.1240 },
  { lat: -35.2940, lng: 149.1200 },
  { lat: -35.2880, lng: 149.1280 },
  { lat: -35.2830, lng: 149.1310 },
  { lat: -35.2809, lng: 149.1300 },
];

function interpolateRoute(startTime, durationMs, intervalMs = 1000) {
  const totalSamples = Math.floor(durationMs / intervalMs);
  const points = [];
  const segCount = ROUTE_POINTS.length - 1;

  for (let i = 0; i < totalSamples; i++) {
    const progress = i / totalSamples;
    const segIdx = Math.min(Math.floor(progress * segCount), segCount - 1);
    const segProgress = progress * segCount - segIdx;
    const a = ROUTE_POINTS[segIdx];
    const b = ROUTE_POINTS[segIdx + 1] ?? a;

    const lat = a.lat + (b.lat - a.lat) * segProgress;
    const lng = a.lng + (b.lng - a.lng) * segProgress;

    let speed;
    if (progress < 0.1) speed = progress * 10 * 14;
    else if (progress > 0.85) speed = ((1 - progress) / 0.15) * 14;
    else speed = 12 + Math.sin(progress * Math.PI * 4) * 3;

    points.push({
      timestamp: startTime + i * intervalMs,
      lat: lat + (Math.random() - 0.5) * 0.0001,
      lng: lng + (Math.random() - 0.5) * 0.0001,
      speed,
      altitude: 580 + Math.random() * 20,
      accuracy: 3 + Math.random() * 5,
      heading: null,
    });
  }

  return points;
}

function generateAccelPoints(startTime, durationMs) {
  const points = [];
  const count = Math.floor(durationMs / 200);
  for (let i = 0; i < count; i++) {
    points.push({
      timestamp: startTime + i * 200,
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 3,
      z: 9.81 + (Math.random() - 0.5) * 0.5,
    });
  }
  return points;
}

export function createSeedSupervisors() {
  const now = Date.now();
  return [
    { id: 'sup-001', name: 'Mum', licenceNumber: 'NSW123456', relationship: 'Parent', createdAt: now - 30 * 24 * 60 * 60 * 1000 },
    { id: 'sup-002', name: 'Dad', licenceNumber: 'NSW654321', relationship: 'Parent', createdAt: now - 30 * 24 * 60 * 60 * 1000 },
  ];
}

export function createSeedTrips() {
  const seeds = [
    { durationMs: 15 * 60 * 1000, daysAgo: 1, hourOfDay: 9, supervisorId: 'sup-001', supervisorName: 'Mum', learnerId: 'learner-001', learnerName: 'Alex', weather: 'sunny', startOdometer: 43200, carName: "Mum's car" },
    { durationMs: 30 * 60 * 1000, daysAgo: 3, hourOfDay: 14, supervisorId: 'sup-002', supervisorName: 'Dad', learnerId: 'learner-001', learnerName: 'Alex', weather: 'overcast', startOdometer: 43250, carName: "Dad's ute" },
    { durationMs: 60 * 60 * 1000, daysAgo: 5, hourOfDay: 19, supervisorId: 'sup-001', supervisorName: 'Mum', learnerId: 'learner-001', learnerName: 'Alex', weather: 'night', startOdometer: 43310, carName: "Mum's car" },
    { durationMs: 45 * 60 * 1000, daysAgo: 8, hourOfDay: 10, supervisorId: 'sup-002', supervisorName: 'Dad', learnerId: 'learner-002', learnerName: 'Jordan', weather: 'rain', startOdometer: 43395, carName: "Dad's ute" },
    { durationMs: 20 * 60 * 1000, daysAgo: 10, hourOfDay: 20, supervisorId: 'sup-001', supervisorName: 'Mum', learnerId: 'learner-002', learnerName: 'Jordan', weather: 'night', startOdometer: 43450, carName: "Mum's car" },
  ];

  return seeds.map((seed, idx) => {
    const tripId = `seed-trip-${String(idx + 1).padStart(3, '0')}`;
    const now = new Date();
    now.setDate(now.getDate() - seed.daysAgo);
    now.setHours(seed.hourOfDay, 0, 0, 0);
    const startTime = now.getTime();
    const endTime = startTime + seed.durationMs;

    const gpsPoints = interpolateRoute(startTime, seed.durationMs);
    const accelPoints = generateAccelPoints(startTime, seed.durationMs);
    const distanceKm = (seed.durationMs / 1000 / 3600) * 48;
    const durationMin = seed.durationMs / 1000 / 60;
    const isNight = seed.hourOfDay >= 19 || seed.hourOfDay < 6;
    const nightMinutes = isNight ? durationMin : 0;
    const dayMinutes = isNight ? 0 : durationMin;

    return {
      id: tripId,
      supervisorId: seed.supervisorId,
      supervisorName: seed.supervisorName,
      learnerId: seed.learnerId,
      learnerName: seed.learnerName,
      carName: seed.carName,
      startTime,
      endTime,
      startOdometer: seed.startOdometer,
      endOdometer: seed.startOdometer + Math.round(distanceKm),
      status: 'complete',
      syncStatus: 'synced',
      cloudId: `cloud-${tripId}`,
      approvalState: idx < 3 ? 'approved' : 'pending',
      weather: seed.weather,
      gpsPoints,
      accelPoints,
      accelEvents: [],
      distanceKm: Math.round(distanceKm * 10) / 10,
      odoDistanceKm: Math.round(distanceKm),
      dayMinutes: Math.round(dayMinutes),
      nightMinutes: Math.round(nightMinutes),
      maxSpeedKmh: 62,
      avgSpeedKmh: 48,
      startLat: ROUTE_POINTS[0].lat,
      startLng: ROUTE_POINTS[0].lng,
      odoSource: 'esp32',
    };
  });
}
