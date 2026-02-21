import { v4 as uuidv4 } from 'uuid';
import type { Trip } from '../models/trip';
import type { Supervisor } from '../models/supervisor';
import type { GpsPoint } from '../models/gps';
import type { AccelPoint } from '../models/accel';
import type { Obd2Sample } from '../models/obd2';

// Canberra sample route: Civic → Parliament → Lake loop
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

// Interpolate GPS points for a trip of durationMs duration
function interpolateRoute(startTime: number, durationMs: number, intervalMs = 1000): GpsPoint[] {
  const totalSamples = Math.floor(durationMs / intervalMs);
  const points: GpsPoint[] = [];
  const segCount = ROUTE_POINTS.length - 1;

  for (let i = 0; i < totalSamples; i++) {
    const progress = i / totalSamples;
    const segIdx = Math.min(Math.floor(progress * segCount), segCount - 1);
    const segProgress = (progress * segCount) - segIdx;
    const a = ROUTE_POINTS[segIdx];
    const b = ROUTE_POINTS[segIdx + 1] ?? a;

    const lat = a.lat + (b.lat - a.lat) * segProgress;
    const lng = a.lng + (b.lng - a.lng) * segProgress;

    // Simulate speed: ramp up, cruise, slow down
    let speed: number;
    if (progress < 0.1) speed = progress * 10 * 14; // 0→14 m/s
    else if (progress > 0.85) speed = (1 - progress) / 0.15 * 14;
    else speed = 12 + Math.sin(progress * Math.PI * 4) * 3; // ~43–54 km/h

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

function generateAccelPoints(startTime: number, durationMs: number): AccelPoint[] {
  const points: AccelPoint[] = [];
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

function generateObd2Samples(startTime: number, durationMs: number): Obd2Sample[] {
  const samples: Obd2Sample[] = [];
  const count = Math.floor(durationMs / 1000);
  let speed = 0;

  for (let i = 0; i < count; i++) {
    const progress = i / count;
    if (progress < 0.1) speed = Math.min(55, speed + 6);
    else if (progress > 0.85) speed = Math.max(0, speed - 4);
    else speed = 48 + Math.sin(progress * Math.PI * 5) * 10;
    speed = Math.max(0, Math.min(85, speed));

    const rpm = speed < 5 ? 800 : 800 + (speed / 100) * 3200 + (Math.random() - 0.5) * 300;

    samples.push({
      timestamp: startTime + i * 1000,
      vehicleSpeed: Math.round(speed),
      rpm: Math.round(Math.min(4500, Math.max(700, rpm))),
      engineLoad: Math.round(20 + (speed / 100) * 60),
      coolantTemp: 87 + Math.random() * 8,
      throttlePosition: Math.round((speed / 100) * 55 + Math.random() * 10),
      fuelLevel: Math.max(20, 72 - i * 0.015),
    });
  }

  return samples;
}

export function createSeedSupervisors(): Supervisor[] {
  const now = Date.now();
  return [
    {
      id: 'sup-001',
      name: 'Mum',
      licenceNumber: 'NSW123456',
      relationship: 'Parent',
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
    },
    {
      id: 'sup-002',
      name: 'Dad',
      licenceNumber: 'NSW654321',
      relationship: 'Parent',
      createdAt: now - 30 * 24 * 60 * 60 * 1000,
    },
  ];
}

interface TripSeed {
  durationMs: number;
  daysAgo: number;
  hourOfDay: number; // 0–23
  supervisorId: string;
  supervisorName: string;
  weather: Trip['weather'];
  startOdometer: number;
}

export function createSeedTrips(): Trip[] {
  const seeds: TripSeed[] = [
    { durationMs: 15 * 60 * 1000, daysAgo: 1, hourOfDay: 9,  supervisorId: 'sup-001', supervisorName: 'Mum', weather: 'sunny',    startOdometer: 43200 },
    { durationMs: 30 * 60 * 1000, daysAgo: 3, hourOfDay: 14, supervisorId: 'sup-002', supervisorName: 'Dad', weather: 'overcast', startOdometer: 43250 },
    { durationMs: 60 * 60 * 1000, daysAgo: 5, hourOfDay: 19, supervisorId: 'sup-001', supervisorName: 'Mum', weather: 'night',    startOdometer: 43310 },
    { durationMs: 45 * 60 * 1000, daysAgo: 8, hourOfDay: 10, supervisorId: 'sup-002', supervisorName: 'Dad', weather: 'rain',     startOdometer: 43395 },
    { durationMs: 20 * 60 * 1000, daysAgo: 10, hourOfDay: 20, supervisorId: 'sup-001', supervisorName: 'Mum', weather: 'night',   startOdometer: 43450 },
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
    const obd2Samples = generateObd2Samples(startTime, seed.durationMs);

    const distanceKm = (seed.durationMs / 1000 / 3600) * 48; // approx 48 km/h avg
    const durationMin = seed.durationMs / 1000 / 60;

    const isNight = seed.hourOfDay >= 19 || seed.hourOfDay < 6;
    const nightMinutes = isNight ? durationMin : 0;
    const dayMinutes = isNight ? 0 : durationMin;

    return {
      id: tripId,
      supervisorId: seed.supervisorId,
      supervisorName: seed.supervisorName,
      startTime,
      endTime,
      startOdometer: seed.startOdometer,
      endOdometer: seed.startOdometer + Math.round(distanceKm),
      status: 'complete' as const,
      syncStatus: 'synced' as const,
      cloudId: `cloud-${tripId}`,
      weather: seed.weather,
      gpsPoints,
      accelPoints,
      accelEvents: [],
      obd2Data: {
        tripId,
        samples: obd2Samples,
        dtcCodes: [],
      },
      obd2Status: 'received' as const,
      distanceKm: Math.round(distanceKm * 10) / 10,
      odoDistanceKm: Math.round(distanceKm),
      dayMinutes: Math.round(dayMinutes),
      nightMinutes: Math.round(nightMinutes),
      maxSpeedKmh: 62,
      avgSpeedKmh: 48,
      startLat: ROUTE_POINTS[0].lat,
      startLng: ROUTE_POINTS[0].lng,
    } satisfies Trip;
  });
}
