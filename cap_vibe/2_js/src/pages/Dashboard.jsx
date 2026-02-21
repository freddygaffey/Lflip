import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectionBadge } from '../components/ConnectionBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useBle } from '../context/BleContext.jsx';
import { useTripContext } from '../context/TripContext.jsx';
import { useCars } from '../hooks/useCars.js';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status: bleStatus } = useBle();
  const { activeTrip } = useTripContext();
  const { cars, loading } = useCars();
  const isParent = user?.role === 'parent';

  return (
    <div className="page-content px-4 py-6 flex flex-col min-h-0">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">L-Plate Tracker</h1>
        <ConnectionBadge status={bleStatus} />
      </div>

      {activeTrip && activeTrip.phase === 'active' && (
        <button
          onClick={() => navigate('/active')}
          className="w-full bg-green-500/30 border-2 border-green-500 rounded-2xl p-4 flex items-center gap-3 mb-6"
        >
          <div className="w-3 h-3 bg-green-400 rounded-full record-dot" />
          <div className="text-left flex-1">
            <div className="text-green-400 font-bold">Trip in Progress</div>
            <div className="text-slate-600 dark:text-slate-300 text-sm">Tap to view</div>
          </div>
          <span className="text-green-400 text-xl">→</span>
        </button>
      )}

      <div className="flex-1 flex flex-col gap-4">
        {isParent && (
          <button
            onClick={() => navigate('/approvals')}
            className="w-full py-4 rounded-2xl text-white font-medium text-lg bg-green-600 hover:bg-green-500 active:bg-green-700 border border-green-500/50 transition-all duration-150 select-none"
          >
            ✓ Approve trips
          </button>
        )}
        {/* BRB: Big Red Button philosophy — large, bold, high-contrast */}
        {!activeTrip && (
          <>
            {cars.length > 0 ? (
              <>
                <div className="text-slate-600 dark:text-slate-400 text-sm font-medium uppercase tracking-wide mb-2">
                  Select car
                </div>
                {cars.slice(0, 3).map((car, i) => {
                  const carColors = [
                    'bg-teal-500/90 hover:bg-teal-400 active:bg-teal-600 border border-teal-400/50',
                    'bg-sky-500/90 hover:bg-sky-400 active:bg-sky-600 border border-sky-400/50',
                    'bg-violet-500/90 hover:bg-violet-400 active:bg-violet-600 border border-violet-400/50',
                  ];
                  return (
                    <button
                      key={car.id}
                      onClick={() => navigate('/start', { state: { carId: car.id, carName: car.name ?? car.numberPlate } })}
                      className={`w-full py-5 rounded-2xl text-white font-semibold text-xl ${carColors[i % carColors.length]} transition-all duration-150 select-none`}
                    >
                      {car.name ?? car.numberPlate}
                    </button>
                  );
                })}
              </>
            ) : (
              <button
                onClick={() => navigate('/car')}
                className="w-full py-5 rounded-2xl text-white font-semibold text-xl bg-slate-500/90 hover:bg-slate-400 active:bg-slate-600 border border-slate-400/50 transition-all duration-150 select-none"
              >
                Add your first car →
              </button>
            )}
            <button
              onClick={() => navigate('/start', { state: { guestCar: true } })}
              className="w-full py-4 rounded-2xl text-slate-700 dark:text-slate-200 font-medium text-lg
                         bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60
                         active:bg-amber-300 dark:active:bg-amber-900/80
                         border border-amber-300/50 dark:border-amber-700/50
                         transition-all duration-150 select-none"
            >
              Guest car
            </button>

            <button
              onClick={() => navigate('/manual-log')}
              className="w-full py-4 rounded-2xl text-slate-700 dark:text-slate-200 font-medium text-lg
                         bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
                         active:bg-slate-300 dark:active:bg-slate-600
                         border border-slate-300 dark:border-slate-600
                         transition-all duration-150 select-none mt-2"
            >
              Log trip manually
            </button>
            <button
              onClick={() => navigate('/history')}
              className="w-full py-4 rounded-2xl text-slate-700 dark:text-slate-200 font-medium text-lg
                         bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700
                         active:bg-slate-300 dark:active:bg-slate-600
                         border border-slate-300 dark:border-slate-600
                         transition-all duration-150 select-none mt-2"
            >
              View details
            </button>
          </>
        )}
      </div>
    </div>
  );
}
