import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { STATE_REQUIREMENTS, DEFAULT_STATE } from '../config.js';

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedState, setSelectedState] = useState(DEFAULT_STATE);

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
      await register(email, password, name, licenceNumber, roleSelection || 'learner', roleSelection === 'learner' ? selectedState : undefined);
      navigate('/');
    } catch (err) {
      setError(err?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (value) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

  const passwordChecks = [
    { label: 'At least 6 characters', met: password.length >= 6 },
    { label: 'Contains a letter', met: /[a-zA-Z]/.test(password) },
    { label: 'Contains a number', met: /\d/.test(password) },
  ];
  const allPasswordChecksMet = passwordChecks.every((c) => c.met);

  const handleSubmit = (e) => {
    if (!email.trim()) {
      e.preventDefault();
      setError('Please enter your email address');
      return;
    }
    if (!isValidEmail(email)) {
      e.preventDefault();
      setError('That doesn\u2019t look like a valid email \u2014 check for typos');
      return;
    }
    if (mode === 'login') {
      if (!password) {
        e.preventDefault();
        setError('Please enter your password');
        return;
      }
      handleLogin(e);
      return;
    }
    if (!roleSelection) {
      e.preventDefault();
      setError('Please select whether you are an SD or L-plate');
      return;
    }
    if (!name.trim()) {
      e.preventDefault();
      setError('Please enter your name');
      return;
    }
    if (!allPasswordChecksMet) {
      e.preventDefault();
      const failing = passwordChecks.filter((c) => !c.met).map((c) => c.label.toLowerCase());
      setError(`Password must: ${failing.join(', ')}`);
      return;
    }
    if (password !== confirmPassword) {
      e.preventDefault();
      setError('Passwords do not match');
      return;
    }
    handleRegister(e);
  };

  return (
    <div className="min-h-screen overflow-y-auto flex items-start sm:items-center justify-center px-4 py-8 bg-slate-100 dark:bg-slate-900">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">L-Plate Tracker</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Sign in to continue</p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-xl">
          <button
            type="button"
            onClick={() => { setMode('login'); setRoleSelection(null); setLicenceNumber(''); setConfirmPassword(''); setSelectedState(DEFAULT_STATE); setError(''); }}
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
            onClick={() => { setMode('register'); setRoleSelection(null); setLicenceNumber(''); setConfirmPassword(''); setSelectedState(DEFAULT_STATE); setError(''); }}
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  I am a<span className="text-red-400 ml-0.5">*</span>
                </label>
                {!roleSelection && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Select one to continue</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setRoleSelection('parent'); setError(''); }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                      roleSelection === 'parent'
                        ? 'bg-amber-500/20 border-2 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm'
                        : roleSelection === null
                          ? 'bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400'
                          : 'bg-slate-100 dark:bg-slate-700/50 border-2 border-transparent text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    SD (Supervisor)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRoleSelection('learner'); setError(''); }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                      roleSelection === 'learner'
                        ? 'bg-sky-500/20 border-2 border-sky-500 text-sky-700 dark:text-sky-300 shadow-sm'
                        : roleSelection === null
                          ? 'bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-500 text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600 dark:hover:text-sky-400'
                          : 'bg-slate-100 dark:bg-slate-700/50 border-2 border-transparent text-slate-400 dark:text-slate-500'
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
              {roleSelection === 'learner' && (
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    State / Territory
                  </label>
                  <select
                    id="state"
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {Object.entries(STATE_REQUIREMENTS).map(([code, { label }]) => (
                      <option key={code} value={code}>{code} — {label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Sets your required logbook hours ({STATE_REQUIREMENTS[selectedState].total}h total, {STATE_REQUIREMENTS[selectedState].night}h night)
                  </p>
                </div>
              )}
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
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {mode === 'register' && password.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {passwordChecks.map((check) => (
                  <li key={check.label} className={`flex items-center gap-1.5 text-xs ${check.met ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    <span>{check.met ? '✓' : '○'}</span>
                    <span>{check.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {mode === 'register' && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          )}
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
            onClick={() => { setMode('login'); setEmail('parent@test.com'); setPassword('test1234'); setName('Fill parent (testing)'); setRoleSelection(null); setLicenceNumber(''); setError(''); }}
            className="flex-1 py-2 rounded-xl text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border border-amber-300/50 dark:border-amber-700/50"
          >
            Fill parent (testing)
          </button>
          <button
            type="button"
            onClick={() => { setMode('login'); setEmail('learner@test.com'); setPassword('test1234'); setName('Fill learner (testing)'); setRoleSelection(null); setLicenceNumber(''); setError(''); }}
            className="flex-1 py-2 rounded-xl text-xs font-medium bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200 border border-sky-300/50 dark:border-sky-700/50"
          >
            Fill learner (testing)
          </button>
        </div>
      </div>
    </div>
  );
}
