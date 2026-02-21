import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ConnectionBadge } from '../components/ConnectionBadge.jsx';
import { useBle } from '../context/BleContext.jsx';
import { useTripContext } from '../context/TripContext.jsx';
import { useCars } from '../hooks/useCars.js';

export function Dashboard() {
  const navigate = useNavigate();
  const { status: bleStatus } = useBle();
  const { activeTrip } = useTripContext();
  const { cars, loading } = useCars();

  const displayCars = cars.length > 0 ? cars : [
    { id: 'car-001', name: 'ABC-123', numberPlate: 'ABC-123', lastOdometer: 43500 },
    { id: 'car-002', name: 'XYZ-789', numberPlate: 'XYZ-789', lastOdometer: 52100 },
  ];

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
        {/* BRB: Big Red Button philosophy — large, bold, high-contrast */}
        {!activeTrip && (
          <>
            <div className="text-slate-600 dark:text-slate-400 text-sm font-medium uppercase tracking-wide mb-2">
              Select car
            </div>
            {displayCars.slice(0, 3).map((car, i) => (
              <button
                key={car.id}
                onClick={() => navigate('/start', { state: { carId: car.id, carName: car.name ?? car.numberPlate } })}
                className="brb w-full py-6 rounded-2xl text-white font-bold text-2xl
                           bg-red-600 hover:bg-red-500 active:bg-red-700
                           border-2 border-red-500 shadow-lg
                           transition-all duration-150 select-none"
              >
                {car.name ?? car.numberPlate}
              </button>
            ))}

            <button
              onClick={() => navigate('/history')}
              className="brb w-full py-5 rounded-2xl text-white font-bold text-xl
                         bg-slate-600 dark:bg-slate-700 hover:bg-slate-500 dark:hover:bg-slate-600 active:bg-slate-700 dark:active:bg-slate-800
                         border-2 border-slate-500
                         transition-all duration-150 select-none mt-4"
            >
              View details
            </button>
          </>
        )}
      </div>
    </div>
  );
}
