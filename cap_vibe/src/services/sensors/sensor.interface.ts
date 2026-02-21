import type { GpsPoint } from '../../models/gps';
import type { AccelPoint } from '../../models/accel';

export interface ISensorService {
  // GPS logging (uses @capacitor/geolocation)
  startGpsLogging(intervalMs: number): Promise<void>;
  stopGpsLogging(): GpsPoint[];
  getCurrentGpsPoint(): Promise<GpsPoint | null>;
  onGpsUpdate(callback: (point: GpsPoint) => void): () => void;

  // Accelerometer logging (uses @capacitor/motion)
  startAccelLogging(intervalMs: number): void;
  stopAccelLogging(): AccelPoint[];
  onAccelUpdate(callback: (point: AccelPoint) => void): () => void;
}
