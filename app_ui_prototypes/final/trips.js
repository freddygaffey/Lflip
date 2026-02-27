/** Trip recording, history, modal */

import { state } from './state.js';
import { TRIPS } from './data.js';
import { $, toast, formatTime } from './ui.js';

let activeTripMap = null;
let activeTripMarker = null;
let activeTripPolyline = null;
let tripRoutePoints = [];

export function stopTripWithoutNavigate() {
  if (!state.tripRecording) return;
  state.tripRecording = false;
  clearInterval(state.tripTimer);
  state.tripTimer = null;
  const btn = $('brb');
  const sub = $('brbSub');
  if (btn) { btn.textContent = 'START'; btn.classList.remove('recording'); btn.classList.add('idle'); }
  if (sub) sub.textContent = 'Tap to begin a drive';
  toast('Trip saved — ' + formatTime(state.tripSeconds));
}

export function toggleTrip(navigateTo) {
  const btn = $('brb');
  const sub = $('brbSub');
  if (!state.tripRecording) {
    if (state.tripStopPending) {
      toast('Finish entering odometer to save');
      return;
    }
    state.tripRecording = true;
    state.tripSeconds = 0;
    state.tripDistance = 0;
    state.tripBrakes = 0;
    state.tripStartedAt = Date.now();
    state.tripStopPending = false;
    state.manualOdoEnd = '';
    tripRoutePoints = [];
    if (activeTripPolyline) activeTripPolyline.setLatLngs([]);
    if (btn) { btn.textContent = 'STOP'; btn.classList.remove('idle'); btn.classList.add('recording'); }
    if (sub) sub.textContent = 'Recording — tap STOP when done';
    toast('Trip started');
    navigateTo('activeTripScreen', null);
    state.tripTimer = setInterval(() => updateLiveData(navigateTo), 1000);
  } else {
    // If manual odometer is enabled, ask for end odo before saving.
    if (state.manualOdoEnabled) {
      state.tripStopPending = true;
      state.tripRecording = false;
      clearInterval(state.tripTimer);
      state.tripTimer = null;
      $('odoStopModal')?.classList.add('show');
      setTimeout(() => $('manualOdoEnd')?.focus(), 0);
      return;
    }
    finalizeTripStop(navigateTo);
  }
}

function finalizeTripStop(navigateTo, distanceOverrideKm) {
  clearInterval(state.tripTimer);
  state.tripTimer = null;

  if (typeof distanceOverrideKm === 'number') {
    state.tripDistance = distanceOverrideKm;
  }

  const btn = $('brb');
  const sub = $('brbSub');
  if (btn) { btn.textContent = 'START'; btn.classList.remove('recording'); btn.classList.add('idle'); }
  if (sub) sub.textContent = 'Tap to begin a drive';

  const startedAt = state.tripStartedAt ? new Date(state.tripStartedAt) : new Date();
  const date = startedAt.toISOString().slice(0, 10);
  const startTime = startedAt.toTimeString().slice(0, 5);
  const durationMins = Math.max(1, Math.round(state.tripSeconds / 60));

  const conds = Array.isArray(state.tripConditions) ? state.tripConditions : [];
  const night = conds.includes('night');

  const nextId = Math.max(0, ...TRIPS.map(t => t.id || 0)) + 1;
  TRIPS.unshift({
    id: nextId,
    date,
    startTime,
    duration: durationMins,
    distance: Number(state.tripDistance.toFixed(1)),
    supervisor: state.selectedSupervisor || '—',
    vehicle: state.manualOdoEnabled ? 'Guest vehicle' : (state.selectedVehicle || '—'),
    conditions: conds,
    status: 'pending',
    night,
    odoStart: state.manualOdoEnabled ? state.manualOdoStart : undefined,
    odoEnd: state.manualOdoEnabled ? state.manualOdoEnd : undefined,
    supervisorLicenceNo: state.manualSupervisorEnabled ? state.manualSupervisorLicenceNo : undefined,
  });

  state.tripStopPending = false;
  state.tripStartedAt = null;

  toast('Trip saved — ' + formatTime(state.tripSeconds));
  navigateTo('loggerScreen', document.querySelector('[data-screen="loggerScreen"]'));
}

export function confirmManualOdoStop(navigateTo) {
  const raw = $('manualOdoEnd')?.value?.trim() || '';
  const endOdo = Number(raw);
  const startOdo = Number(state.manualOdoStart);
  if (!raw || !Number.isFinite(endOdo) || endOdo < 0) {
    toast('Enter a valid odometer end');
    $('manualOdoEnd')?.focus();
    return;
  }
  if (!Number.isFinite(startOdo)) {
    toast('Missing start odometer');
    return;
  }
  if (endOdo < startOdo) {
    toast('End odometer must be ≥ start');
    $('manualOdoEnd')?.focus();
    return;
  }
  state.manualOdoEnd = String(endOdo);
  $('odoStopModal')?.classList.remove('show');
  const distanceKm = endOdo - startOdo;
  finalizeTripStop(navigateTo, distanceKm);
}

export function cancelManualOdoStop() {
  // Resume the trip if user cancels.
  $('odoStopModal')?.classList.remove('show');
  state.tripStopPending = false;
  state.tripRecording = true;
  state.tripTimer = setInterval(() => updateLiveData(() => {}), 1000);
  const btn = $('brb');
  const sub = $('brbSub');
  if (btn) { btn.textContent = 'STOP'; btn.classList.remove('idle'); btn.classList.add('recording'); }
  if (sub) sub.textContent = 'Recording — tap STOP when done';
  toast('Trip resumed');
}

