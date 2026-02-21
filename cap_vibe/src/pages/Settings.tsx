import React, { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_TARGET_HOURS, NIGHT_HOURS_REQUIRED } from '../config';
import type { UserProfile } from '../models/trip';

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  licenceNumber: '',
  targetHours: DEFAULT_TARGET_HOURS,
  nightStartHour: 19,
  nightEndHour: 6,
};

export function Settings() {
  const { userName, isLoggedIn, login, register, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');

  useEffect(() => {
    Preferences.get({ key: 'user_profile' }).then(({ value }) => {
      if (value) setProfile(JSON.parse(value));
    });
  }, []);

  const saveProfile = async () => {
    await Preferences.set({ key: 'user_profile', value: JSON.stringify(profile) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (showRegister) {
        await register(email, password, regName);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Auth */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="text-slate-300 font-semibold text-sm">Account</div>
        {isLoggedIn ? (
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Logged in as</span>
              <span className="text-white">{userName}</span>
            </div>
            <button onClick={logout} className="btn-danger w-full">Log Out</button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowRegister(false)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${!showRegister ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Log In
              </button>
              <button
                onClick={() => setShowRegister(true)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${showRegister ? 'bg-primary-500 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                Register
              </button>
            </div>
            {showRegister && (
              <input value={regName} onChange={(e) => setRegName(e.target.value)} className="input-field" placeholder="Full name" />
            )}
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="Email" type="email" autoCapitalize="none" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} className="input-field" placeholder="Password" type="password" />
            {authError && <div className="text-red-400 text-sm">{authError}</div>}
            <button onClick={handleAuth} disabled={!email || !password || authLoading} className="btn-primary w-full disabled:opacity-50">
              {authLoading ? 'Please wait…' : showRegister ? 'Register' : 'Log In'}
            </button>
          </div>
        )}
      </div>

      {/* Profile */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="text-slate-300 font-semibold text-sm">Learner Profile</div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">Your name</label>
          <input
            value={profile.name}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            className="input-field"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">Learner licence number</label>
          <input
            value={profile.licenceNumber ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, licenceNumber: e.target.value }))}
            className="input-field"
            placeholder="e.g. NSW123456"
          />
        </div>
        <div>
          <label className="text-slate-400 text-xs block mb-1">Target hours (default 120)</label>
          <input
            type="number"
            value={profile.targetHours}
            onChange={(e) => setProfile((p) => ({ ...p, targetHours: parseInt(e.target.value) || DEFAULT_TARGET_HOURS }))}
            className="input-field"
          />
        </div>
      </div>

      {/* NSW Info */}
      <div className="bg-slate-800 rounded-2xl p-4 space-y-2">
        <div className="text-slate-300 font-semibold text-sm">NSW Logbook Requirements</div>
        <div className="space-y-1.5 text-sm text-slate-400">
          <div>📋 120 hours total required</div>
          <div>🌙 20 hours must be at night</div>
          <div>🚗 Max speed: 90 km/h for learners</div>
          <div>👤 Fully licensed supervisor required</div>
          <div>🍺 Zero BAC required</div>
          <div>📍 L-plates must be displayed</div>
        </div>
      </div>

      <button
        onClick={saveProfile}
        className={`btn-primary w-full transition-all ${saved ? 'bg-green-600' : ''}`}
      >
        {saved ? '✓ Saved!' : 'Save Profile'}
      </button>

      <div className="h-4" />
    </div>
  );
}
