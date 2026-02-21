import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { bleService } from '../services/ble';
import type { ConnectionStatus, BleDevice } from '../models/device';

interface BleState {
  status: ConnectionStatus;
  devices: BleDevice[];
  connectedDeviceId: string | null;
  scan: () => Promise<void>;
  connect: (deviceId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
}

const BleContext = createContext<BleState | null>(null);

export function BleProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    unsubRef.current = bleService.onConnectionStatusChange((s) => setStatus(s));
    return () => { unsubRef.current?.(); };
  }, []);

  const scan = async () => {
    const found = await bleService.scanForDevices();
    setDevices(found);
  };

  const connect = async (deviceId: string) => {
    await bleService.connect(deviceId);
    setConnectedDeviceId(deviceId);
  };

  const disconnect = async () => {
    await bleService.disconnect();
    setConnectedDeviceId(null);
  };

  return (
    <BleContext.Provider value={{
      status,
      devices,
      connectedDeviceId,
      scan,
      connect,
      disconnect,
      isConnected: status === 'connected',
    }}>
      {children}
    </BleContext.Provider>
  );
}

export function useBle() {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error('useBle must be used within BleProvider');
  return ctx;
}
