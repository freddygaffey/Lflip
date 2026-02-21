import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { apiService } from '../services/api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { WebQrScanner } from '../components/WebQrScanner.jsx';

const PAIR_TOKEN_REGEX = /^PAIR-[A-Z0-9]{8}$/i;

export function ScanToPair() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const isNative = Capacitor.getPlatform() !== 'web';

  const handlePair = useCallback(async (token) => {
    const trimmed = String(token || manualToken).trim();
    if (!PAIR_TOKEN_REGEX.test(trimmed)) {
      setError('Enter a valid code (e.g. PAIR-ABC12345)');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await apiService.completePairing(trimmed);
      setSuccess(`Added ${res.learnerName}`);
      setManualToken('');
    } catch (err) {
      setError(err?.message ?? 'Pairing failed');
    } finally {
      setLoading(false);
    }
  }, [manualToken]);

  const handleNativeScan = useCallback(async () => {
    if (!isNative) return;
    setLoading(true);
    setError(null);
    try {
      const BarcodeScanner = (await import('@capacitor-community/barcode-scanner')).BarcodeScanner;
      const status = await BarcodeScanner.checkPermissions({ force: true });
      if (status.camera !== 'granted') {
        setError('Camera permission required');
        setLoading(false);
        return;
      }
      document.body.classList.add('scanner-active');
      const result = await BarcodeScanner.startScan();
      document.body.classList.remove('scanner-active');
      if (result?.hasContent && result.content) {
        await handlePair(result.content);
      }
    } catch (err) {
      setError(err?.message ?? 'Scan failed');
    } finally {
      setLoading(false);
    }
  }, [handlePair, isNative]);

  if (user && user.role !== 'parent') {
    return (
      <div className="page-content px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Add learner</h1>
        <p className="text-slate-600 dark:text-slate-400">Only parents can add learners. Ask your learner to generate a pairing code first.</p>
        <button onClick={() => navigate(-1)} className="btn-primary mt-4">← Back</button>
      </div>
    );
  }

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-500 dark:text-slate-400 text-xl p-1">←</button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Add learner</h1>
      </div>

      <p className="text-slate-600 dark:text-slate-400 text-sm">
        Scan the QR code on your learner&apos;s device, or enter the pairing code manually.
      </p>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl p-3 text-green-400 text-sm">
          {success}
          <button
            onClick={() => navigate('/approvals')}
            className="block mt-2 text-green-300 underline"
          >
            Go to Approvals →
          </button>
        </div>
      )}

      {/* Scan options */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 space-y-4 border border-slate-200 dark:border-transparent">
        {isNative ? (
          <button
            onClick={handleNativeScan}
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Scanning…' : 'Scan QR code'}
          </button>
        ) : (
          <WebQrScanner
            onScan={handlePair}
            onError={(msg) => setCameraError(msg)}
          />
        )}
        {cameraError && !isNative && (
          <p className="text-amber-600 dark:text-amber-400 text-sm">{cameraError} Use manual entry below.</p>
        )}

        <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
          <label className="text-slate-600 dark:text-slate-400 text-sm block mb-2">Or enter code manually</label>
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value.toUpperCase())}
            placeholder="PAIR-ABC12345"
            className="input-field w-full font-mono"
            maxLength={13}
          />
          <button
            onClick={() => handlePair()}
            disabled={loading || !manualToken.trim()}
            className="btn-secondary w-full mt-2 disabled:opacity-50"
          >
            {loading ? 'Pairing…' : 'Pair'}
          </button>
        </div>
      </div>
    </div>
  );
}
