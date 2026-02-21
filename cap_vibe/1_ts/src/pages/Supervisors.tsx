import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import type { Supervisor } from '../models/supervisor';

const RELATIONSHIPS = ['Parent', 'Instructor', 'Friend', 'Partner', 'Other'];

function SupervisorForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Supervisor>;
  onSave: (data: Omit<Supervisor, 'id'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [licence, setLicence] = useState(initial?.licenceNumber ?? '');
  const [relationship, setRelationship] = useState(initial?.relationship ?? 'Parent');
  const [saving, setSaving] = useState(false);

  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
      <div>
        <label className="text-slate-400 text-sm block mb-1">Name *</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          placeholder="Full name"
        />
      </div>
      <div>
        <label className="text-slate-400 text-sm block mb-1">Licence number (optional)</label>
        <input
          value={licence}
          onChange={(e) => setLicence(e.target.value)}
          className="input-field"
          placeholder="e.g. NSW123456"
        />
      </div>
      <div>
        <label className="text-slate-400 text-sm block mb-1.5">Relationship</label>
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIPS.map((r) => (
            <button
              key={r}
              onClick={() => setRelationship(r)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                relationship === r
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button
          onClick={async () => {
            if (!name.trim()) return;
            setSaving(true);
            await onSave({
              name: name.trim(),
              licenceNumber: licence.trim() || undefined,
              relationship,
              createdAt: Date.now(),
            });
            setSaving(false);
          }}
          disabled={!name.trim() || saving}
          className="btn-primary flex-1 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

export function Supervisors() {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    apiService.getSupervisors().then((sups) => {
      setSupervisors(sups);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data: Omit<Supervisor, 'id'>) => {
    await apiService.addSupervisor(data);
    setShowAdd(false);
    load();
  };

  const handleEdit = async (data: Omit<Supervisor, 'id'>) => {
    if (!editId) return;
    await apiService.updateSupervisor(editId, data);
    setEditId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    await apiService.deleteSupervisor(id);
    setDeleteId(null);
    load();
  };

  return (
    <div className="page-content px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Supervisors</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-primary-500 text-white px-4 py-2 rounded-xl font-semibold text-sm"
        >
          + Add
        </button>
      </div>

      {showAdd && (
        <SupervisorForm onSave={handleAdd} onCancel={() => setShowAdd(false)} />
      )}

      {loading && <div className="text-slate-400 text-center py-8">Loading…</div>}

      {!loading && supervisors.length === 0 && !showAdd && (
        <div className="text-center py-12 space-y-3">
          <div className="text-5xl">👤</div>
          <p className="text-slate-400">No supervisors added yet.</p>
          <button onClick={() => setShowAdd(true)} className="btn-primary">Add first supervisor</button>
        </div>
      )}

      {supervisors.map((sup) => (
        <div key={sup.id}>
          {editId === sup.id ? (
            <SupervisorForm initial={sup} onSave={handleEdit} onCancel={() => setEditId(null)} />
          ) : (
            <div className="bg-slate-800 rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-white font-semibold">{sup.name}</div>
                  <div className="text-slate-400 text-sm">{sup.relationship}</div>
                  {sup.licenceNumber && (
                    <div className="text-slate-500 text-xs mt-0.5 font-mono">{sup.licenceNumber}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditId(sup.id)} className="text-slate-400 hover:text-white px-2 py-1 text-sm">
                    Edit
                  </button>
                  <button onClick={() => setDeleteId(sup.id)} className="text-red-400 hover:text-red-300 px-2 py-1 text-sm">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
          {deleteId === sup.id && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 space-y-3 mt-2">
              <p className="text-white text-sm">Delete {sup.name}? This cannot be undone.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => handleDelete(sup.id)} className="btn-danger flex-1">Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="h-4" />
    </div>
  );
}
