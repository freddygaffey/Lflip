/**
 * Real BLE Service — implement when @capacitor-community/bluetooth-le is ready.
 * Uses requestOdometerData() (odometer only), not full OBD2.
 */
export class RealBleService {
  async scanForDevices() {
    throw new Error('Real BLE not implemented yet');
  }

  async connect() {
    throw new Error('Real BLE not implemented yet');
  }

  async disconnect() {
    throw new Error('Real BLE not implemented yet');
  }

  getConnectionStatus() {
    return 'disconnected';
  }

  onConnectionStatusChange() {
    return () => {};
  }

  async sendStartCommand() {
    throw new Error('Real BLE not implemented yet');
  }

  async sendStopCommand() {
    throw new Error('Real BLE not implemented yet');
  }

  async requestOdometerData() {
    throw new Error('Real BLE not implemented yet');
  }

  async getCurrentOdometer() {
    throw new Error('Real BLE not implemented yet');
  }

  async getDeviceInfo() {
    throw new Error('Real BLE not implemented yet');
  }

  async updateOdometer() {
    throw new Error('Real BLE not implemented yet');
  }
}
