import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';
import type { Trip, LogbookSummary, TripFilters } from '../models/trip';

export function useLogbook(filters?: TripFilters) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [summary, setSummary] = useState<LogbookSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [fetchedTrips, fetchedSummary] = await Promise.all([
        apiService.getTrips(filters),
        apiService.getLogbookSummary(),
      ]);
      setTrips(fetchedTrips);
      setSummary(fetchedSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logbook');
    } finally {
      setLoading(false);
    }
  }, [filters?.supervisorId, filters?.dateFrom, filters?.dateTo]);

  useEffect(() => { refresh(); }, [refresh]);

  const deleteTrip = async (tripId: string) => {
    await apiService.deleteTrip(tripId);
    await refresh();
  };

  return { trips, summary, loading, error, refresh, deleteTrip };
}
