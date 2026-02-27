/** Parent trip approvals */

import { state } from './state.js';
import { TRIPS } from './data.js';
import { $, toast } from './ui.js';

export function renderApprovals() {
  const pending = TRIPS.filter(t => t.status === 'pending');
  const container = $('approvalsList');
  if (!container) return;
  if (pending.length === 0) {
    container.innerHTML = '<p style="color:var(--text-dim);font-size:14px">No trips pending approval.</p>';
    return;
  }
  container.innerHTML = pending.map(t => {
    const d = new Date(t.date);
    const dateStr = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    const durStr = t.duration >= 60 ? Math.floor(t.duration/60) + 'h ' + (t.duration%60) + 'm' : t.duration + 'm';
    return `<div class="approval-card pending">
      <div class="trip-date">${dateStr} · ${t.startTime}</div>
      <div class="trip-meta" style="margin-top:4px">${t.distance} km · ${durStr} · ${t.vehicle} · ${t.supervisor}</div>
      <div class="approval-actions">
        <button class="approval-btn approve" data-action="approve-trip" data-id="${t.id}">Approve</button>
        <button class="approval-btn reject" data-action="reject-trip" data-id="${t.id}">Reject</button>
      </div>
    </div>`;
  }).join('');
}

export function approveTrip(id) {
  const t = TRIPS.find(tr => tr.id === id);
  if (t) {
    t.status = 'approved';
    toast('Trip approved');
    renderApprovals();
  }
}

export function rejectTrip(id) {
  const t = TRIPS.find(tr => tr.id === id);
  if (t) {
    t.status = 'rejected';
    toast('Trip rejected');
    renderApprovals();
  }
}
