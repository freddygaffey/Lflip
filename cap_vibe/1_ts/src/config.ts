// ─── Feature Flags ────────────────────────────────────────────────────────────
// Set USE_MOCK = false when Flask backend and real BLE are ready.
export const USE_MOCK = true;

// ─── API ──────────────────────────────────────────────────────────────────────
// Used by RealApiService — ignored when USE_MOCK = true
export const API_BASE_URL = 'http://192.168.1.50:5000';

// ─── Trip Settings ────────────────────────────────────────────────────────────
export const DEFAULT_TARGET_HOURS = 120;
export const NIGHT_HOURS_REQUIRED = 20;
export const MAX_LEARNER_SPEED_KMH = 90;

// ─── GPS Logging ──────────────────────────────────────────────────────────────
export const GPS_INTERVAL_MS = 1000;
export const ACCEL_INTERVAL_MS = 200;

// ─── Location: Canberra ───────────────────────────────────────────────────────
export const HOME_LAT = -35.2809;
export const HOME_LNG = 149.1300;
