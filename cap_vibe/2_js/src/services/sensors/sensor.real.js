import { Geolocation } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';

export class RealSensorService {
  constructor() {
    this.gpsPoints = [];
    this.accelPoints = [];
    this.gpsWatchId = null;
    this.accelListeners = [];
    this.gpsListeners = [];
  }

  async startGpsLogging(intervalMs = 1000) {
    this.gpsPoints = [];

    const callback = (position, err) => {
      if (err || !position) return;
      const point = {
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

  stopGpsLogging() {
    if (this.gpsWatchId !== null) {
      Geolocation.clearWatch({ id: this.gpsWatchId });
      this.gpsWatchId = null;
    }
    return [...this.gpsPoints];
  }

  async getCurrentGpsPoint() {
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

  onGpsUpdate(callback) {
    this.gpsListeners.push(callback);
    return () => {
      this.gpsListeners = this.gpsListeners.filter((cb) => cb !== callback);
    };
  }

  startAccelLogging(_intervalMs = 200) {
    this.accelPoints = [];

    Motion.addListener('accel', (event) => {
      const point = {
        timestamp: Date.now(),
        x: event.acceleration.x ?? 0,
        y: event.acceleration.y ?? 0,
        z: event.acceleration.z ?? 0,
      };
      const last = this.accelPoints[this.accelPoints.length - 1];
      if (!last || point.timestamp - last.timestamp >= 200) {
        this.accelPoints.push(point);
        this.accelListeners.forEach((cb) => cb(point));
      }
    });
  }

  stopAccelLogging() {
    Motion.removeAllListeners();
    return [...this.accelPoints];
  }

  onAccelUpdate(callback) {
    this.accelListeners.push(callback);
    return () => {
      this.accelListeners = this.accelListeners.filter((cb) => cb !== callback);
    };
  }
}

export const sensorService = new RealSensorService();
