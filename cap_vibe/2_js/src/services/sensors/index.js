import { USE_MOCK } from '../../config.js';
import { mockSensorService } from './sensor.mock.js';
import { sensorService as realSensorService } from './sensor.real.js';

export const sensorService = USE_MOCK ? mockSensorService : realSensorService;
