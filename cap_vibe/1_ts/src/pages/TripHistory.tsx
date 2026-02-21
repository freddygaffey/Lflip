import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripCard } from '../components/TripCard';
import { useLogbook } from '../hooks/useLogbook';
import { formatHoursDecimal } from '../utils/formatTime';
import type { TripFilters } from '../models/trip';

export function TripHistory() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<TripFilters>({});
  const [nightOnly, setNightOnly] = useState(false);
  const { trips, summary, loading, error, refresh } = useLogbook(filters);

  const toggleNight = () => {
    const next = !nightOnly;
    setNightOnly(next);
    setFilters((f) => ({ ...f, nightOnly: next || undefined, dayOnly: undefined }));
  };

  return (
    <div className="page-content px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">Logbook</h1>
        <button onClick={refresh} className="text-slate-400 text-xl p-1">↻</button>
      </div>

      {/* Running totals */}
      {summary && (
        <div className="bg-slate-800 rounded-2xl p-4 mb-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-green-400 font-bold text-lg">{formatHoursDecimal(summary.totalHours)}</div>
            <div className="text-slate-400 text-xs">Total</div>
          </div>
          <div>
            <div className="text-amber-400 font-bold text-lg">{formatHoursDecimal(summary.dayHours)}</div>
            <div className="text-slate-400 text-xs">Day</div>
          </div>
          <div>
            <div className="text-indigo-400 font-bold text-lg">{formatHoursDecimal(summary.nightHours)}</div>
            <div className="text-slate-400 text-xs">Night</div>
          </div>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button
          onClick={toggleNight}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            nightOnly
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}
        >
          🌙 Night only
        </button>
        <button
          onClick={() => { setFilters({}); setNightOnly(false); }}
          className="px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap bg-slate-800 text-slate-400 border border-slate-700"
        >
          Clear filters
        </button>
      </div>

      {/* Trip list */}
      {loading && (
        <div className="text-slate-400 text-center py-12">Loading trips…</div>
      )}
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}
      {!loading && trips.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <div className="text-5xl">📋</div>
          <p className="text-slate-400">No trips recorded yet.</p>
          <button onClick={() => navigate('/start')} className="btn-primary">Start your first trip</button>
        </div>
      )}
      <div className="space-y-3">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
      <div className="h-4" />
    </div>
  );
}
