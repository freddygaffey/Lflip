import { USE_MOCK } from '../../config';
import { MockBleService } from './ble.mock';
import { RealBleService } from './ble.real';
import type { IBleService } from './ble.interface';

export const bleService: IBleService = USE_MOCK
  ? new MockBleService()
  : new RealBleService();

export type { IBleService };
