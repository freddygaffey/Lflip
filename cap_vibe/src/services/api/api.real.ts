// TODO: implement using fetch() when Flask backend is ready.
// Switch by setting USE_MOCK=false and API_BASE_URL in config.ts.
import type { IApiService } from './api.interface';
import type { Supervisor } from '../../models/supervisor';
import type { Trip, TripFilters, LogbookSummary, AuthToken } from '../../models/trip';

export class RealApiService implements IApiService {
  private token: string | null = null;

  constructor(private baseUrl: string) {}

  private async request<T>(path: string, opts: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(opts.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async login(email: string, password: string): Promise<AuthToken> {
    const data = await this.request<AuthToken>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = data.token;
    return data;
  }

  async register(email: string, password: string, name: string): Promise<AuthToken> {
    const data = await this.request<AuthToken>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    this.token = data.token;
    return data;
  }

  async syncTrip(trip: Trip): Promise<{ cloudId: string }> {
    return this.request('/api/trips', { method: 'POST', body: JSON.stringify(trip) });
  }

  async getTrips(filters?: TripFilters): Promise<Trip[]> {
    const params = new URLSearchParams();
    if (filters?.supervisorId) params.set('supervisor_id', filters.supervisorId);
    if (filters?.dateFrom) params.set('date_from', String(filters.dateFrom));
    if (filters?.dateTo) params.set('date_to', String(filters.dateTo));
    return this.request(`/api/trips?${params.toString()}`);
  }

  async getTrip(tripId: string): Promise<Trip> {
    return this.request(`/api/trips/${tripId}`);
  }

  async deleteTrip(tripId: string): Promise<void> {
    await this.request(`/api/trips/${tripId}`, { method: 'DELETE' });
  }

  async getSupervisors(): Promise<Supervisor[]> {
    return this.request('/api/supervisors');
  }

  async addSupervisor(supervisor: Omit<Supervisor, 'id'>): Promise<Supervisor> {
    return this.request('/api/supervisors', { method: 'POST', body: JSON.stringify(supervisor) });
  }

  async updateSupervisor(id: string, updates: Partial<Supervisor>): Promise<Supervisor> {
    return this.request(`/api/supervisors/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
  }

  async deleteSupervisor(id: string): Promise<void> {
    await this.request(`/api/supervisors/${id}`, { method: 'DELETE' });
  }

  async getLogbookSummary(): Promise<LogbookSummary> {
    return this.request('/api/logbook/summary');
  }

  async registerDevice(mac: string): Promise<void> {
    await this.request('/api/devices/register', { method: 'POST', body: JSON.stringify({ mac }) });
  }
}
