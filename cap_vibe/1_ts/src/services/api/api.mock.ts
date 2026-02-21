import { Preferences } from '@capacitor/preferences';
import { v4 as uuidv4 } from 'uuid';
import type { IApiService } from './api.interface';
import type { Supervisor } from '../../models/supervisor';
import type { Trip, TripFilters, LogbookSummary, AuthToken } from '../../models/trip';
import { createSeedTrips, createSeedSupervisors } from '../../utils/seedData';
import { DEFAULT_TARGET_HOURS, NIGHT_HOURS_REQUIRED } from '../../config';

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const randomDelay = () => delay(200 + Math.random() * 300);

// 5% chance of simulated network error
function maybeNetworkError() {
  if (Math.random() < 0.05) throw new Error('Network error (simulated)');
}

const KEYS = {
  trips: 'mock_trips',
  supervisors: 'mock_supervisors',
  seeded: 'mock_seeded',
  authToken: 'mock_auth_token',
};

async function loadJson<T>(key: string): Promise<T | null> {
  const { value } = await Preferences.get({ key });
  if (!value) return null;
  try { return JSON.parse(value) as T; } catch { return null; }
}

async function saveJson(key: string, value: unknown): Promise<void> {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export class MockApiService implements IApiService {
  private trips: Trip[] = [];
  private supervisors: Supervisor[] = [];
  private authToken: string | null = null;
  private initialized = false;

  private async init() {
    if (this.initialized) return;
    this.initialized = true;

    const seeded = await loadJson<boolean>(KEYS.seeded);
    if (!seeded) {
      this.trips = createSeedTrips();
      this.supervisors = createSeedSupervisors();
      await saveJson(KEYS.trips, this.trips);
      await saveJson(KEYS.supervisors, this.supervisors);
      await saveJson(KEYS.seeded, true);
    } else {
      this.trips = (await loadJson<Trip[]>(KEYS.trips)) ?? [];
      this.supervisors = (await loadJson<Supervisor[]>(KEYS.supervisors)) ?? [];
    }
    this.authToken = (await loadJson<string>(KEYS.authToken)) ?? null;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async login(email: string, _password: string): Promise<AuthToken> {
    await this.init();
    await randomDelay();
    maybeNetworkError();
    const token = `mock-jwt-${uuidv4()}`;
    this.authToken = token;
    await saveJson(KEYS.authToken, token);
    const name = email.split('@')[0].replace(/[._]/g, ' ');
    return { token, userId: 'mock-user-001', name };
  }

  async register(email: string, _password: string, name: string): Promise<AuthToken> {
    await this.init();
    await randomDelay();
    maybeNetworkError();
    const token = `mock-jwt-${uuidv4()}`;
    this.authToken = token;
    await saveJson(KEYS.authToken, token);
    return { token, userId: 'mock-user-001', name };
  }

  // ─── Trips ─────────────────────────────────────────────────────────────────

  async syncTrip(trip: Trip): Promise<{ cloudId: string }> {
    await this.init();
    await randomDelay();
    maybeNetworkError();

    const idx = this.trips.findIndex((t) => t.id === trip.id);
    const updated = { ...trip, syncStatus: 'synced' as const, cloudId: `cloud-${trip.id}` };
    if (idx >= 0) this.trips[idx] = updated;
    else this.trips.push(updated);
    await saveJson(KEYS.trips, this.trips);
    return { cloudId: updated.cloudId! };
  }

  async getTrips(filters?: TripFilters): Promise<Trip[]> {
    await this.init();
    await randomDelay();
    maybeNetworkError();

    let result = [...this.trips].filter((t) => t.status === 'complete');
    result.sort((a, b) => b.startTime - a.startTime);

    if (filters?.supervisorId) result = result.filter((t) => t.supervisorId === filters.supervisorId);
    if (filters?.dateFrom) result = result.filter((t) => t.startTime >= filters.dateFrom!);
    if (filters?.dateTo) result = result.filter((t) => t.startTime <= filters.dateTo!);
    if (filters?.nightOnly) result = result.filter((t) => (t.nightMinutes ?? 0) > 0);
    if (filters?.dayOnly) result = result.filter((t) => (t.dayMinutes ?? 0) > 0);

    return result;
  }

  async getTrip(tripId: string): Promise<Trip> {
    await this.init();
    await randomDelay();
    maybeNetworkError();
    const trip = this.trips.find((t) => t.id === tripId);
    if (!trip) throw new Error(`Trip ${tripId} not found`);
    return trip;
  }

  async deleteTrip(tripId: string): Promise<void> {
    await this.init();
    await randomDelay();
    maybeNetworkError();
    this.trips = this.trips.filter((t) => t.id !== tripId);
    await saveJson(KEYS.trips, this.trips);
  }

  // ─── Supervisors ───────────────────────────────────────────────────────────

  async getSupervisors(): Promise<Supervisor[]> {
    await this.init();
    await randomDelay();
    maybeNetworkError();
    return [...this.supervisors];
  }

  async addSupervisor(supervisor: Omit<Supervisor, 'id'>): Promise<Supervisor> {
    await this.init();
    await randomDelay();
    maybeNetworkError();
    const newSup: Supervisor = { ...supervisor, id: uuidv4() };
    this.supervisors.push(newSup);
    await saveJson(KEYS.supervisors, this.supervisors);
    return newSup;
  }

  async updateSupervisor(id: string, updates: Partial<Supervisor>): Promise<Supervisor> {
    await this.init();
    await randomDelay();
    maybeNetworkError();
    const idx = this.supervisors.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error(`Supervisor ${id} not found`);
    this.supervisors[idx] = { ...this.supervisors[idx], ...updates };
    await saveJson(KEYS.supervisors, this.supervisors);
    return this.supervisors[idx];
  }

  async deleteSupervisor(id: string): Promise<void> {
    await this.init();
    await randomDelay();
    maybeNetworkError();
    this.supervisors = this.supervisors.filter((s) => s.id !== id);
    await saveJson(KEYS.supervisors, this.supervisors);
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getLogbookSummary(): Promise<LogbookSummary> {
    await this.init();
    await randomDelay();

    const completed = this.trips.filter((t) => t.status === 'complete');
    const totalMinutes = completed.reduce((acc, t) => acc + (t.dayMinutes ?? 0) + (t.nightMinutes ?? 0), 0);
    const dayMinutes = completed.reduce((acc, t) => acc + (t.dayMinutes ?? 0), 0);
    const nightMinutes = completed.reduce((acc, t) => acc + (t.nightMinutes ?? 0), 0);
    const sorted = [...completed].sort((a, b) => b.startTime - a.startTime);

    return {
      totalHours: totalMinutes / 60,
      dayHours: dayMinutes / 60,
      nightHours: nightMinutes / 60,
      tripCount: completed.length,
      targetHours: DEFAULT_TARGET_HOURS,
      nightTargetHours: NIGHT_HOURS_REQUIRED,
      lastTripDate: sorted[0]?.startTime,
    };
  }

  // ─── Device ────────────────────────────────────────────────────────────────

  async registerDevice(_mac: string): Promise<void> {
    await this.init();
    await randomDelay();
    maybeNetworkError();
  }

  // ─── Local helpers (not on interface) ─────────────────────────────────────

  async saveLocalTrip(trip: Trip): Promise<void> {
    await this.init();
    const idx = this.trips.findIndex((t) => t.id === trip.id);
    if (idx >= 0) this.trips[idx] = trip;
    else this.trips.push(trip);
    await saveJson(KEYS.trips, this.trips);
  }
}
