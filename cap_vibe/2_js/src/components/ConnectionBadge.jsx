import React from 'react';

const statusConfig = {
  disconnected: { label: 'Disconnected', color: 'text-slate-400', dot: 'bg-slate-500' },
  scanning: { label: 'Scanning…', color: 'text-amber-400', dot: 'bg-amber-400 animate-pulse' },
  connecting: { label: 'Connecting…', color: 'text-blue-400', dot: 'bg-blue-400 animate-pulse' },
  connected: { label: 'Connected', color: 'text-green-400', dot: 'bg-green-400' },
};

export function ConnectionBadge({ status }) {
  const cfg = statusConfig[status] ?? statusConfig.disconnected;
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
}
