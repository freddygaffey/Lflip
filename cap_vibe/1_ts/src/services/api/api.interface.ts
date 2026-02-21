import type { Supervisor } from '../../models/supervisor';
import type {
  Trip,
  TripFilters,
  LogbookSummary,
  AuthToken,
} from '../../models/trip';

export interface IApiService {
  // Auth
  login(email: string, password: string): Promise<AuthToken>;
  register(email: string, password: string, name: string): Promise<AuthToken>;

  // Trips — matches Flask /api/trips endpoints
  syncTrip(trip: Trip): Promise<{ cloudId: string }>;
  getTrips(filters?: TripFilters): Promise<Trip[]>;
  getTrip(tripId: string): Promise<Trip>;
  deleteTrip(tripId: string): Promise<void>;

  // Supervisors — matches Flask /api/supervisors endpoints
  getSupervisors(): Promise<Supervisor[]>;
  addSupervisor(supervisor: Omit<Supervisor, 'id'>): Promise<Supervisor>;
  updateSupervisor(id: string, updates: Partial<Supervisor>): Promise<Supervisor>;
  deleteSupervisor(id: string): Promise<void>;

  // Stats
  getLogbookSummary(): Promise<LogbookSummary>;

  // Device
  registerDevice(mac: string): Promise<void>;
}
