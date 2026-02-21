import { API_BASE_URL } from '../../config.js';

/**
 * Real API Service — implement when Flask backend is ready.
 */
export class RealApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = null;
  }

  async _fetch(endpoint, options = {}) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  }

  async login(_email, _password) {
    throw new Error('Real API not implemented yet');
  }

  async register(_email, _password, _name, _licenceNumber, _role) {
    throw new Error('Real API not implemented yet');
  }

  async getCurrentUser() {
    return null;
  }

  async logout() {
    this.token = null;
  }

  async syncTrip(_trip) {
    throw new Error('Real API not implemented yet');
  }

  async getTrips(_filters) {
    throw new Error('Real API not implemented yet');
  }

  async getTrip(_tripId) {
    throw new Error('Real API not implemented yet');
  }

  async deleteTrip(_tripId) {
    throw new Error('Real API not implemented yet');
  }

  async approveTrip(_tripId, _approved) {
    throw new Error('Real API not implemented yet');
  }

  async getLinkedLearners() {
    return [];
  }

  async getSupervisors() {
    throw new Error('Real API not implemented yet');
  }

  async addSupervisor(_supervisor) {
    throw new Error('Real API not implemented yet');
  }

  async updateSupervisor(_id, _updates) {
    throw new Error('Real API not implemented yet');
  }

  async deleteSupervisor(_id) {
    throw new Error('Real API not implemented yet');
  }

  async getCars() {
    throw new Error('Real API not implemented yet');
  }

  async addCar(_car) {
    throw new Error('Real API not implemented yet');
  }

  async deleteCar(_id) {
    throw new Error('Real API not implemented yet');
  }

  async getLogbookSummary() {
    throw new Error('Real API not implemented yet');
  }

  async registerDevice(_mac) {
    throw new Error('Real API not implemented yet');
  }
}
