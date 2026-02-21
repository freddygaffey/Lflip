import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api/index.js';

export function useLogbook(filters) {
  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setError(err?.message ?? 'Failed to load logbook');
    } finally {
      setLoading(false);
    }
  }, [filters?.supervisorId, filters?.dateFrom, filters?.dateTo, filters?.nightOnly]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteTrip = async (tripId) => {
    await apiService.deleteTrip(tripId);
    await refresh();
  };

  return { trips, summary, loading, error, refresh, deleteTrip };
}
