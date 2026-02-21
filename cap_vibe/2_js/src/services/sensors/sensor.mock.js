/**
 * Mock sensor service for development when USE_MOCK is true.
 * Simulates GPS and accelerometer using interpolated Canberra route.
 */

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

const ROUTE_DURATION_MS = 15 * 60 * 1000; // 15 min to complete one lap

function getGpsPointForProgress(progress, timestamp) {
  const p = Math.min(progress, 1);
  const segCount = ROUTE_POINTS.length - 1;
  const segIdx = Math.min(Math.floor(p * segCount), segCount - 1);
  const segProgress = p * segCount - segIdx;
  const a = ROUTE_POINTS[segIdx];
  const b = ROUTE_POINTS[segIdx + 1] ?? a;

  const lat = a.lat + (b.lat - a.lat) * segProgress + (Math.random() - 0.5) * 0.0001;
  const lng = a.lng + (b.lng - a.lng) * segProgress + (Math.random() - 0.5) * 0.0001;

  let speed;
  if (p < 0.1) speed = p * 10 * 14;
  else if (p > 0.85) speed = ((1 - p) / 0.15) * 14;
  else speed = 12 + Math.sin(p * Math.PI * 4) * 3;

  return {
    timestamp,
    lat,
    lng,
    speed, // m/s
    altitude: 580 + Math.random() * 20,
    accuracy: 3 + Math.random() * 5,
    heading: null,
  };
}

function getAccelPoint(timestamp) {
  return {
    timestamp,
    x: (Math.random() - 0.5) * 2,
    y: (Math.random() - 0.5) * 3,
    z: 9.81 + (Math.random() - 0.5) * 0.5,
  };
}

export class MockSensorService {
  constructor() {
    this.gpsPoints = [];
    this.accelPoints = [];
    this.gpsIntervalId = null;
    this.accelIntervalId = null;
    this.gpsListeners = [];
    this.accelListeners = [];
    this.gpsStartTime = null;
    this.accelStartTime = null;
    this.gpsIntervalMs = 1000;
    this.accelIntervalMs = 200;
  }

  async startGpsLogging(intervalMs = 1000) {
    this.gpsPoints = [];
    this.gpsStartTime = Date.now();
    this.gpsIntervalMs = intervalMs;

    const emit = () => {
      const elapsed = Date.now() - this.gpsStartTime;
      const progress = (elapsed % ROUTE_DURATION_MS) / ROUTE_DURATION_MS;
      const point = getGpsPointForProgress(progress, Date.now());
      this.gpsPoints.push(point);
      this.gpsListeners.forEach((cb) => cb(point));
    };

    emit(); // first point immediately
    this.gpsIntervalId = setInterval(emit, intervalMs);
  }

  stopGpsLogging() {
    if (this.gpsIntervalId !== null) {
      clearInterval(this.gpsIntervalId);
      this.gpsIntervalId = null;
    }
    return [...this.gpsPoints];
  }

  async getCurrentGpsPoint() {
    if (!this.gpsStartTime) {
      this.gpsStartTime = Date.now();
    }
    const elapsed = Date.now() - this.gpsStartTime;
    const progress = (elapsed % ROUTE_DURATION_MS) / ROUTE_DURATION_MS;
    return getGpsPointForProgress(progress, Date.now());
  }

  onGpsUpdate(callback) {
    this.gpsListeners.push(callback);
    return () => {
      this.gpsListeners = this.gpsListeners.filter((cb) => cb !== callback);
    };
  }

  startAccelLogging(intervalMs = 200) {
    this.accelPoints = [];
    this.accelStartTime = Date.now();
    this.accelIntervalMs = intervalMs;

    const emit = () => {
      const point = getAccelPoint(Date.now());
      this.accelPoints.push(point);
      this.accelListeners.forEach((cb) => cb(point));
    };

    emit();
    this.accelIntervalId = setInterval(emit, intervalMs);
  }

  stopAccelLogging() {
    if (this.accelIntervalId !== null) {
      clearInterval(this.accelIntervalId);
      this.accelIntervalId = null;
    }
    return [...this.accelPoints];
  }

  onAccelUpdate(callback) {
    this.accelListeners.push(callback);
    return () => {
      this.accelListeners = this.accelListeners.filter((cb) => cb !== callback);
    };
  }
}

export const mockSensorService = new MockSensorService();
