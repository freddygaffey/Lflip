import { Preferences } from '@capacitor/preferences';
import { API_BASE_URL } from '../../config.js';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export class RealApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = null;
    this._ready = this._loadToken();
  }

  async _loadToken() {
    const { value } = await Preferences.get({ key: TOKEN_KEY });
    this.token = value || null;
  }

  async _fetch(endpoint, options = {}) {
    await this._ready;
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `API error: ${res.status}`);
    }
    return res.json();
  }

  // ── Auth ──────────────────────────────────────────────────────────────

  async login(email, password) {
    const data = await this._fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.token = data.token;
    await Preferences.set({ key: TOKEN_KEY, value: data.token });
    await Preferences.set({ key: USER_KEY, value: JSON.stringify(data) });
    return data;
  }

  async register(email, password, name, licenceNumber, role, state) {
    const data = await this._fetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, licenceNumber, role, state }),
    });
    this.token = data.token;
    await Preferences.set({ key: TOKEN_KEY, value: data.token });
    await Preferences.set({ key: USER_KEY, value: JSON.stringify(data) });
    return data;
  }

  async getCurrentUser() {
    await this._ready;
    if (!this.token) return null;
    try {
      const data = await this._fetch('/api/auth/me');
      await Preferences.set({ key: USER_KEY, value: JSON.stringify(data) });
      return data;
    } catch {
      this.token = null;
      await Preferences.remove({ key: TOKEN_KEY });
      await Preferences.remove({ key: USER_KEY });
      return null;
    }
  }

  async logout() {
    this.token = null;
    await Preferences.remove({ key: TOKEN_KEY });
    await Preferences.remove({ key: USER_KEY });
  }

  async updateEmail(newEmail, password) {
    return this._fetch('/api/auth/update-email', {
      method: 'PATCH',
      body: JSON.stringify({ newEmail, password }),
    });
  }

  async updatePassword(currentPassword, newPassword) {
    return this._fetch('/api/auth/update-password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async updateState(state) {
    const data = await this._fetch('/api/auth/update-state', {
      method: 'PATCH',
      body: JSON.stringify({ state }),
    });
    const { value } = await Preferences.get({ key: USER_KEY });
    if (value) {
      const user = JSON.parse(value);
      user.state = state;
      await Preferences.set({ key: USER_KEY, value: JSON.stringify(user) });
    }
    return data;
  }

  // ── Trips ─────────────────────────────────────────────────────────────

  async syncTrip(trip) {
    return this._fetch('/api/trips', {
      method: 'POST',
      body: JSON.stringify(trip),
    });
  }

  async saveLocalTrip(trip) {
    return this.syncTrip(trip);
  }

  async getTrips(filters = {}) {
    const params = new URLSearchParams();
    if (filters.supervisorId) params.set('supervisorId', filters.supervisorId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    if (filters.nightOnly) params.set('nightOnly', '1');
    if (filters.dayOnly) params.set('dayOnly', '1');
    const qs = params.toString();
    return this._fetch(`/api/trips${qs ? `?${qs}` : ''}`);
  }

  async getTrip(tripId) {
    return this._fetch(`/api/trips/${tripId}`);
  }

  async deleteTrip(tripId) {
    return this._fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
  }

  async approveTrip(tripId, approved) {
    return this._fetch(`/api/trips/${tripId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ approved }),
    });
  }

  // ── Pairing ───────────────────────────────────────────────────────────

  async createPairingToken() {
    return this._fetch('/api/pair/create', { method: 'POST' });
  }

  async completePairing(token) {
    return this._fetch('/api/pair/complete', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getLinkedLearners() {
    try {
      return await this._fetch('/api/pair/linked');
    } catch {
      return [];
    }
  }

  // ── Supervisors ───────────────────────────────────────────────────────

  async getSupervisors() {
    return this._fetch('/api/supervisors');
  }

  async addSupervisor(supervisor) {
    return this._fetch('/api/supervisors', {
      method: 'POST',
      body: JSON.stringify(supervisor),
    });
  }

  async updateSupervisor(id, updates) {
    return this._fetch(`/api/supervisors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteSupervisor(id) {
    return this._fetch(`/api/supervisors/${id}`, { method: 'DELETE' });
  }

  // ── Cars ──────────────────────────────────────────────────────────────

  async getCars() {
    return this._fetch('/api/cars');
  }

  async addCar(car) {
    return this._fetch('/api/cars', {
      method: 'POST',
      body: JSON.stringify(car),
    });
  }

  async updateCar(id, updates) {
    return this._fetch(`/api/cars/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteCar(id) {
    return this._fetch(`/api/cars/${id}`, { method: 'DELETE' });
  }

  // ── Stats ─────────────────────────────────────────────────────────────

  async getLogbookSummary() {
    return this._fetch('/api/logbook/summary');
  }

  // ── Device ────────────────────────────────────────────────────────────

  async registerDevice(mac) {
    return this._fetch('/api/devices/register', {
      method: 'POST',
      body: JSON.stringify({ mac }),
    });
  }
}
