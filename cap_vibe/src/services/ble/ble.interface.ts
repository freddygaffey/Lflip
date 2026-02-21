import type { BleDevice, ConnectionStatus, DeviceInfo } from '../../models/device';
import type { Obd2TripData } from '../../models/obd2';
import type { TripStartConfig } from '../../models/trip';

export interface IBleService {
  // Connection lifecycle
  scanForDevices(): Promise<BleDevice[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void;

  // Trip control commands → sent TO ESP32
  sendStartCommand(config: TripStartConfig): Promise<{ ack: boolean }>;
  sendStopCommand(): Promise<{ ack: boolean }>;

  // OBD2 data transfer ← received FROM ESP32 after trip ends
  requestObd2Data(): Promise<Obd2TripData>;
  onObd2TransferProgress(callback: (progress: number) => void): () => void;

  // Device management
  getDeviceInfo(): Promise<DeviceInfo>;
  sendWifiCredentials(ssid: string, password: string): Promise<boolean>;
  updateOdometer(odo: number): Promise<boolean>;
}
