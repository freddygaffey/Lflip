import { USE_MOCK_BLE } from '../../config.js';
import { MockBleService } from './ble.mock.js';
import { RealBleService } from './ble.real.js';

export const bleService = USE_MOCK_BLE ? new MockBleService() : new RealBleService();
