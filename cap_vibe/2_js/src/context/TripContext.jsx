import React, { createContext, useContext, useState, useEffect } from 'react';
import { tripManager } from '../services/tripManager/tripManager.js';

const TripContext = createContext(null);

export function TripProvider({ children }) {
  const [activeTrip, setActiveTrip] = useState(tripManager.getState());
  const [lastCompletedTrip, setLastCompletedTrip] = useState(null);

  useEffect(() => {
    return tripManager.subscribe((state) => setActiveTrip(state ? { ...state } : null));
  }, []);

  const startTrip = async (opts) => {
    return tripManager.startTrip(opts);
  };

  const stopTrip = async (endOdometer, weather) => {
    const trip = await tripManager.stopTrip(endOdometer, weather);
    setLastCompletedTrip(trip);
    return trip;
  };

  return (
    <TripContext.Provider value={{ activeTrip, lastCompletedTrip, startTrip, stopTrip }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTripContext() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTripContext must be used within TripProvider');
  return ctx;
}
