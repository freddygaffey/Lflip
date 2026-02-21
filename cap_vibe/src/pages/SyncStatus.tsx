import React from 'react';
import { useLogbook } from '../hooks/useLogbook';
import { useSync } from '../hooks/useSync';
import { formatDate, formatDateTime } from '../utils/formatTime';
import type { Trip } from '../models/trip';

export function SyncStatus() {
  const { trips, refresh } = useLogbook();
  const { syncing, lastSyncAt, errors, syncAll } = useSync();

  const unsynced = trips.filter((t) => t.syncStatus === 'unsynced' && t.status === 'complete');
  const synced = trips.filter((t) => t.syncStatus === 'synced');

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-white">Sync Status</h1>

      {/* Last sync */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Last sync</span>
          <span className="text-white">{lastSyncAt ? formatDateTime(lastSyncAt) : 'Never'}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">Pending sync</span>
          <span className={unsynced.length > 0 ? 'text-amber-400 font-semibold' : 'text-green-400'}>
            {unsynced.length} trip{unsynced.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Sync now */}
      <button
        onClick={async () => { await syncAll(unsynced); await refresh(); }}
        disabled={syncing || unsynced.length === 0}
        className="btn-primary w-full disabled:opacity-50"
      >
        {syncing ? '↑ Syncing…' : `↑ Sync Now (${unsynced.length} pending)`}
      </button>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-2xl p-4 space-y-1">
          <div className="text-red-400 font-semibold text-sm">Sync Errors</div>
          {errors.map((e, i) => (
            <div key={i} className="text-red-300 text-xs">{e}</div>
          ))}
        </div>
      )}

      {/* Pending trips */}
      {unsynced.length > 0 && (
        <div className="space-y-2">
          <div className="text-slate-300 font-semibold text-sm">Pending ({unsynced.length})</div>
          {unsynced.map((t) => (
            <TripSyncRow key={t.id} trip={t} status="unsynced" />
          ))}
        </div>
      )}

      {/* Synced trips */}
      {synced.length > 0 && (
        <div className="space-y-2">
          <div className="text-slate-300 font-semibold text-sm">Synced ({synced.length})</div>
          {synced.slice(0, 5).map((t) => (
            <TripSyncRow key={t.id} trip={t} status="synced" />
          ))}
        </div>
      )}
      <div className="h-4" />
    </div>
  );
}

function TripSyncRow({ trip, status }: { trip: Trip; status: string }) {
  return (
    <div className="bg-slate-800 rounded-xl px-4 py-3 flex justify-between items-center">
      <div>
        <div className="text-white text-sm">{formatDate(trip.startTime)}</div>
        <div className="text-slate-400 text-xs">{trip.supervisorName}</div>
      </div>
      <div className={`text-xs font-medium ${status === 'synced' ? 'text-green-400' : 'text-amber-400'}`}>
        {status === 'synced' ? '✓ Synced' : '↑ Pending'}
      </div>
    </div>
  );
}
