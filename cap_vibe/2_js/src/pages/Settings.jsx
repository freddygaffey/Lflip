import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { STATE_REQUIREMENTS, DEFAULT_STATE } from '../config.js';

export function Settings() {
  const navigate = useNavigate();
  const { isDark, setIsDark } = useTheme();
  const { user, logout, updateEmail, updatePassword, updateState, stateReqs } = useAuth();
  const isParent = user?.role === 'parent';

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState({ text: '', ok: false });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState({ text: '', ok: false });

  const isValidEmail = (value) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

  const passwordChecks = [
    { label: 'At least 6 characters', met: newPassword.length >= 6 },
    { label: 'Contains a letter', met: /[a-zA-Z]/.test(newPassword) },
    { label: 'Contains a number', met: /\d/.test(newPassword) },
  ];
  const allPasswordChecksMet = passwordChecks.every((c) => c.met);

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailMsg({ text: '', ok: false });
    if (!newEmail.trim()) {
      setEmailMsg({ text: 'Please enter your new email address', ok: false });
      return;
    }
    if (!isValidEmail(newEmail)) {
      setEmailMsg({ text: 'That doesn\u2019t look like a valid email \u2014 check for typos', ok: false });
      return;
    }
    if (!emailPassword) {
      setEmailMsg({ text: 'Enter your current password to confirm the change', ok: false });
      return;
    }
    setEmailLoading(true);
    try {
      await updateEmail(newEmail, emailPassword);
      setEmailMsg({ text: 'Email updated successfully', ok: true });
      setNewEmail('');
      setEmailPassword('');
      setShowEmailForm(false);
    } catch (err) {
      setEmailMsg({ text: err?.message ?? 'Failed to update email', ok: false });
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: '', ok: false });
    if (!currentPassword) {
      setPasswordMsg({ text: 'Enter your current password', ok: false });
      return;
    }
    if (!allPasswordChecksMet) {
      const failing = passwordChecks.filter((c) => !c.met).map((c) => c.label.toLowerCase());
      setPasswordMsg({ text: `New password must: ${failing.join(', ')}`, ok: false });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMsg({ text: 'New passwords do not match', ok: false });
      return;
    }
    setPasswordLoading(true);
    try {
      await updatePassword(currentPassword, newPassword);
      setPasswordMsg({ text: 'Password updated successfully', ok: true });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      setPasswordMsg({ text: err?.message ?? 'Failed to update password', ok: false });
    } finally {
      setPasswordLoading(false);
    }
  };

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
          <div className="text-slate-600 dark:text-slate-400 text-sm">
            Signed in as {user.name}
            {user.email && <span className="block text-xs text-slate-500 dark:text-slate-500 mt-0.5">{user.email}</span>}
          </div>
        )}

        {/* Change Email */}
        <button
          type="button"
          onClick={() => { setShowEmailForm(!showEmailForm); setEmailMsg({ text: '', ok: false }); }}
          className="w-full py-2.5 rounded-xl font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-colors text-sm"
        >
          Change email
        </button>
        {showEmailForm && (
          <form onSubmit={handleEmailChange} className="space-y-2 pt-1">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              placeholder="New email"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              required
              placeholder="Current password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors text-sm"
            >
              {emailLoading ? 'Saving…' : 'Update email'}
            </button>
          </form>
        )}
        {emailMsg.text && (
          <div className={`text-xs ${emailMsg.ok ? 'text-green-500' : 'text-red-500'}`}>{emailMsg.text}</div>
        )}

        {/* Change Password */}
        <button
          type="button"
          onClick={() => { setShowPasswordForm(!showPasswordForm); setPasswordMsg({ text: '', ok: false }); }}
          className="w-full py-2.5 rounded-xl font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-colors text-sm"
        >
          Change password
        </button>
        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="space-y-2 pt-1">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="Current password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="New password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {newPassword.length > 0 && (
              <ul className="space-y-0.5 -mt-0.5">
                {passwordChecks.map((check) => (
                  <li key={check.label} className={`flex items-center gap-1.5 text-xs ${check.met ? 'text-green-500' : 'text-slate-400 dark:text-slate-500'}`}>
                    <span>{check.met ? '✓' : '○'}</span>
                    <span>{check.label}</span>
                  </li>
                ))}
              </ul>
            )}
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Confirm new password"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full py-2 rounded-lg font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors text-sm"
            >
              {passwordLoading ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
        {passwordMsg.text && (
          <div className={`text-xs ${passwordMsg.ok ? 'text-green-500' : 'text-red-500'}`}>{passwordMsg.text}</div>
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
        <div>
          <label className="block text-slate-600 dark:text-slate-400 text-sm mb-1">State / Territory</label>
          <select
            value={user?.state || DEFAULT_STATE}
            onChange={(e) => updateState(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            {Object.entries(STATE_REQUIREMENTS).map(([code, { label }]) => (
              <option key={code} value={code}>{code} — {label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
            <div className="text-slate-500 dark:text-slate-400 text-xs">Total</div>
            <div className="font-semibold text-slate-900 dark:text-white">{stateReqs.total}h</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
            <div className="text-slate-500 dark:text-slate-400 text-xs">Day</div>
            <div className="font-semibold text-amber-600 dark:text-amber-400">{stateReqs.total - stateReqs.night}h</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-2">
            <div className="text-slate-500 dark:text-slate-400 text-xs">Night</div>
            <div className="font-semibold text-indigo-600 dark:text-indigo-400">{stateReqs.night}h</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-3 shadow-sm dark:shadow-none border border-slate-200 dark:border-transparent">
        <div className="text-slate-700 dark:text-slate-300 font-semibold">Pairing</div>
        {isParent ? (
          <button
            onClick={() => navigate('/scan-pair')}
            className="w-full py-2.5 rounded-xl font-medium bg-primary-500/20 text-primary-600 dark:text-primary-400 hover:bg-primary-500/30 border border-primary-500/50 transition-colors"
          >
            Add learner
          </button>
        ) : (
          <button
            onClick={() => navigate('/pair')}
            className="w-full py-2.5 rounded-xl font-medium bg-primary-500/20 text-primary-600 dark:text-primary-400 hover:bg-primary-500/30 border border-primary-500/50 transition-colors"
          >
            Pair with parent
          </button>
        )}
      </div>

      <div className="h-4" />
    </div>
  );
}
