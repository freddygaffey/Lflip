import { v4 as uuidv4 } from 'uuid';
import { bleService } from '../ble';
import { sensorService } from '../sensors/sensor.real';
import { mockApi } from '../api';
import { mergeTrip } from '../../utils/mergeTrip';
import type { Trip, WeatherCondition } from '../../models/trip';
import type { Obd2TripData } from '../../models/obd2';
import type { GpsPoint } from '../../models/gps';
import type { AccelPoint } from '../../models/accel';
import { GPS_INTERVAL_MS, ACCEL_INTERVAL_MS } from '../../config';

export type TripPhase =
  | 'idle'
  | 'starting'
  | 'active'
  | 'stopping'
  | 'transferring-obd2'
  | 'saving'
  | 'complete';

export interface ActiveTripState {
  tripId: string;
  phase: TripPhase;
  startTime: number;
  supervisorId: string;
  supervisorName: string;
  weather: WeatherCondition;
  startOdometer: number;
  obd2Progress: number;      // 0-100
  elapsedMs: number;
  currentSpeedKmh: number;
  currentLat?: number;
  currentLng?: number;
  gpsPoints: GpsPoint[];
}

type PhaseListener = (state: ActiveTripState) => void;

class TripManagerService {
  private state: ActiveTripState | null = null;
  private listeners: PhaseListener[] = [];
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private obd2ProgressUnsub: (() => void) | null = null;

  getState(): ActiveTripState | null {
    return this.state;
  }

  subscribe(listener: PhaseListener): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((l) => l !== listener); };
  }

  private notify() {
    if (this.state) this.listeners.forEach((l) => l(this.state!));
  }

  private setState(partial: Partial<ActiveTripState>) {
    if (!this.state) return;
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  // ─── Start Trip ────────────────────────────────────────────────────────────

  async startTrip(opts: {
    supervisorId: string;
    supervisorName: string;
    weather: WeatherCondition;
    startOdometer: number;
  }): Promise<string> {
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
      obd2Progress: 0,
      elapsedMs: 0,
      currentSpeedKmh: 0,
      gpsPoints: [],
    };
    this.notify();

    // Send start command to ESP32 (mock or real)
    try {
      await bleService.sendStartCommand({ tripId, startTime });
    } catch {
      // BLE not connected — continue without ESP32 (OBD2 will be skipped)
    }

    // Start phone sensors
    await sensorService.startGpsLogging(GPS_INTERVAL_MS);
    sensorService.startAccelLogging(ACCEL_INTERVAL_MS);

    // Live GPS feed to update UI
    sensorService.onGpsUpdate((point) => {
      if (!this.state || this.state.phase !== 'active') return;
      const speedKmh = point.speed != null ? point.speed * 3.6 : this.state.currentSpeedKmh;
      this.setState({
        currentSpeedKmh: speedKmh,
        currentLat: point.lat,
        currentLng: point.lng,
        gpsPoints: [...this.state.gpsPoints, point],
      });
    });

    // Elapsed time ticker
    this.elapsedTimer = setInterval(() => {
      if (this.state?.phase === 'active') {
        this.setState({ elapsedMs: Date.now() - this.state.startTime });
      }
    }, 1000);

    this.setState({ phase: 'active' });
    return tripId;
  }

  // ─── Stop Trip ─────────────────────────────────────────────────────────────

  async stopTrip(endOdometer: number): Promise<Trip> {
    if (!this.state || this.state.phase !== 'active') {
      throw new Error('No active trip');
    }

    const endTime = Date.now();
    this.setState({ phase: 'stopping' });

    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }

    // Stop sensors and collect data
    const gpsPoints = sensorService.stopGpsLogging();
    const accelPoints = sensorService.stopAccelLogging();

    // Send stop command to ESP32
    try {
      await bleService.sendStopCommand();
    } catch { /* ignore */ }

    // Transfer OBD2 data
    this.setState({ phase: 'transferring-obd2', obd2Progress: 0 });

    let obd2Data: Obd2TripData | null = null;
    this.obd2ProgressUnsub = bleService.onObd2TransferProgress((progress) => {
      this.setState({ obd2Progress: progress });
    });

    try {
      obd2Data = await bleService.requestObd2Data();
      // Inject correct tripId
      obd2Data = { ...obd2Data, tripId: this.state.tripId };
    } catch {
      // OBD2 transfer failed — trip is still valid
    }

    this.obd2ProgressUnsub?.();

    // Merge all data into a complete Trip record
    this.setState({ phase: 'saving' });

    const mergedPartial = mergeTrip({
      trip: {
        id: this.state.tripId,
        supervisorId: this.state.supervisorId,
        supervisorName: this.state.supervisorName,
        weather: this.state.weather,
        startOdometer: this.state.startOdometer,
        endOdometer,
        obd2Status: obd2Data ? 'received' : 'failed',
        startLat: gpsPoints[0]?.lat,
        startLng: gpsPoints[0]?.lng,
      },
      gpsPoints,
      accelPoints,
      obd2Data,
      startTime: this.state.startTime,
      endTime,
    });

    const completedTrip: Trip = {
      ...mergedPartial,
      id: this.state.tripId,
      supervisorId: this.state.supervisorId,
      supervisorName: this.state.supervisorName,
      weather: this.state.weather,
      startOdometer: this.state.startOdometer,
      endOdometer,
      syncStatus: 'unsynced',
      status: 'complete',
    } as Trip;

    // Save locally
    await mockApi.saveLocalTrip(completedTrip);

    this.setState({ phase: 'complete' });
    this.state = null;

    return completedTrip;
  }

  // Skip OBD2 transfer (user pressed Skip)
  async skipObd2(): Promise<void> {
    this.obd2ProgressUnsub?.();
    // The stopTrip flow handles null obd2Data
  }
}

export const tripManager = new TripManagerService();
