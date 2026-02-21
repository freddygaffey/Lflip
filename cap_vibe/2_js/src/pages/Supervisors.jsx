import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api/index.js';
import { useSupervisors } from '../context/SupervisorsContext.jsx';

export function Supervisors() {
  const navigate = useNavigate();
  const { supervisors, loading, refresh } = useSupervisors();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [relationship, setRelationship] = useState('Parent');

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    try {
      const sup = await apiService.addSupervisor({
        name: name.trim(),
        licenceNumber: licenceNumber.trim() || undefined,
        relationship,
        createdAt: Date.now(),
      });
      refresh();
      setName('');
      setLicenceNumber('');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supervisor?')) return;
    await apiService.deleteSupervisor(id);
    refresh();
  };

  return (
    <div className="page-content px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-slate-600 dark:text-slate-400 text-xl p-1">←</button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Supervisors</h1>
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 space-y-3">
        <div className="text-slate-700 dark:text-slate-300 font-semibold">Add Supervisor</div>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
        />
        <input
          type="text"
          placeholder="Licence number (optional)"
          value={licenceNumber}
          onChange={(e) => setLicenceNumber(e.target.value)}
          className="input-field"
        />
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          className="input-field"
        >
          <option value="Parent">Parent</option>
          <option value="Instructor">Instructor</option>
          <option value="Friend">Friend</option>
          <option value="Other">Other</option>
        </select>
        <button onClick={handleAdd} disabled={!name.trim() || adding} className="btn-primary w-full">
          {adding ? 'Adding…' : 'Add'}
        </button>
      </div>

      {loading ? (
        <div className="text-slate-600 dark:text-slate-400 text-center py-8">Loading…</div>
      ) : (
        <div className="space-y-2">
          {supervisors.map((s) => (
            <div
              key={s.id}
              className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                <div className="text-slate-600 dark:text-slate-400 text-sm">{s.relationship}</div>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-red-400 text-sm px-3 py-1 rounded"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="h-4" />
    </div>
  );
}
