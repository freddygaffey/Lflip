import type { IBleService } from './ble.interface';
import type { BleDevice, ConnectionStatus, DeviceInfo } from '../../models/device';
import type { Obd2TripData, Obd2Sample } from '../../models/obd2';
import type { TripStartConfig } from '../../models/trip';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class MockBleService implements IBleService {
  private status: ConnectionStatus = 'disconnected';
  private statusListeners: Array<(s: ConnectionStatus) => void> = [];
  private progressListeners: Array<(p: number) => void> = [];
  private activeTripStartTime: number | null = null;

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s));
  }

  // ─── Connection ────────────────────────────────────────────────────────────

  async scanForDevices(): Promise<BleDevice[]> {
    this.setStatus('scanning');
    await delay(2000);
    this.setStatus('disconnected');
    return [
      { id: 'mock-esp32-001', name: 'LPlate-ESP32-001', rssi: -58, mac: 'AA:BB:CC:DD:EE:01' },
      { id: 'mock-esp32-002', name: 'LPlate-ESP32-002', rssi: -73, mac: 'AA:BB:CC:DD:EE:02' },
    ];
  }

  async connect(deviceId: string): Promise<void> {
    this.setStatus('connecting');
    await delay(1500);
    if (!deviceId.startsWith('mock')) throw new Error('Unknown device');
    this.setStatus('connected');
  }

  async disconnect(): Promise<void> {
    await delay(300);
    this.setStatus('disconnected');
  }

  getConnectionStatus(): ConnectionStatus {
    return this.status;
  }

  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  // ─── Trip Control ──────────────────────────────────────────────────────────

  async sendStartCommand(config: TripStartConfig): Promise<{ ack: boolean }> {
    if (this.status !== 'connected') throw new Error('BLE not connected');
    this.activeTripStartTime = config.startTime;
    await delay(500);
    return { ack: true };
  }

  async sendStopCommand(): Promise<{ ack: boolean }> {
    if (this.status !== 'connected') throw new Error('BLE not connected');
    await delay(500);
    return { ack: true };
  }

  // ─── OBD2 Data Transfer ────────────────────────────────────────────────────

  onObd2TransferProgress(callback: (progress: number) => void): () => void {
    this.progressListeners.push(callback);
    return () => {
      this.progressListeners = this.progressListeners.filter((cb) => cb !== callback);
    };
  }

  async requestObd2Data(): Promise<Obd2TripData> {
    const startTime = this.activeTripStartTime ?? Date.now() - 20 * 60 * 1000;
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const sampleCount = Math.max(1, Math.floor(durationMs / 1000));

    // Simulate chunked BLE transfer with progress
    const progressSteps = [10, 30, 50, 80, 100];
    for (const pct of progressSteps) {
      await delay(1000);
      this.progressListeners.forEach((cb) => cb(pct));
    }

    const samples: Obd2Sample[] = this._generateObd2Samples(startTime, sampleCount);
    this.activeTripStartTime = null;

    return {
      tripId: 'mock-trip',
      samples,
      dtcCodes: [],
    };
  }

  private _generateObd2Samples(startTime: number, count: number): Obd2Sample[] {
    const samples: Obd2Sample[] = [];
    let currentSpeed = 0; // km/h
    let rpm = 800;

    for (let i = 0; i < count; i++) {
      // Simulate realistic speed profile: accelerate, cruise, brake
      const phase = (i / count);
      if (phase < 0.1) {
        currentSpeed = Math.min(50, currentSpeed + 5);
      } else if (phase < 0.3) {
        currentSpeed = Math.min(60, currentSpeed + 2);
      } else if (phase < 0.6) {
        currentSpeed = 50 + Math.sin(i * 0.1) * 10; // cruising with variation
      } else if (phase < 0.8) {
        currentSpeed = Math.min(60, currentSpeed + 1);
      } else {
        currentSpeed = Math.max(0, currentSpeed - 4); // slowing down
      }

      currentSpeed = Math.max(0, Math.min(85, currentSpeed));

      // RPM correlates with speed
      if (currentSpeed < 5) {
        rpm = 800 + Math.random() * 200; // idle
      } else {
        rpm = 800 + (currentSpeed / 100) * 3200 + (Math.random() - 0.5) * 400;
      }
      rpm = Math.max(700, Math.min(4500, rpm));

      const engineLoad = currentSpeed < 5
        ? 15 + Math.random() * 5
        : 20 + (currentSpeed / 100) * 60 + (Math.random() - 0.5) * 10;

      samples.push({
        timestamp: startTime + i * 1000,
        vehicleSpeed: Math.round(currentSpeed),
        rpm: Math.round(rpm),
        engineLoad: Math.round(Math.min(95, Math.max(10, engineLoad))),
        coolantTemp: 85 + Math.random() * 10,
        throttlePosition: Math.round((currentSpeed / 100) * 60 + Math.random() * 15),
        fuelLevel: Math.max(10, 65 - i * 0.01),
      });
    }

    return samples;
  }

  // ─── Device Management ─────────────────────────────────────────────────────

  async getDeviceInfo(): Promise<DeviceInfo> {
    await delay(400);
    return {
      firmwareVersion: '1.2.3',
      mac: 'AA:BB:CC:DD:EE:01',
      batteryPct: 82,
      sdCardPresent: true,
      sdCardFreeBytes: 1_073_741_824, // 1 GB
      wifiConfigured: true,
      wifiSsid: 'HomeNetwork',
      obd2Connected: true,
      obd2Protocol: 'ISO 15765-4 (CAN)',
    };
  }

  async sendWifiCredentials(_ssid: string, _password: string): Promise<boolean> {
    await delay(800);
    return true;
  }

  async updateOdometer(_odo: number): Promise<boolean> {
    await delay(300);
    return true;
  }
}
