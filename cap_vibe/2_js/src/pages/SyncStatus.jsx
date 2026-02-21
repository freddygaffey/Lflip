import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api/index.js';
import { useSync } from '../hooks/useSync.js';
import { formatDateTime } from '../utils/formatTime.js';

export function SyncStatus() {
  const navigate = useNavigate();
  const { syncing, lastSyncAt, errors, syncAll } = useSync();
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    apiService.getTrips().then((list) => {
      const unsynced = list.filter((t) => t.syncStatus === 'unsynced');
      setTrips(unsynced);
    });
  }, []);

  const unsyncedTrips = trips.filter((t) => t.syncStatus === 'unsynced');

  const handleSync = async () => {
    await syncAll(unsyncedTrips);
    const list = await apiService.getTrips();
    setTrips(list);
  };

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-400 text-xl p-1">←</button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sync Status</h1>
      </div>

      {unsyncedTrips.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4">
          <div className="text-amber-400 font-semibold mb-1">Not synced</div>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-3">
            {unsyncedTrips.length} trip(s) waiting to sync. Connect to mobile data or WiFi to sync.
          </p>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn-primary w-full"
          >
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      )}

      {unsyncedTrips.length === 0 && trips.length > 0 && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4">
          <div className="text-green-400 font-semibold">All synced</div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Your trips are up to date.</p>
        </div>
      )}

      {lastSyncAt && (
        <div className="text-slate-600 dark:text-slate-400 text-sm">
          Last sync: {formatDateTime(lastSyncAt)}
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 space-y-2">
          <div className="text-red-400 font-semibold">Errors</div>
          {errors.map((e, i) => (
            <div key={i} className="text-red-300 text-sm">{e}</div>
          ))}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
