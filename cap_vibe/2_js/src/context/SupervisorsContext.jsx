import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api/index.js';

const SupervisorsContext = createContext(null);

export function SupervisorsProvider({ children }) {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiService.getSupervisors?.() ?? [];
      setSupervisors(Array.isArray(list) ? list : []);
    } catch {
      setSupervisors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SupervisorsContext.Provider value={{ supervisors, loading, refresh }}>
      {children}
    </SupervisorsContext.Provider>
  );
}

export function useSupervisors() {
  const ctx = useContext(SupervisorsContext);
  if (!ctx) throw new Error('useSupervisors must be used within SupervisorsProvider');
  return ctx;
}
