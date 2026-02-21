import { Preferences } from '@capacitor/preferences';
import { v4 as uuidv4 } from 'uuid';
import { createSeedTrips, createSeedSupervisors } from '../../utils/seedData.js';
import { DEFAULT_TARGET_HOURS, NIGHT_HOURS_REQUIRED } from '../../config.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => delay(200 + Math.random() * 300);

function maybeNetworkError() {
  if (Math.random() < 0.05) throw new Error('Network error (simulated)');
}

function randomAlphanumeric(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const KEYS = {
  trips: 'mock_trips',
  supervisors: 'mock_supervisors',
  cars: 'mock_cars',
  seeded: 'mock_seeded',
  authToken: 'mock_auth_token',
  currentUser: 'mock_current_user',
  userProfiles: 'mock_user_profiles',
  parentLinks: 'mock_parent_links',
  pairingTokens: 'mock_pairing_tokens',
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

async function saveTrips(trips) {
  const trimmed = trips.map(trimTripForStorage);
  await saveJson(KEYS.trips, trimmed);
}

/** Trim trip GPS/accel arrays for storage to avoid localStorage quota (demo / web). */
function trimTripForStorage(trip) {
  const max = 50;
  const sample = (arr, n) => {
    if (!arr || !arr.length || arr.length <= n) return arr ?? [];
    if (n <= 1) return arr.length ? [arr[0]] : [];
    const step = (arr.length - 1) / (n - 1);
    return Array.from({ length: n }, (_, i) => arr[Math.round(Math.min(i * step, arr.length - 1))]);
  };
  return {
    ...trip,
    gpsPoints: sample(trip?.gpsPoints, max),
    accelPoints: sample(trip?.accelPoints, max),
  };
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
      this.cars = [];
      await saveTrips(this.trips);
      await saveJson(KEYS.supervisors, this.supervisors);
      await saveJson(KEYS.cars, this.cars);
      await saveJson(KEYS.seeded, true);
    } else {
      this.trips = (await loadJson(KEYS.trips)) ?? [];
      this.supervisors = (await loadJson(KEYS.supervisors)) ?? [];
      this.cars = (await loadJson(KEYS.cars)) ?? [];
      // Migration: assign learnerId to existing trips that lack it (for parent multi-kid progress)
      const defaultLearner = { id: 'learner-demo-001', name: 'Alex' };
      let needsSave = false;
      this.trips = this.trips.map((t) => {
        if (t.learnerId) return t;
        needsSave = true;
        return { ...t, learnerId: defaultLearner.id, learnerName: defaultLearner.name };
      });
      if (needsSave) await saveTrips(this.trips);
    }
    this.authToken = (await loadJson(KEYS.authToken)) ?? null;
  }

  async login(email, _password) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const token = `mock-jwt-${uuidv4()}`;
    this.authToken = token;
    let name = email.split('@')[0].replace(/[._]/g, ' ');
    if (email.toLowerCase() === 'parent@demo.com') name = 'Mum';
    if (email.toLowerCase() === 'learner@demo.com') name = 'Alex';
    const role = email.toLowerCase().includes('parent') ? 'parent' : 'learner';
    const userId = email.toLowerCase() === 'parent@demo.com' ? 'parent-demo-001'
      : email.toLowerCase() === 'learner@demo.com' ? 'learner-demo-001'
      : 'mock-user-001';
    const profiles = (await loadJson(KEYS.userProfiles)) ?? {};
    const profile = profiles[userId];
    const userName = profile?.name ?? name;
    const user = { userId, name: userName, role, licenceNumber: profile?.licenceNumber ?? null };
    profiles[userId] = { ...profiles[userId], name: userName, licenceNumber: user.licenceNumber };
    await saveJson(KEYS.userProfiles, profiles);
    await saveJson(KEYS.authToken, token);
    await saveJson(KEYS.currentUser, user);
    return { token, ...user };
  }

  async register(email, _password, name, licenceNumber, role) {
    await this._init();
    await randomDelay();
    maybeNetworkError();
    const token = `mock-jwt-${uuidv4()}`;
    this.authToken = token;
    if (!name) name = email.split('@')[0].replace(/[._]/g, ' ');
    const userRole = role === 'parent' || role === 'learner' ? role : 'learner';
    const userId = `mock-user-${uuidv4().slice(0, 8)}`;
    const user = { userId, name, role: userRole, licenceNumber: licenceNumber?.trim() || null };
    const profiles = (await loadJson(KEYS.userProfiles)) ?? {};
    profiles[userId] = { ...profiles[userId], name, licenceNumber: user.licenceNumber };
    await saveJson(KEYS.userProfiles, profiles);
    await saveJson(KEYS.authToken, token);
    await saveJson(KEYS.currentUser, user);
    return { token, ...user };
  }

  async getCurrentUser() {
    await this._init();
    const token = await loadJson(KEYS.authToken);
    if (!token) return null;
    let user = await loadJson(KEYS.currentUser);
    if (!user) return { userId: 'mock-user-001', name: 'User', role: 'learner', licenceNumber: null };
    const profiles = (await loadJson(KEYS.userProfiles)) ?? {};
    const profile = profiles[user.userId];
    return { ...user, licenceNumber: profile?.licenceNumber ?? user.licenceNumber ?? null };
  }

  async logout() {
    await Preferences.remove({ key: KEYS.authToken });
    await Preferences.remove({ key: KEYS.currentUser });
    this.authToken = null;
  }

  async syncTrip(trip) {
    await this._init();
    await randomDelay();
    maybeNetworkError();

    const user = await this.getCurrentUser();
    let enriched = { ...trip };
    if (user?.role === 'learner' && !enriched.learnerId) {
      enriched.learnerId = user.userId;
      enriched.learnerName = user.name;
    }
    const idx = this.trips.findIndex((t) => t.id === trip.id);
    const updated = { ...enriched, syncStatus: 'synced', cloudId: `cloud-${trip.id}` };
    if (idx >= 0) this.trips[idx] = updated;
    else this.trips.push(updated);
    await saveTrips(this.trips);
    return { cloudId: updated.cloudId };
  }

  async getTrips(filters) {
    await this._init();
    await randomDelay();
    maybeNetworkError();

    const user = await this.getCurrentUser();
    let result = [...this.trips].filter((t) => t.status === 'complete');

    if (user?.role === 'parent') {
      const links = (await loadJson(KEYS.parentLinks)) ?? [];
      const learnerIds = links.filter((l) => l.parentId === user.userId).map((l) => l.learnerId);
      if (learnerIds.length > 0) {
        result = result.filter((t) => t.learnerId && learnerIds.includes(t.learnerId));
      } else {
        result = [];
      }
    } else if (user?.role === 'learner') {
      result = result.filter((t) => !t.learnerId || t.learnerId === user.userId);
    }

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
    await saveTrips(this.trips);
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
    await saveTrips(this.trips);
    return { success: true };
  }

  async createPairingToken() {
    await this._init();
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not logged in');
    if (user.role !== 'learner') throw new Error('Only learners can create pairing tokens');
    await randomDelay();
    maybeNetworkError();
    const token = `PAIR-${randomAlphanumeric(8)}`;
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const tokens = (await loadJson(KEYS.pairingTokens)) ?? {};
    tokens[token] = { learnerId: user.userId, expiresAt };
    await saveJson(KEYS.pairingTokens, tokens);
    return { token, expiresAt };
  }

  async completePairing(token) {
    await this._init();
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Not logged in');
    if (user.role !== 'parent') throw new Error('Only parents can complete pairing');
    await randomDelay();
    maybeNetworkError();
    const tokens = (await loadJson(KEYS.pairingTokens)) ?? {};
    const entry = tokens[token];
    if (!entry || entry.expiresAt < Date.now()) {
      throw new Error('Invalid or expired pairing code');
    }
    const { learnerId } = entry;
    const links = (await loadJson(KEYS.parentLinks)) ?? [];
    if (!links.some((l) => l.parentId === user.userId && l.learnerId === learnerId)) {
      links.push({ parentId: user.userId, learnerId });
      await saveJson(KEYS.parentLinks, links);
    }
    delete tokens[token];
    await saveJson(KEYS.pairingTokens, tokens);
    const profiles = (await loadJson(KEYS.userProfiles)) ?? {};
    const learnerName = profiles[learnerId]?.name ?? 'Learner';
    return { success: true, learnerName };
  }

  async getLinkedLearners() {
    await this._init();
    const user = await this.getCurrentUser();
    if (!user || user.role !== 'parent') return [];
    await randomDelay();
    maybeNetworkError();
    const links = (await loadJson(KEYS.parentLinks)) ?? [];
    const profiles = (await loadJson(KEYS.userProfiles)) ?? {};
    const learnerIds = links.filter((l) => l.parentId === user.userId).map((l) => l.learnerId);
    return learnerIds.map((id) => ({
      id,
      name: profiles[id]?.name ?? id.replace(/^.*-/, 'User '),
    }));
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
    const user = await this.getCurrentUser();
    let enriched = { ...trip };
    if (user?.role === 'learner' && !enriched.learnerId) {
      enriched.learnerId = user.userId;
      enriched.learnerName = user.name;
    }
    const idx = this.trips.findIndex((t) => t.id === trip.id);
    if (idx >= 0) this.trips[idx] = enriched;
    else this.trips.push(enriched);
    await saveTrips(this.trips);
  }
}
