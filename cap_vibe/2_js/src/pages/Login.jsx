import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [roleSelection, setRoleSelection] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name, licenceNumber, roleSelection || 'learner');
      navigate('/');
    } catch (err) {
      setError(err?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    if (mode === 'login') {
      handleLogin(e);
      return;
    }
    if (!roleSelection) {
      e.preventDefault();
      setError('Please select whether you are an SD or L-plate');
      return;
    }
    handleRegister(e);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">L-Plate Tracker</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Sign in to continue</p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('login'); setRoleSelection(null); setLicenceNumber(''); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setRoleSelection(null); setLicenceNumber(''); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  I am a
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setRoleSelection('parent'); setError(''); }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                      roleSelection === 'parent'
                        ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-700 dark:text-amber-300'
                        : 'bg-slate-200 dark:bg-slate-700 border-2 border-transparent text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    SD (Supervisor)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRoleSelection('learner'); setError(''); }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                      roleSelection === 'learner'
                        ? 'bg-sky-500/20 border-2 border-sky-500 text-sky-700 dark:text-sky-300'
                        : 'bg-slate-200 dark:bg-slate-700 border-2 border-transparent text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    L-plate (Learner)
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Your full name"
                />
              </div>
              {roleSelection === 'parent' && (
                <div>
                  <label htmlFor="licence" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Licence number
                  </label>
                  <input
                    id="licence"
                    type="text"
                    value={licenceNumber}
                    onChange={(e) => setLicenceNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g. NSW 12345678"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your driver licence number (required for supervising learners)
                  </p>
                </div>
              )}
            </>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
          </button>
        </form>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setMode('login'); setEmail('parent@demo.com'); setPassword('demo'); setName('Mum'); setRoleSelection(null); setLicenceNumber(''); setError(''); }}
            className="flex-1 py-2 rounded-xl text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300/50 dark:border-amber-700/50"
          >
            Fill parent (testing)
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setEmail('learner@demo.com'); setPassword('demo'); setName('Alex'); setRoleSelection(null); setLicenceNumber(''); setError(''); }}
            className="flex-1 py-2 rounded-xl text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border border-sky-300/50 dark:border-sky-700/50"
          >
            Fill learner (testing)
          </button>
        </div>
      </div>
    </div>
  );
}
