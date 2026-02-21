import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api/index.js';

const CarsContext = createContext(null);

export function CarsProvider({ children }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiService.getCars?.() ?? [];
      setCars(Array.isArray(list) ? list : []);
    } catch {
      setCars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCar = useCallback(async (car) => {
    const created = await apiService.addCar(car);
    setCars((prev) => (prev.some((c) => c.id === created.id) ? prev.map((c) => (c.id === created.id ? created : c)) : [...prev, created]));
    return created;
  }, []);

  const updateCar = useCallback(async (id, updates) => {
    setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    const updated = await apiService.updateCar?.(id, updates);
    setCars((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    return updated;
  }, []);

  const deleteCar = useCallback(async (id) => {
    setCars((prev) => prev.filter((c) => c.id !== id));
    try {
      await apiService.deleteCar?.(id);
    } catch {
      await refresh();
    }
  }, [refresh]);

  const value = { cars, loading, refresh, addCar, updateCar, deleteCar };

  return (
    <CarsContext.Provider value={value}>
      {children}
    </CarsContext.Provider>
  );
}

export function useCars() {
  const ctx = useContext(CarsContext);
  if (!ctx) throw new Error('useCars must be used within CarsProvider');
  return ctx;
}
