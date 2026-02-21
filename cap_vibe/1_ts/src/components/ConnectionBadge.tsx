import React from 'react';
import type { ConnectionStatus } from '../models/device';

const statusConfig: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
  disconnected: { label: 'Disconnected', color: 'text-gray-400 dark:text-slate-400',  dot: 'bg-gray-400 dark:bg-slate-500' },
  scanning:     { label: 'Scanning…',    color: 'text-amber-500 dark:text-amber-400', dot: 'bg-amber-400 animate-pulse' },
  connecting:   { label: 'Connecting…',  color: 'text-blue-500  dark:text-blue-400',  dot: 'bg-blue-400 animate-pulse' },
  connected:    { label: 'Connected',    color: 'text-green-600 dark:text-green-400', dot: 'bg-green-400' },
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const cfg = statusConfig[status];
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </div>
  );
}
