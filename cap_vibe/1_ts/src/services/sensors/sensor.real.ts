import { Geolocation, type WatchPositionCallback } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';
import type { ISensorService } from './sensor.interface';
import type { GpsPoint } from '../../models/gps';
import type { AccelPoint } from '../../models/accel';

export class RealSensorService implements ISensorService {
  private gpsPoints: GpsPoint[] = [];
  private accelPoints: AccelPoint[] = [];
  private gpsWatchId: string | null = null;
  private accelListeners: Array<(p: AccelPoint) => void> = [];
  private gpsListeners: Array<(p: GpsPoint) => void> = [];
  private accelIntervalId: ReturnType<typeof setInterval> | null = null;

  // ─── GPS ────────────────────────────────────────────────────────────────────

  async startGpsLogging(intervalMs = 1000): Promise<void> {
    this.gpsPoints = [];

    const callback: WatchPositionCallback = (position, err) => {
      if (err || !position) return;
      const point: GpsPoint = {
        timestamp: position.timestamp,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        speed: position.coords.speed,
        altitude: position.coords.altitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
      };
      this.gpsPoints.push(point);
      this.gpsListeners.forEach((cb) => cb(point));
    };

    this.gpsWatchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: intervalMs * 2 },
      callback,
    );
  }

  stopGpsLogging(): GpsPoint[] {
    if (this.gpsWatchId !== null) {
      Geolocation.clearWatch({ id: this.gpsWatchId });
      this.gpsWatchId = null;
    }
    return [...this.gpsPoints];
  }

  async getCurrentGpsPoint(): Promise<GpsPoint | null> {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      return {
        timestamp: pos.timestamp,
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        speed: pos.coords.speed,
        altitude: pos.coords.altitude,
        accuracy: pos.coords.accuracy,
        heading: pos.coords.heading,
      };
    } catch {
      return null;
    }
  }

  onGpsUpdate(callback: (point: GpsPoint) => void): () => void {
    this.gpsListeners.push(callback);
    return () => { this.gpsListeners = this.gpsListeners.filter((cb) => cb !== callback); };
  }

  // ─── Accelerometer ─────────────────────────────────────────────────────────

  startAccelLogging(intervalMs = 200): void {
    this.accelPoints = [];

    Motion.addListener('accel', (event) => {
      const point: AccelPoint = {
        timestamp: Date.now(),
        x: event.acceleration.x ?? 0,
        y: event.acceleration.y ?? 0,
        z: event.acceleration.z ?? 0,
      };
      // Throttle to intervalMs
      const last = this.accelPoints[this.accelPoints.length - 1];
      if (!last || point.timestamp - last.timestamp >= intervalMs) {
        this.accelPoints.push(point);
        this.accelListeners.forEach((cb) => cb(point));
      }
    });
  }

  stopAccelLogging(): AccelPoint[] {
    Motion.removeAllListeners();
    if (this.accelIntervalId) {
      clearInterval(this.accelIntervalId);
      this.accelIntervalId = null;
    }
    return [...this.accelPoints];
  }

  onAccelUpdate(callback: (point: AccelPoint) => void): () => void {
    this.accelListeners.push(callback);
    return () => { this.accelListeners = this.accelListeners.filter((cb) => cb !== callback); };
  }
}

export const sensorService = new RealSensorService();
