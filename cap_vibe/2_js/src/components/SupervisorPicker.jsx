import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api/index.js';

export function SupervisorPicker({ value, onChange }) {
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getSupervisors().then((sups) => {
      setSupervisors(sups);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="text-slate-600 dark:text-slate-400 text-sm text-center py-4">Loading supervisors…</div>;
  }

  if (supervisors.length === 0) {
    return (
      <div className="text-slate-600 dark:text-slate-400 text-sm text-center py-4">
        No supervisors saved yet. Add one in the Supervisors screen.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {supervisors.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.id, s.name)}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
            value === s.id
              ? 'bg-primary-500/20 border border-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-500'
          }`}
        >
          <div className="font-medium">{s.name}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">{s.relationship}</div>
        </button>
      ))}
    </div>
  );
}
