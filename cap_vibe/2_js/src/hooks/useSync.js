import { useState, useCallback } from 'react';
import { apiService } from '../services/api/index.js';

export function useSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState(null);
  const [errors, setErrors] = useState([]);

  const syncTrip = useCallback(async (trip) => {
    try {
      await apiService.syncTrip(trip);
      return true;
    } catch (err) {
      setErrors((prev) => [...prev, err?.message ?? 'Sync failed']);
      return false;
    }
  }, []);

  const syncAll = useCallback(async (unsyncedTrips) => {
    if (syncing) return;
    setSyncing(true);
    setErrors([]);
    let successes = 0;

    for (const trip of unsyncedTrips) {
      const ok = await syncTrip(trip);
      if (ok) successes++;
    }

    setSyncing(false);
    if (successes > 0) setLastSyncAt(Date.now());
  }, [syncing, syncTrip]);

  return { syncing, lastSyncAt, errors, syncAll, syncTrip };
}
