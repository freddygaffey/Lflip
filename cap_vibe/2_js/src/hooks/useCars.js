import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api/index.js';

export function useCars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiService.getCars?.() ?? [
        { id: 'car-001', name: 'ABC-123', numberPlate: 'ABC-123', lastOdometer: 43500 },
        { id: 'car-002', name: 'XYZ-789', numberPlate: 'XYZ-789', lastOdometer: 52100 },
      ];
      setCars(Array.isArray(list) ? list : []);
    } catch {
      setCars([
        { id: 'car-001', name: 'ABC-123', numberPlate: 'ABC-123', lastOdometer: 43500 },
        { id: 'car-002', name: 'XYZ-789', numberPlate: 'XYZ-789', lastOdometer: 52100 },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCar = useCallback(async (car) => {
    const created = await apiService.addCar(car);
    await refresh();
    return created;
  }, [refresh]);

  const updateCar = useCallback(async (id, updates) => {
    const updated = await apiService.updateCar?.(id, updates);
    await refresh();
    return updated;
  }, [refresh]);

  const deleteCar = useCallback(async (id) => {
    await apiService.deleteCar?.(id);
    await refresh();
  }, [refresh]);

  return { cars, loading, refresh, addCar, updateCar, deleteCar };
}
