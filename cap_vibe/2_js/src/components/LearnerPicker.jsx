import React from 'react';
import { useLinkedLearners } from '../hooks/useLinkedLearners.js';

export function LearnerPicker({ value, onChange }) {
  const { learners, loading } = useLinkedLearners();

  if (loading) {
    return <div className="text-slate-600 dark:text-slate-400 text-sm text-center py-4">Loading learners…</div>;
  }

  if (learners.length === 0) {
    return (
      <div className="text-slate-600 dark:text-slate-400 text-sm text-center py-4">
        No linked learners. Link learners in Settings (coming soon).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {learners.map((l) => (
        <button
          key={l.id}
          onClick={() => onChange(l.id, l.name)}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
            value === l.id
              ? 'bg-primary-500/20 border border-primary-500 text-white'
              : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-500'
          }`}
        >
          <div className="font-medium">{l.name}</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">Learner</div>
        </button>
      ))}
    </div>
  );
}
