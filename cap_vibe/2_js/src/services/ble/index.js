import { USE_MOCK } from '../../config.js';
import { MockBleService } from './ble.mock.js';
import { RealBleService } from './ble.real.js';

export const bleService = USE_MOCK ? new MockBleService() : new RealBleService();
