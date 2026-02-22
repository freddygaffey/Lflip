import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api/index.js';
import { STATE_REQUIREMENTS, DEFAULT_STATE } from '../config.js';

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
    setUser({ name: auth.name, userId: auth.userId, role: auth.role, licenceNumber: auth.licenceNumber, email: auth.email, state: auth.state || DEFAULT_STATE });
    return auth;
  };

  const register = async (email, password, name, licenceNumber, role, state) => {
    const auth = await apiService.register(email, password, name, licenceNumber, role, state);
    setUser({ name: auth.name, userId: auth.userId, role: auth.role, licenceNumber: auth.licenceNumber, email: auth.email, state: auth.state || state || DEFAULT_STATE });
    return auth;
  };

  const updateEmail = async (newEmail, password) => {
    const result = await apiService.updateEmail(newEmail, password);
    setUser((prev) => prev ? { ...prev, email: result.email } : prev);
    return result;
  };

  const updatePassword = async (currentPassword, newPassword) => {
    return apiService.updatePassword(currentPassword, newPassword);
  };

  const updateState = async (newState) => {
    if (typeof apiService.updateState === 'function') {
      await apiService.updateState(newState);
    }
    setUser((prev) => prev ? { ...prev, state: newState } : prev);
  };

  const stateReqs = useMemo(() => {
    const s = user?.state || DEFAULT_STATE;
    return STATE_REQUIREMENTS[s] || STATE_REQUIREMENTS[DEFAULT_STATE];
  }, [user?.state]);

  const logout = async () => {
    if (typeof apiService.logout === 'function') {
      await apiService.logout();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateEmail, updatePassword, updateState, stateReqs, restoring }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
