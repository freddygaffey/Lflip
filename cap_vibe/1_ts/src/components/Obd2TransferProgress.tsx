import React from 'react';

interface Props {
  progress: number; // 0-100
  onSkip: () => void;
}

export function Obd2TransferProgress({ progress, onSkip }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-transparent rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-xl">
          📡
        </div>
        <div>
          <div className="text-gray-900 dark:text-white font-semibold">Receiving OBD2 Data</div>
          <div className="text-gray-500 dark:text-slate-400 text-sm">Transferring from ESP32 over BLE…</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Transfer progress</span>
          <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button onClick={onSkip} className="btn-ghost w-full text-center text-sm">
        Skip (trip still saved without OBD2 data)
      </button>
    </div>
  );
}
