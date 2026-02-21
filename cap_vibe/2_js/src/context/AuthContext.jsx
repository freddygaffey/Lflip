import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiService } from '../services/api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const restore = async () => {
      if (typeof apiService.getCurrentUser !== 'function') {
        setRestoring(false);
        return;
      }
      try {
        const stored = await apiService.getCurrentUser();
        if (stored) setUser(stored);
      } catch {
        // ignore
      } finally {
        setRestoring(false);
      }
    };
    restore();
  }, []);

  const login = async (email, password) => {
    const auth = await apiService.login(email, password);
    setUser({ name: auth.name, userId: auth.userId, role: auth.role, licenceNumber: auth.licenceNumber });
    return auth;
  };

  const register = async (email, password, name, licenceNumber, role) => {
    const auth = await apiService.register(email, password, name, licenceNumber, role);
    setUser({ name: auth.name, userId: auth.userId, role: auth.role, licenceNumber: auth.licenceNumber });
    return auth;
  };

  const logout = async () => {
    if (typeof apiService.logout === 'function') {
      await apiService.logout();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, restoring }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
