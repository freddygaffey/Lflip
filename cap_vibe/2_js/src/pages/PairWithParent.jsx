import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { apiService } from '../services/api/index.js';
import { useAuth } from '../context/AuthContext.jsx';

const TOKEN_TTL_MS = 15 * 60 * 1000;

export function PairWithParent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [token, setToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateToken = useCallback(async () => {
    if (user?.role !== 'learner') return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.createPairingToken();
      setToken(res.token);
      setExpiresAt(res.expiresAt);
      const url = await QRCode.toDataURL(res.token, { width: 256, margin: 2 });
      setQrDataUrl(url);
    } catch (err) {
      setError(err?.message ?? 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  if (user && user.role !== 'learner') {
    return (
      <div className="page-content px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Pair with parent</h1>
        <p className="text-slate-600 dark:text-slate-400">Only learners can generate pairing codes. Parents should use "Add learner" to scan.</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">← Back</button>
      </div>
    );
  }

  return (
    <div className="page-content px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-500 dark:text-slate-400 text-xl p-1">←</button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Pair with parent</h1>
      </div>

      <p className="text-slate-600 dark:text-slate-400 text-sm">
        Generate a code and show it to your parent. They can scan the QR code with their phone or enter the code manually.
      </p>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!token ? (
        <button
          onClick={generateToken}
          disabled={loading}
          className="btn-primary w-full disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate pairing code'}
        </button>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 flex flex-col items-center border border-slate-200 dark:border-transparent">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="Pairing QR code" className="w-64 h-64" />
            )}
            <p className="mt-4 text-slate-700 dark:text-slate-300 font-mono text-lg font-semibold select-all">
              {token}
            </p>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm text-center">
              Parent: scan this QR with your phone, or enter the code above.
            </p>
          </div>

          {expiresAt && Date.now() > expiresAt && (
            <p className="text-amber-600 dark:text-amber-400 text-sm">Code expired. Generate a new one.</p>
          )}

          <button
            onClick={generateToken}
            disabled={loading}
            className="btn-secondary w-full"
          >
            {loading ? 'Generating…' : 'Generate new code'}
          </button>
        </>
      )}
    </div>
  );
}
