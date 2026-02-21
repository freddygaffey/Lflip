import { v4 as uuidv4 } from 'uuid';
import { bleService } from '../ble/index.js';
import { sensorService } from '../sensors/index.js';
import { apiService } from '../api/index.js';
import { mergeTrip } from '../../utils/mergeTrip.js';
import { GPS_INTERVAL_MS, ACCEL_INTERVAL_MS } from '../../config.js';

export const tripManager = {
  state: null,
  listeners: [],
  elapsedTimer: null,

  getState() {
    return this.state;
  },

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  },

  _notify() {
    this.listeners.forEach((l) => l(this.state));
  },

  _setState(partial) {
    if (!this.state) return;
    this.state = { ...this.state, ...partial };
    this._notify();
  },

  async startTrip(opts) {
    const tripId = uuidv4();
    const startTime = Date.now();

    this.state = {
      tripId,
      phase: 'starting',
      startTime,
      supervisorId: opts.supervisorId,
      supervisorName: opts.supervisorName,
      weather: opts.weather,
      startOdometer: opts.startOdometer,
      elapsedMs: 0,
      currentSpeedKmh: 0,
      gpsPoints: [],
    };
    this._notify();

    try {
      await bleService.sendStartCommand({
        tripId,
        startTime,
        startOdometer: opts.startOdometer,
      });
    } catch {
      // BLE not connected — continue without ESP32
    }

    await sensorService.startGpsLogging(GPS_INTERVAL_MS);
    sensorService.startAccelLogging(ACCEL_INTERVAL_MS);

    sensorService.onGpsUpdate((point) => {
      if (!this.state || this.state.phase !== 'active') return;
      const speedKmh = point.speed != null ? point.speed * 3.6 : this.state.currentSpeedKmh;
      this._setState({
        currentSpeedKmh: speedKmh,
        gpsPoints: [...this.state.gpsPoints, point],
      });
    });

    this.elapsedTimer = setInterval(() => {
      if (this.state?.phase === 'active') {
        this._setState({ elapsedMs: Date.now() - this.state.startTime });
      }
    }, 1000);

    this._setState({ phase: 'active' });
    return tripId;
  },

  async stopTrip(endOdometer, weather) {
    if (!this.state || this.state.phase !== 'active') {
      throw new Error('No active trip');
    }

    const endTime = Date.now();
    this._setState({ phase: 'stopping' });

    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }

    const gpsPoints = sensorService.stopGpsLogging();
    const accelPoints = sensorService.stopAccelLogging();

    try {
      await bleService.sendStopCommand();
    } catch {}

    this._setState({ phase: 'transferring-odo' });

    let odoFromEsp = null;
    try {
      odoFromEsp = await bleService.requestOdometerData();
    } catch {}

    this._setState({ phase: 'saving' });

    const startOdo = odoFromEsp?.startOdo ?? this.state.startOdometer;
    const endOdo = odoFromEsp?.endOdo ?? endOdometer;
    const odoSource = odoFromEsp ? 'esp32' : 'manual';

    const merged = mergeTrip({
      trip: {
        id: this.state.tripId,
        supervisorId: this.state.supervisorId,
        supervisorName: this.state.supervisorName,
        weather: weather ?? this.state.weather ?? 'sunny',
      },
      gpsPoints,
      accelPoints,
      startTime: this.state.startTime,
      endTime,
      startOdometer: startOdo,
      endOdometer: endOdo,
      odoSource,
    });

    const completedTrip = {
      ...merged,
      id: this.state.tripId,
      supervisorId: this.state.supervisorId,
      supervisorName: this.state.supervisorName,
      weather: weather ?? this.state.weather ?? 'sunny',
      startOdometer: startOdo,
      endOdometer: endOdo,
      syncStatus: 'unsynced',
      status: 'complete',
      approvalState: 'pending',
    };

    await apiService.saveLocalTrip(completedTrip);

    this._setState({ phase: 'complete' });
    this.state = null;
    this._notify();

    return completedTrip;
  },
};
