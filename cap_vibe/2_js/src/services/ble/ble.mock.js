const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export class MockBleService {
  constructor() {
    this.status = 'disconnected';
    this.statusListeners = [];
    this.activeTripStartTime = null;
    this.activeTripStartOdo = null;
    this.mockCurrentOdo = 43500;
  }

  _setStatus(s) {
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s));
  }

  async scanForDevices() {
    this._setStatus('scanning');
    await delay(2000);
    this._setStatus('disconnected');
    return [
      { id: 'mock-esp32-001', name: 'LPlate-ESP32-001', rssi: -58, mac: 'AA:BB:CC:DD:EE:01' },
      { id: 'mock-esp32-002', name: 'LPlate-ESP32-002', rssi: -73, mac: 'AA:BB:CC:DD:EE:02' },
    ];
  }

  async connect(deviceId) {
    this._setStatus('connecting');
    await delay(1500);
    if (!deviceId.startsWith('mock')) throw new Error('Unknown device');
    this._setStatus('connected');
  }

  async disconnect() {
    await delay(300);
    this._setStatus('disconnected');
  }

  getConnectionStatus() {
    return this.status;
  }

  onConnectionStatusChange(callback) {
    this.statusListeners.push(callback);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  async sendStartCommand(config) {
    if (this.status !== 'connected') throw new Error('BLE not connected');
    this.activeTripStartTime = config.startTime;
    this.activeTripStartOdo = config.startOdometer ?? this.activeTripStartOdo ?? 43200;
    await delay(500);
    return { ack: true };
  }

  async sendStopCommand() {
    if (this.status !== 'connected') throw new Error('BLE not connected');
    await delay(500);
    return { ack: true };
  }

  /** Get current odometer reading from ESP32 (OBD2) */
  async getCurrentOdometer() {
    if (this.status !== 'connected') throw new Error('BLE not connected');
    await delay(600);
    const startOdo = this.activeTripStartOdo ?? this.mockCurrentOdo;
    // During active trip, simulate odometer increasing with elapsed time
    if (this.activeTripStartTime) {
      const durationMin = (Date.now() - this.activeTripStartTime) / 60000;
      const distanceKm = Math.max((durationMin / 60) * 48, 0.1); // ~48 km/h, min 0.1 km
      const endOdo = startOdo + distanceKm;
      return Math.round(endOdo);
    }
    return Math.round(startOdo);
  }

  /** Odometer only — ESP32 provides { startOdo, endOdo } at trip end */
  async requestOdometerData() {
    await delay(1500); // Short transfer
    const startOdo = this.activeTripStartOdo ?? 43200;
    const durationMin = this.activeTripStartTime
      ? (Date.now() - this.activeTripStartTime) / 60000
      : 15;
    const distanceKm = (durationMin / 60) * 48;
    const endOdo = Math.round(startOdo + distanceKm);
    this.mockCurrentOdo = endOdo;
    this.activeTripStartTime = null;
    this.activeTripStartOdo = null;
    return { startOdo, endOdo };
  }

  async getDeviceInfo() {
    await delay(400);
    return {
      firmwareVersion: '1.2.3',
      mac: 'AA:BB:CC:DD:EE:01',
      batteryPct: 82,
      sdCardPresent: true,
      sdCardFreeBytes: 1_073_741_824,
      obd2Connected: true,
      obd2Protocol: 'ISO 15765-4 (CAN)',
    };
  }

  async updateOdometer(_odo) {
    await delay(300);
    return true;
  }
}
