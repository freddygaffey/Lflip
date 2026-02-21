import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { bleService } from '../services/ble/index.js';
import { Preferences } from '@capacitor/preferences';

const BLE_LAST_DEVICE = 'ble_last_connected_device';

const BleContext = createContext(null);

export function BleProvider({ children }) {
  const [status, setStatus] = useState(bleService.getConnectionStatus?.() ?? 'disconnected');
  const [devices, setDevices] = useState([]);
  const [connectedDeviceId, setConnectedDeviceId] = useState(null);
  const unsubRef = useRef(null);

  useEffect(() => {
    if (bleService.onConnectionStatusChange) {
      unsubRef.current = bleService.onConnectionStatusChange((s) => setStatus(s));
    }
    return () => {
      unsubRef.current?.();
    };
  }, []);

  // Auto-connect to last paired device when app opens
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { value } = await Preferences.get({ key: BLE_LAST_DEVICE });
        if (value && mounted) {
          const deviceId = value;
          try {
            await bleService.connect(deviceId);
            if (mounted) setConnectedDeviceId(deviceId);
          } catch {}
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

  const scan = async () => {
    const found = await bleService.scanForDevices();
    setDevices(found);
  };

  const connect = async (deviceId) => {
    await bleService.connect(deviceId);
    setConnectedDeviceId(deviceId);
    await Preferences.set({ key: BLE_LAST_DEVICE, value: deviceId });
  };

  const disconnect = async () => {
    await bleService.disconnect();
    setConnectedDeviceId(null);
    await Preferences.remove({ key: BLE_LAST_DEVICE });
  };

  return (
    <BleContext.Provider
      value={{
        status,
        devices,
        connectedDeviceId,
        scan,
        connect,
        disconnect,
        isConnected: status === 'connected',
      }}
    >
      {children}
    </BleContext.Provider>
  );
}

export function useBle() {
  const ctx = useContext(BleContext);
  if (!ctx) throw new Error('useBle must be used within BleProvider');
  return ctx;
}
