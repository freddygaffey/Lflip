import React, { createContext, useContext, useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { apiService } from '../services/api';
import type { AuthToken } from '../models/trip';

interface AuthState {
  token: string | null;
  userId: string | null;
  userName: string | null;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    Preferences.get({ key: 'auth_token' }).then(({ value }) => {
      if (value) {
        const saved = JSON.parse(value) as AuthToken;
        setToken(saved.token);
        setUserId(saved.userId);
        setUserName(saved.name);
      }
    });
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiService.login(email, password);
    setToken(data.token);
    setUserId(data.userId);
    setUserName(data.name);
    await Preferences.set({ key: 'auth_token', value: JSON.stringify(data) });
  };

  const register = async (email: string, password: string, name: string) => {
    const data = await apiService.register(email, password, name);
    setToken(data.token);
    setUserId(data.userId);
    setUserName(data.name);
    await Preferences.set({ key: 'auth_token', value: JSON.stringify(data) });
  };

  const logout = () => {
    setToken(null);
    setUserId(null);
    setUserName(null);
    Preferences.remove({ key: 'auth_token' });
  };

  return (
    <AuthContext.Provider value={{ token, userId, userName, isLoggedIn: !!token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
