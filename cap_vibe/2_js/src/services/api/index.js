import { USE_MOCK_API } from '../../config.js';
import { MockApiService } from './api.mock.js';
import { RealApiService } from './api.real.js';

export const apiService = USE_MOCK_API ? new MockApiService() : new RealApiService();
