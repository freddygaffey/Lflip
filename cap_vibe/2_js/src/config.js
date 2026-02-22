// Feature Flags — toggle each service independently
export const USE_MOCK_API = false;     // false = Flask backend, true = in-app mock data
export const USE_MOCK_BLE = true;      // true until real ESP32 hardware is ready
export const USE_MOCK_SENSORS = true;  // true until testing on a real device

// API: empty string = same origin (Vite proxies /api to Flask on port 5000)
export const API_BASE_URL = '';

// Trip settings
export const MAX_LEARNER_SPEED_KMH = 90;

export const STATE_REQUIREMENTS = {
  ACT: { total: 100, night: 10, label: 'Australian Capital Territory' },
  NSW: { total: 120, night: 20, label: 'New South Wales' },
  VIC: { total: 120, night: 10, label: 'Victoria' },
  QLD: { total: 100, night: 10, label: 'Queensland' },
  SA:  { total: 75,  night: 15, label: 'South Australia' },
  WA:  { total: 50,  night: 0,  label: 'Western Australia' },
  TAS: { total: 80,  night: 15, label: 'Tasmania' },
  NT:  { total: 50,  night: 0,  label: 'Northern Territory' },
};

export const DEFAULT_STATE = 'ACT';
export const DEFAULT_TARGET_HOURS = STATE_REQUIREMENTS[DEFAULT_STATE].total;
export const NIGHT_HOURS_REQUIRED = STATE_REQUIREMENTS[DEFAULT_STATE].night;

// Logging intervals
export const GPS_INTERVAL_MS = 1000;
export const ACCEL_INTERVAL_MS = 200;

// Location: Canberra
export const HOME_LAT = -35.2809;
export const HOME_LNG = 149.1300;
