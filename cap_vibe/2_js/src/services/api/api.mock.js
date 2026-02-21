import { Preferences } from '@capacitor/preferences';
import { v4 as uuidv4 } from 'uuid';
import { createSeedTrips, createSeedSupervisors } from '../../utils/seedData.js';
import { DEFAULT_TARGET_HOURS, NIGHT_HOURS_REQUIRED } from '../../config.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => delay(200 + Math.random() * 300);

function maybeNetworkError() {
  if (Math.random() < 0.05) throw new Error('Network error (simulated)');
}

const KEYS = {
  trips: 'mock_trips',
  supervisors: 'mock_supervisors',
  cars: 'mock_cars',
  seeded: 'mock_seeded',
  authToken: 'mock_auth_token',
};

async function loadJson(key) {
  const { value } = await Preferences.get({ key });
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function saveJson(key, value) {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export class MockApiService {
  constructor() {
    this.trips = [];
    this.supervisors = [];
    this.cars = [];
    this.authToken = null;
    this.initialized = false;
  }

  async _init() {
    if (this.initialized) return;
    this.initialized = true;

    const seeded = await loadJson(KEYS.seeded);
    if (!seeded) {
      this.trips = createSeedTrips();
      this.supervisors = createSeedSupervisors();
      this.cars = [
        { id: 'car-001', name: 'ABC-123', numberPlate: 'ABC-123', lastOdometer: 43500 },
        { id: 'car-002', name: 'XYZ-789', numberPlate: 'XYZ-789', lastOdometer: 52100 },
      ];
      await saveJson(KEYS.trips, this.trips);
      await saveJson(KEYS.supervisors, this.supervisors);
      await saveJson(KEYS.cars, this.cars);
      await saveJson(KEYS.seeded, true);
    } else {
      this.trips = (await loadJson(KEYS.trips)) ?? [];
      this.supervisors = (await loadJson(KEYS.supervisors)) ?? [];
      this.cars = (await loadJson(KEYS.cars)) ?? [
      { id: 'car-001', name: 'ABC-123', numberPlate: 'ABC-123', lastOdometer: 43500 },
      { id: 'car-002', name: 'XYZ-789', numberPlate: 'XYZ-789', lastOdometer: 52100 },
    ];
    }
    this.authToken = (await loadJson(KEYS.authToken)) ?? null;
  }

  async login(email, _password) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const token = `mock-jwt-${uuidv4()}`;
    this.authToken = token;
    await saveJson(KEYS.authToken, token);
    const name = email.split('@')[0].replace(/[._]/g, ' ');
    return { token, userId: 'mock-user-001', name };
  }

  async register(_email, _password, name) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const token = `mock-jwt-${uuidv4()}`;
    this.authToken = token;
    await saveJson(KEYS.authToken, token);
    return { token, userId: 'mock-user-001', name };
  }

  async syncTrip(trip) {
    await this._init();
    await randomDelay();
    maybeNetworkError();

    const idx = this.trips.findIndex((t) => t.id === trip.id);
    const updated = { ...trip, syncStatus: 'synced', cloudId: `cloud-${trip.id}` };
    if (idx >= 0) this.trips[idx] = updated;
    else this.trips.push(updated);
    await saveJson(KEYS.trips, this.trips);
    return { cloudId: updated.cloudId };
  }

  async getTrips(filters) {
    await this._init();
    await randomDelay();
    maybeNetworkError();

    let result = [...this.trips].filter((t) => t.status === 'complete');
    result.sort((a, b) => b.startTime - a.startTime);

    if (filters?.supervisorId) result = result.filter((t) => t.supervisorId === filters.supervisorId);
    if (filters?.dateFrom) result = result.filter((t) => t.startTime >= filters.dateFrom);
    if (filters?.dateTo) result = result.filter((t) => t.startTime <= filters.dateTo);
    if (filters?.nightOnly) result = result.filter((t) => (t.nightMinutes ?? 0) > 0);
    if (filters?.dayOnly) result = result.filter((t) => (t.dayMinutes ?? 0) > 0);

    return result;
  }

  async getTrip(tripId) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const trip = this.trips.find((t) => t.id === tripId);
    if (!trip) throw new Error(`Trip ${tripId} not found`);
    return trip;
  }

  async deleteTrip(tripId) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    this.trips = this.trips.filter((t) => t.id !== tripId);
    await saveJson(KEYS.trips, this.trips);
  }

  async approveTrip(tripId, approved) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const idx = this.trips.findIndex((t) => t.id === tripId);
    if (idx < 0) throw new Error(`Trip ${tripId} not found`);
    this.trips[idx] = {
      ...this.trips[idx],
      approvalState: approved ? 'approved' : 'rejected',
      approvedBy: 'mock-parent',
      approvedAt: Date.now(),
    };
    await saveJson(KEYS.trips, this.trips);
    return { success: true };
  }

  async getSupervisors() {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    return [...this.supervisors];
  }

  async addSupervisor(supervisor) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const newSup = { ...supervisor, id: uuidv4() };
    this.supervisors.push(newSup);
    await saveJson(KEYS.supervisors, this.supervisors);
    return newSup;
  }

  async updateSupervisor(id, updates) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const idx = this.supervisors.findIndex((s) => s.id === id);
    if (idx < 0) throw new Error(`Supervisor ${id} not found`);
    this.supervisors[idx] = { ...this.supervisors[idx], ...updates };
    await saveJson(KEYS.supervisors, this.supervisors);
    return this.supervisors[idx];
  }

  async deleteSupervisor(id) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    this.supervisors = this.supervisors.filter((s) => s.id !== id);
    await saveJson(KEYS.supervisors, this.supervisors);
  }

  async getCars() {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    return [...this.cars];
  }

  async addCar(car) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const name = car.name ?? car.numberPlate ?? 'Car';
    const newCar = { ...car, id: uuidv4(), name, numberPlate: car.numberPlate ?? name };
    this.cars.push(newCar);
    await saveJson(KEYS.cars, this.cars);
    return newCar;
  }

  async updateCar(id, updates) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const idx = this.cars.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error(`Car ${id} not found`);
    this.cars[idx] = { ...this.cars[idx], ...updates };
    await saveJson(KEYS.cars, this.cars);
    return this.cars[idx];
  }

  async deleteCar(id) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const idx = this.cars.findIndex((c) => c.id === id);
    if (idx < 0) throw new Error(`Car ${id} not found`);
    this.cars.splice(idx, 1);
    await saveJson(KEYS.cars, this.cars);
  }

  async getLogbookSummary() {
    await this._init();
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

  async registerDevice(_mac) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
  }

  async saveLocalTrip(trip) {
    await this._init();
    const idx = this.trips.findIndex((t) => t.id === trip.id);
    if (idx >= 0) this.trips[idx] = trip;
    else this.trips.push(trip);
    await saveJson(KEYS.trips, this.trips);
  }
}
