// TODO: Implement using @capacitor-community/bluetooth-le when ESP32 hardware is ready.
// This stub satisfies the interface so the type system stays happy.
import type { IBleService } from './ble.interface';
import type { BleDevice, ConnectionStatus, DeviceInfo } from '../../models/device';
import type { Obd2TripData } from '../../models/obd2';
import type { TripStartConfig } from '../../models/trip';

export class RealBleService implements IBleService {
  scanForDevices(): Promise<BleDevice[]> { throw new Error('Not implemented'); }
  connect(_id: string): Promise<void> { throw new Error('Not implemented'); }
  disconnect(): Promise<void> { throw new Error('Not implemented'); }
  getConnectionStatus(): ConnectionStatus { return 'disconnected'; }
  onConnectionStatusChange(_cb: (s: ConnectionStatus) => void): () => void { return () => {}; }
  sendStartCommand(_cfg: TripStartConfig): Promise<{ ack: boolean }> { throw new Error('Not implemented'); }
  sendStopCommand(): Promise<{ ack: boolean }> { throw new Error('Not implemented'); }
  requestObd2Data(): Promise<Obd2TripData> { throw new Error('Not implemented'); }
  onObd2TransferProgress(_cb: (p: number) => void): () => void { return () => {}; }
  getDeviceInfo(): Promise<DeviceInfo> { throw new Error('Not implemented'); }
  sendWifiCredentials(_ssid: string, _pw: string): Promise<boolean> { throw new Error('Not implemented'); }
  updateOdometer(_odo: number): Promise<boolean> { throw new Error('Not implemented'); }
}
