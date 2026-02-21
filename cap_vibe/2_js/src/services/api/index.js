import { USE_MOCK } from '../../config.js';
import { MockApiService } from './api.mock.js';
import { RealApiService } from './api.real.js';

export const apiService = USE_MOCK ? new MockApiService() : new RealApiService();
