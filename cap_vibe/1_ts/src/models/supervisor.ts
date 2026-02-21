export interface Supervisor {
  id: string;
  name: string;
  licenceNumber?: string;
  relationship: string; // 'Parent' | 'Instructor' | 'Friend' | 'Other'
  createdAt: number;    // unix ms
  totalHoursSupervised?: number; // derived
}
