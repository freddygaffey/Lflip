import React, { useState, useEffect } from 'react';
import { useBle } from '../context/BleContext';
import { bleService } from '../services/ble';
import { ConnectionBadge } from '../components/ConnectionBadge';
import type { DeviceInfo } from '../models/device';

export function DeviceManagement() {
  const { status, devices, connectedDeviceId, scan, connect, disconnect, isConnected } = useBle();
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [wifiSending, setWifiSending] = useState(false);
  const [wifiMsg, setWifiMsg] = useState<string | null>(null);

  const loadDeviceInfo = async () => {
    setLoadingInfo(true);
    try {
      const info = await bleService.getDeviceInfo();
      setDeviceInfo(info);
    } catch { /* ignore */ }
    setLoadingInfo(false);
  };

  useEffect(() => {
    if (isConnected) loadDeviceInfo();
    else setDeviceInfo(null);
  }, [isConnected]);

  const sendWifi = async () => {
    if (!ssid) return;
    setWifiSending(true);
    const ok = await bleService.sendWifiCredentials(ssid, password);
    setWifiSending(false);
    setWifiMsg(ok ? '✓ WiFi credentials sent!' : '✗ Failed to send credentials');
    setTimeout(() => setWifiMsg(null), 3000);
  };

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Device</h1>
        <ConnectionBadge status={status} />
      </div>

      {/* Scan & Connect */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="text-slate-300 font-semibold text-sm">ESP32 OBD2 Logger</div>
        {!isConnected && (
          <button
            onClick={scan}
            disabled={status === 'scanning' || status === 'connecting'}
            className="btn-primary w-full disabled:opacity-50"
          >
            {status === 'scanning' ? '🔍 Scanning…' : '🔍 Scan for Devices'}
          </button>
        )}
        {isConnected && (
          <button onClick={disconnect} className="btn-danger w-full">
            Disconnect
          </button>
        )}

        {/* Device list */}
        {devices.length > 0 && !isConnected && (
          <div className="space-y-2 mt-1">
            {devices.map((d) => (
              <button
                key={d.id}
                onClick={() => connect(d.id)}
                disabled={status === 'connecting'}
                className="w-full text-left bg-slate-700 hover:bg-slate-600 rounded-xl px-4 py-3 disabled:opacity-50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white font-medium">{d.name}</div>
                    <div className="text-slate-400 text-xs font-mono">{d.mac}</div>
                  </div>
                  <div className="text-slate-400 text-sm">{d.rssi} dBm</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Device info */}
      {isConnected && (
        <>
          <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-300 font-semibold text-sm">Device Info</div>
              <button onClick={loadDeviceInfo} className="text-slate-400 text-sm">↻ Refresh</button>
            </div>
            {loadingInfo ? (
              <div className="text-slate-400 text-sm text-center py-2">Loading…</div>
            ) : deviceInfo ? (
              <>
                {[
                  { label: 'Firmware', value: deviceInfo.firmwareVersion },
                  { label: 'MAC', value: deviceInfo.mac },
                  { label: 'Battery', value: `${deviceInfo.batteryPct}%` },
                  { label: 'SD Card', value: deviceInfo.sdCardPresent ? `✓ ${(deviceInfo.sdCardFreeBytes / 1e9).toFixed(1)} GB free` : '✗ Not present' },
                  { label: 'WiFi', value: deviceInfo.wifiConfigured ? (deviceInfo.wifiSsid ?? 'Configured') : 'Not configured' },
                  { label: 'OBD2 Port', value: deviceInfo.obd2Connected ? `✓ ${deviceInfo.obd2Protocol ?? 'Connected'}` : '✗ Not connected' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-slate-400">{label}</span>
                    <span className={`text-white font-mono text-xs ${value.startsWith('✓') ? 'text-green-400' : value.startsWith('✗') ? 'text-red-400' : ''}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-slate-400 text-sm">No info available</div>
            )}
          </div>

          {/* WiFi config */}
          <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
            <div className="text-slate-300 font-semibold text-sm">Send WiFi Credentials</div>
            <p className="text-slate-400 text-xs">The ESP32 uses WiFi to sync OBD2 data to the server.</p>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Network Name (SSID)</label>
              <input
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                className="input-field"
                placeholder="Your WiFi name"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs block mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="WiFi password"
              />
            </div>
            {wifiMsg && (
              <div className={`text-sm text-center ${wifiMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {wifiMsg}
              </div>
            )}
            <button
              onClick={sendWifi}
              disabled={!ssid || wifiSending}
              className="btn-secondary w-full disabled:opacity-50"
            >
              {wifiSending ? 'Sending…' : '📡 Send to ESP32'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
