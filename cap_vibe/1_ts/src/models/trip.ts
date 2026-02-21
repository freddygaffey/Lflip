import type { GpsPoint } from './gps';
import type { AccelPoint, AccelEvent } from './accel';
import type { Obd2TripData } from './obd2';

export type WeatherCondition = 'sunny' | 'overcast' | 'rain' | 'night';

export type TripStatus = 'pending' | 'active' | 'stopped' | 'complete';

export type SyncStatus = 'unsynced' | 'syncing' | 'synced' | 'error';

export interface Trip {
  id: string;
  supervisorId: string;
  supervisorName: string;          // denormalised for display
  startTime: number;               // unix ms
  endTime?: number;                // unix ms
  startOdometer: number;           // km
  endOdometer?: number;            // km

  // Status
  status: TripStatus;
  syncStatus: SyncStatus;
  cloudId?: string;

  // Conditions
  weather: WeatherCondition;

  // Phone sensor data
  gpsPoints: GpsPoint[];
  accelPoints: AccelPoint[];
  accelEvents: AccelEvent[];

  // OBD2 data from ESP32 (may be absent)
  obd2Data?: Obd2TripData;
  obd2Status: 'pending' | 'received' | 'skipped' | 'failed';

  // Derived stats (calculated on trip end)
  distanceKm?: number;             // from GPS haversine
  odoDistanceKm?: number;          // end - start odometer
  dayMinutes?: number;
  nightMinutes?: number;
  maxSpeedKmh?: number;
  avgSpeedKmh?: number;

  // Location
  startLat?: number;
  startLng?: number;
}

export interface TripStartConfig {
  tripId: string;
  startTime: number;
}

export interface LogbookSummary {
  totalHours: number;
  dayHours: number;
  nightHours: number;
  tripCount: number;
  targetHours: number;
  nightTargetHours: number;
  lastTripDate?: number;
}

export interface TripFilters {
  supervisorId?: string;
  dateFrom?: number;
  dateTo?: number;
  nightOnly?: boolean;
  dayOnly?: boolean;
}

export interface AuthToken {
  token: string;
  userId: string;
  name: string;
}

export interface UserProfile {
  name: string;
  licenceNumber?: string;
  targetHours: number;
  nightStartHour: number;
  nightEndHour: number;
}
