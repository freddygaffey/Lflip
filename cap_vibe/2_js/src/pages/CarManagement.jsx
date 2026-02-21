import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBle } from '../context/BleContext.jsx';
import { useCars } from '../hooks/useCars.js';
import { bleService } from '../services/ble/index.js';
import { ConnectionBadge } from '../components/ConnectionBadge.jsx';
import { SupervisorPicker } from '../components/SupervisorPicker.jsx';

export function CarManagement() {
  const navigate = useNavigate();
  const { status, devices, connectedDeviceId, scan, connect, disconnect, isConnected } = useBle();
  const { cars, addCar, deleteCar, updateCar, refresh } = useCars();
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [loadingOdo, setLoadingOdo] = useState(false);
  const [addingCar, setAddingCar] = useState(false);
  const [numberPlate, setNumberPlate] = useState('');
  const [carName, setCarName] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [addError, setAddError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [carToRemove, setCarToRemove] = useState(null);
  const [editingDefaultSdFor, setEditingDefaultSdFor] = useState(null);

  const handleSetDefaultSd = async (carId, supervisorId, supervisorName) => {
    try {
      await updateCar(carId, { defaultSupervisorId: supervisorId || null, defaultSupervisorName: supervisorName || null });
      setEditingDefaultSdFor(null);
    } catch (err) {
      setAddError(err?.message ?? 'Failed to set default SD');
    }
  };

  const handleRemoveCar = async (car) => {
    setCarToRemove(car);
  };

  const confirmRemoveCar = async () => {
    if (!carToRemove) return;
    setDeletingId(carToRemove.id);
    const car = carToRemove;
    setCarToRemove(null);
    try {
      await deleteCar(car.id);
      if (car.esp32DeviceId === connectedDeviceId) {
        await disconnect();
      }
    } catch (err) {
      setAddError(err?.message ?? 'Failed to remove car');
    } finally {
      setDeletingId(null);
    }
  };

  const connectedCar = cars.find((c) => c.esp32DeviceId === connectedDeviceId);

  const loadOdoFromEsp = async () => {
    if (!isConnected) return;
    setLoadingOdo(true);
    setAddError(null);
    try {
      const odo = await bleService.getCurrentOdometer?.();
      if (odo != null && connectedCar?.id) {
        await updateCar(connectedCar.id, { lastOdometer: odo });
        refresh();
      }
    } catch (err) {
      setAddError(err?.message ?? 'Failed to get odometer');
    } finally {
      setLoadingOdo(false);
    }
  };

  const loadDeviceInfo = async () => {
    if (!isConnected) return;
    setLoadingInfo(true);
    try {
      const info = await bleService.getDeviceInfo();
      setDeviceInfo(info);
    } catch {
      setDeviceInfo(null);
    } finally {
      setLoadingInfo(false);
    }
  };

  const startAddCar = (device) => {
    setSelectedDevice(device);
    setNumberPlate('');
    setCarName('');
    setAddError(null);
    setAddingCar(true);
  };

  const cancelAddCar = () => {
    setAddingCar(false);
    setSelectedDevice(null);
    setNumberPlate('');
    setCarName('');
    setAddError(null);
  };

  const handleAddCar = async () => {
    const plate = numberPlate?.trim().toUpperCase();
    if (!plate) {
      setAddError('Please enter the number plate');
      return;
    }
    if (!selectedDevice) return;
    const name = carName?.trim() || plate;
    setAddError(null);
    try {
      await connect(selectedDevice.id);
      await addCar({
        numberPlate: plate,
        name,
        esp32DeviceId: selectedDevice.id,
      });
      cancelAddCar();
      refresh();
    } catch (err) {
      setAddError(err?.message ?? 'Failed to add car');
    }
  };

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-400 text-xl p-1">←</button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Cars</h1>
        <ConnectionBadge status={status} />
      </div>

      {/* Your cars */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="text-slate-700 dark:text-slate-300 font-semibold">Your Cars</div>
        {cars.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400 text-sm">No cars added yet. Add a car by connecting to its ESP32 below.</p>
        ) : (
          <div className="space-y-2">
            {cars.map((car) => (
              <div
                key={car.id}
                className={`bg-slate-200 dark:bg-slate-700 rounded-xl p-3 ${
                  car.esp32DeviceId === connectedDeviceId ? 'border border-green-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{car.name ?? car.numberPlate}</div>
                    <div className="text-slate-600 dark:text-slate-400 text-xs">
                      {car.name && car.numberPlate && car.name !== car.numberPlate ? `${car.numberPlate} · ` : ''}
                      {car.esp32DeviceId === connectedDeviceId ? '● Connected' : 'Not connected'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveCar(car)}
                    disabled={deletingId === car.id}
                    className="text-red-500 dark:text-red-400 text-sm py-1 px-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg disabled:opacity-50"
                  >
                    {deletingId === car.id ? '…' : 'Remove'}
                  </button>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-300 dark:border-slate-600">
                  {editingDefaultSdFor === car.id ? (
                    <div className="space-y-2">
                      <div className="text-slate-600 dark:text-slate-400 text-xs font-medium">Default supervisor</div>
                      <SupervisorPicker
                        value={car.defaultSupervisorId}
                        onChange={(id, name) => handleSetDefaultSd(car.id, id, name)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSetDefaultSd(car.id, null, null)}
                          className="btn-ghost text-sm"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setEditingDefaultSdFor(null)}
                          className="btn-secondary text-sm"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingDefaultSdFor(car.id)}
                      className="text-slate-600 dark:text-slate-400 text-xs hover:text-primary-500"
                    >
                      Default SD: {car.defaultSupervisorName ?? 'None'} →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add car - scan and connect */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="text-slate-700 dark:text-slate-300 font-semibold">Add a Car</div>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Connect to the ESP32 in your car via Bluetooth. You will enter the number plate when adding.
        </p>
        <button onClick={scan} disabled={status === 'scanning'} className="btn-primary w-full">
          {status === 'scanning' ? 'Scanning…' : 'Scan for Cars'}
        </button>
      </div>

      {devices.length > 0 && !addingCar && (
        <div className="space-y-2">
          <div className="text-slate-700 dark:text-slate-300 font-semibold">Found ESP32s</div>
          {devices.map((d) => (
            <div
              key={d.id}
              className={`bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between ${
                connectedDeviceId === d.id ? 'border border-green-500' : ''
              }`}
            >
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{d.name}</div>
                <div className="text-slate-600 dark:text-slate-400 text-xs">{d.mac} · RSSI {d.rssi}</div>
              </div>
              {cars.some((c) => c.esp32DeviceId === d.id) ? (
                connectedDeviceId === d.id ? (
                  <button onClick={disconnect} className="btn-secondary text-sm py-2">Disconnect</button>
                ) : (
                  <button
                    onClick={() => connect(d.id)}
                    disabled={status === 'connecting'}
                    className="btn-primary text-sm py-2"
                  >
                    Connect
                  </button>
                )
              ) : connectedDeviceId === d.id ? (
                <button onClick={disconnect} className="btn-secondary text-sm py-2">
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => startAddCar(d)}
                  disabled={status === 'connecting'}
                  className="btn-primary text-sm py-2"
                >
                  Add Car
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add car modal / form - number plate */}
      {addingCar && selectedDevice && (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3 border-2 border-primary-500">
          <div className="text-slate-700 dark:text-slate-300 font-semibold">Add Car — Enter Number Plate</div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">ESP32: {selectedDevice.name}</p>
          <div>
            <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Number plate *</label>
            <input
              type="text"
              value={numberPlate}
              onChange={(e) => setNumberPlate(e.target.value.toUpperCase())}
              placeholder="e.g. ABC-123"
              className="input-field w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="text-slate-600 dark:text-slate-400 text-sm block mb-1.5">Name (optional)</label>
            <input
              type="text"
              value={carName}
              onChange={(e) => setCarName(e.target.value)}
              placeholder="e.g. Mum's car, The ute"
              className="input-field w-full"
            />
          </div>
          {addError && (
            <div className="text-red-500 dark:text-red-400 text-sm">{addError}</div>
          )}
          <div className="flex gap-3">
            <button onClick={cancelAddCar} className="btn-secondary flex-1">Cancel</button>
            <button
              onClick={handleAddCar}
              disabled={!numberPlate?.trim()}
              className="btn-primary flex-1"
            >
              Add Car
            </button>
          </div>
        </div>
      )}

      {isConnected && !addingCar && (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
          <div className="text-slate-700 dark:text-slate-300 font-semibold">Connected ESP32 Info</div>
          {connectedCar && (
            <button
              onClick={loadOdoFromEsp}
              disabled={loadingOdo}
              className="btn-secondary w-full"
            >
              {loadingOdo ? 'Getting…' : 'Get ODO from ESP32'}
            </button>
          )}
          <button
            onClick={loadDeviceInfo}
            disabled={loadingInfo}
            className="btn-secondary w-full"
          >
            {loadingInfo ? 'Loading…' : 'Get Info'}
          </button>
          {deviceInfo && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Firmware</span>
                <span className="text-slate-900 dark:text-white">{deviceInfo.firmwareVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">MAC</span>
                <span className="text-slate-900 dark:text-white font-mono text-xs">{deviceInfo.mac}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Battery</span>
                <span className="text-slate-900 dark:text-white">{deviceInfo.batteryPct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">OBD2</span>
                <span className={deviceInfo.obd2Connected ? 'text-green-400' : 'text-slate-600 dark:text-slate-400'}>
                  {deviceInfo.obd2Connected ? 'Connected' : 'Not connected'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Remove confirmation */}
      {carToRemove && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setCarToRemove(null)}>
          <div
            className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-5 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-slate-900 dark:text-white font-semibold mb-2">Remove car?</div>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
              Remove {carToRemove.name ?? carToRemove.numberPlate}? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCarToRemove(null)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={confirmRemoveCar} className="btn-primary flex-1 bg-red-600 hover:bg-red-500">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
