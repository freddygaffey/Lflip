/**
 * BLE Service Interface (implement in ble.mock.js and ble.real.js)
 *
 * Connection:
 *   scanForDevices() → Promise<BleDevice[]>
 *   connect(deviceId) → Promise<void>
 *   disconnect() → Promise<void>
 *   getConnectionStatus() → ConnectionStatus
 *   onConnectionStatusChange(callback) → () => void
 *
 * Trip control (commands sent TO ESP32):
 *   sendStartCommand({ tripId, startTime }) → Promise<{ ack: boolean }>
 *   sendStopCommand() → Promise<{ ack: boolean }>
 *
 * Odometer transfer (received FROM ESP32):
 *   requestOdometerData() → Promise<{ startOdo: number; endOdo: number }> (at trip end)
 *   getCurrentOdometer() → Promise<number> (current OBD2 odometer reading, km)
 *
 * Device management:
 *   getDeviceInfo() → Promise<DeviceInfo>
 *   updateOdometer(odo) → Promise<boolean>
 */
