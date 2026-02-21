import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Settings() {
  const navigate = useNavigate();
  const { isDark, setIsDark } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-500 dark:text-slate-400 text-xl p-1">←</button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Settings</h1>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-3 shadow-sm dark:shadow-none border border-slate-200 dark:border-transparent">
        <div className="text-slate-700 dark:text-slate-300 font-semibold">Appearance</div>
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-400 text-sm">Theme</span>
          <button
            onClick={() => setIsDark((d) => !d)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 text-sm font-medium border border-slate-300 dark:border-transparent"
          >
            <span>{isDark ? '🌙 Dark' : '☀️ Light'}</span>
            <span className="text-slate-500 dark:text-slate-400 text-xs">tap to switch</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-3 shadow-sm dark:shadow-none border border-slate-200 dark:border-transparent">
        <div className="text-slate-700 dark:text-slate-300 font-semibold">Account</div>
        {user && (
          <div className="text-slate-600 dark:text-slate-400 text-sm">Signed in as {user.name}</div>
        )}
        <button
          onClick={async () => { await logout(); navigate('/login'); }}
          className="w-full py-2.5 rounded-xl font-medium bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/30 active:bg-red-500/40 border border-red-500/50 transition-colors"
        >
          Log out
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-3 shadow-sm dark:shadow-none border border-slate-200 dark:border-transparent">
        <div className="text-slate-700 dark:text-slate-300 font-semibold">Logbook</div>
        <div className="text-slate-600 dark:text-slate-400 text-sm">Target: 120 hours (20 night)</div>
      </div>

      <div className="h-4" />
    </div>
  );
}