export function initActiveTripMap() {
  const container = $('activeTripMap');
  if (!container || !window.L) return;
  if (activeTripMap) {
    activeTripMap.invalidateSize();
    return;
  }
  activeTripMap = L.map('activeTripMap').setView([-33.8688, 151.2093], 15);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(activeTripMap);
  activeTripMarker = L.marker([-33.8688, 151.2093]).addTo(activeTripMap);
  activeTripPolyline = L.polyline([], { color: '#00d4aa', weight: 4 }).addTo(activeTripMap);
  setTimeout(() => activeTripMap?.invalidateSize(), 100);
}

function updateMapPosition(lat, lng) {
  if (!activeTripMarker || !activeTripMap) return;
  activeTripMarker.setLatLng([lat, lng]);
  tripRoutePoints.push([lat, lng]);
  if (activeTripPolyline) activeTripPolyline.setLatLngs(tripRoutePoints);
  activeTripMap.setView([lat, lng], activeTripMap.getZoom());
}

function updateLiveData(navigateTo) {
  state.tripSeconds++;
  const speed = Math.floor(40 + Math.random() * 50);
  state.tripDistance += speed / 3600;
  if (Math.random() < 0.01) state.tripBrakes++;
  const lat = parseFloat((-33.8688 + (Math.random() - 0.5) * 0.01).toFixed(4));
  const lng = parseFloat((151.2093 + (Math.random() - 0.5) * 0.01).toFixed(4));
  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set('activeSpeed', speed);
  set('activeDist', state.tripDistance.toFixed(1));
  set('activeTime', formatTime(state.tripSeconds));
  set('activeBrakes', state.tripBrakes);
  set('activeGpsCoords', lat.toFixed(4) + ', ' + lng.toFixed(4));
  set('activeGpsAcc', (2 + Math.random() * 4).toFixed(1));
  updateMapPosition(lat, lng);
}

export function renderTrips() {
  const filtered = TRIPS.filter(t => {
    if (state.currentFilter === 'approved') return t.status === 'approved';
    if (state.currentFilter === 'pending') return t.status === 'pending';
    if (state.currentFilter === 'night') return t.night;
    return true;
  });
  const container = $('tripList');
  if (!container) return;
  container.innerHTML = filtered.map(t => {
    const d = new Date(t.date);
    const dateStr = d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
    const durStr = t.duration >= 60 ? Math.floor(t.duration/60) + 'h ' + (t.duration%60) + 'm' : t.duration + 'm';
    return `<div class="trip-card" data-action="open-trip-modal" data-id="${t.id}">
      <div class="trip-card-top">
        <div>
          <div class="trip-date">${dateStr} · ${t.startTime}</div>
          <div class="trip-meta">${t.distance} km · ${durStr} · ${t.supervisor}</div>
        </div>
        <span class="trip-badge ${t.status}">${t.status}</span>
      </div>
      <div class="trip-tags">${t.conditions.map(c => `<span class="trip-tag">${c}</span>`).join('')} ${t.night ? '<span class="trip-tag">night</span>' : ''}</div>
    </div>`;
  }).join('');
}

export function filterTrips(el) {
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  state.currentFilter = el.dataset.f;
  renderTrips();
}

export function openTripModal(id) {
  const t = TRIPS.find(tr => tr.id === id);
  if (!t) return;
  const d = new Date(t.date);
  const dateStr = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const durStr = t.duration >= 60 ? Math.floor(t.duration/60) + 'h ' + (t.duration%60) + 'm' : t.duration + 'm';
  const endMins = Math.floor(t.startTime.split(':')[0]) * 60 + parseInt(t.startTime.split(':')[1]) + t.duration;
  const endH = Math.floor(endMins / 60);
  const endM = endMins % 60;
  const endTime = String(endH).padStart(2,'0') + ':' + String(endM).padStart(2,'0');

  const content = $('tripModalContent');
  const modal = $('tripModal');
  if (!content || !modal) return;
  content.innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-title">${dateStr}</div>
    <div class="logbook-view">
      <h3>Logbook format — copy to physical logbook</h3>
      <div class="logbook-row"><span>Date</span><span>${t.date}</span></div>
      <div class="logbook-row"><span>Start time</span><span>${t.startTime}</span></div>
      <div class="logbook-row"><span>End time</span><span>${endTime}</span></div>
      <div class="logbook-row"><span>Duration</span><span>${durStr}</span></div>
      <div class="logbook-row"><span>Distance</span><span>${t.distance} km</span></div>
      <div class="logbook-row"><span>Day/Night</span><span>${t.night ? 'Night' : 'Day'}</span></div>
      <div class="logbook-row"><span>Supervisor</span><span>${t.supervisor}</span></div>
      <div class="logbook-row"><span>Vehicle</span><span>${t.vehicle}</span></div>
      <div class="logbook-row"><span>Conditions</span><span>${t.conditions.join(', ')}</span></div>
      <div class="logbook-row"><span>Status</span><span>${t.status}</span></div>
    </div>
  `;
  modal.classList.add('show');
}

export function closeTripModal() {
  $('tripModal')?.classList.remove('show');
}
