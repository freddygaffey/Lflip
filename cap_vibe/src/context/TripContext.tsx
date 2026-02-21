import React, { createContext, useContext, useState, useEffect } from 'react';
import { tripManager, type ActiveTripState } from '../services/tripManager/tripManager';
import type { Trip, WeatherCondition } from '../models/trip';

interface TripCtxValue {
  activeTrip: ActiveTripState | null;
  lastCompletedTrip: Trip | null;
  startTrip: (opts: {
    supervisorId: string;
    supervisorName: string;
    weather: WeatherCondition;
    startOdometer: number;
  }) => Promise<string>;
  stopTrip: (endOdometer: number) => Promise<Trip>;
}

const TripContext = createContext<TripCtxValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  const [activeTrip, setActiveTrip] = useState<ActiveTripState | null>(tripManager.getState());
  const [lastCompletedTrip, setLastCompletedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    return tripManager.subscribe((state) => setActiveTrip({ ...state }));
  }, []);

  const startTrip = async (opts: {
    supervisorId: string;
    supervisorName: string;
    weather: WeatherCondition;
    startOdometer: number;
  }) => {
    return tripManager.startTrip(opts);
  };

  const stopTrip = async (endOdometer: number) => {
    const trip = await tripManager.stopTrip(endOdometer);
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
