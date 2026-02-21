import React, { useEffect } from 'react';
import { useSync } from '../hooks/useSync.js';
import { apiService } from '../services/api/index.js';

const SYNC_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * Runs sync in the background when online.
 * Syncs on mount, periodically, and when the app comes back online.
 */
export function AutoSync() {
  const { syncAll } = useSync();

  useEffect(() => {
    const runSync = async () => {
      if (!navigator.onLine) return;
      const list = await apiService.getTrips();
      const unsynced = list.filter((t) => t.syncStatus === 'unsynced');
      if (unsynced.length > 0) {
        await syncAll(unsynced);
      }
    };

    if (navigator.onLine) runSync();

    const intervalId = setInterval(runSync, SYNC_INTERVAL_MS);
    window.addEventListener('online', runSync);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('online', runSync);
    };
  }, [syncAll]);

  return null;
}
