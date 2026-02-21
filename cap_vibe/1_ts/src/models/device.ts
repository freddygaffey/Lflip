export type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected';

export interface BleDevice {
  id: string;
  name: string;
  rssi: number;
  mac: string;
}

export interface DeviceInfo {
  firmwareVersion: string;
  mac: string;
  batteryPct: number;
  sdCardPresent: boolean;
  sdCardFreeBytes: number;
  wifiConfigured: boolean;
  wifiSsid?: string;
  obd2Connected: boolean;
  obd2Protocol?: string;
}
