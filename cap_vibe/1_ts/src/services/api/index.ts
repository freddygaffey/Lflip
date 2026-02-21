import { USE_MOCK, API_BASE_URL } from '../../config';
import { MockApiService } from './api.mock';
import { RealApiService } from './api.real';
import type { IApiService } from './api.interface';

export const apiService: IApiService = USE_MOCK
  ? new MockApiService()
  : new RealApiService(API_BASE_URL);

// Also export the concrete mock for direct access to local-only methods
export const mockApi = apiService as MockApiService;

export type { IApiService };
