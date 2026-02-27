/** Vehicles, ESP pairing, pre-trip modal */

import { state } from './state.js';
import { $, toast } from './ui.js';

const MANUAL_ODO_KEY = '__manual_odo__';
const MANUAL_SUPERVISOR_KEY = '__manual_supervisor__';

function getVehicleName(v) {
  return typeof v === 'string' ? v : v.name;
}

function renderManualOdoRow() {
  const selected = state.manualOdoEnabled ? ' selected' : '';
  const value = state.manualOdoStart || '';
  return `
    <div class="quick-select-item${selected}" data-action="select-quick" data-type="vehicle" data-v="${MANUAL_ODO_KEY}">
      <div class="label">Guest</div>
      <div class="val">Manual odometer</div>
    </div>
    <div class="manual-odo-row ${state.manualOdoEnabled ? '' : 'hidden'}" id="manualOdoRow">
      <div class="form-group" style="margin:0">
        <label>Odometer start (km)</label>
        <input class="form-input" id="manualOdoStart" inputmode="numeric" placeholder="e.g. 123456" value="${String(value).replace(/\"/g, '&quot;')}">
      </div>
      <div class="manual-odo-hint">Tip: choose this if you’re not using ESP speed tracking.</div>
    </div>
  `;
}

function syncManualOdoVisibility() {
  $('manualOdoRow')?.classList.toggle('hidden', !state.manualOdoEnabled);
}

function syncManualSupervisorVisibility() {
  $('manualSupervisorRow')?.classList.toggle('hidden', !state.manualSupervisorEnabled);
}

export function renderVehicleSelect() {
  const grid = $('vehicleSelect');
  const moreTrigger = $('vehicleMoreTrigger');
  const moreOptions = $('vehicleMoreOptions');
  if (!grid) return;
  const vehicles = state.vehicles;
  const recent = vehicles.slice(0, 2);
  const rest = vehicles.slice(2);
  grid.innerHTML = recent.map(v => {
    const name = getVehicleName(v);
    const sel = name === state.selectedVehicle ? ' selected' : '';
    return `<div class="quick-select-item${sel}" data-v="${name.replace(/"/g, '&quot;')}" data-action="select-quick" data-type="vehicle"><div class="label">Vehicle</div><div class="val">${name}</div></div>`;
  }).join('');
  if (moreTrigger) {
    // Always show "More options" so Guest/manual odometer is reachable,
    // even when there are no extra vehicles beyond the first 2.
    moreTrigger.style.display = '';
    moreTrigger.textContent = rest.length > 0 ? 'More options (' + rest.length + ')' : 'More options';
  }
  if (moreOptions) {
    moreOptions.classList.remove('expanded');
    moreOptions.innerHTML = rest.map(v => {
      const name = getVehicleName(v);
      const sel = name === state.selectedVehicle ? ' selected' : '';
      return `<div class="quick-select-item${sel}" data-action="select-quick" data-type="vehicle" data-v="${name.replace(/"/g, '&quot;')}"><div class="label">Vehicle</div><div class="val">${name}</div></div>`;
    }).join('') + renderManualOdoRow();
  }
}

export function toggleVehicleMoreOptions() {
  $('vehicleMoreOptions')?.classList.toggle('expanded');
}

export function toggleVehicleEspPairing(index, renderVehiclesList) {
  const v = state.vehicles[index];
  if (!v) return;
  v.espPaired = !v.espPaired;
  localStorage.setItem('lplate_vehicles', JSON.stringify(state.vehicles));
  renderVehiclesList();
  toast(v.espPaired ? 'ESP paired with ' + getVehicleName(v) : 'ESP unpaired');
}

export function scanForEsp() {
  toast('Scanning for ESP devices...');
  setTimeout(() => toast('Demo: No new devices found. Use the Pair ESP toggle on each car above.'), 1500);
}

export function showEspPairingForVehicle(index) {
  const v = state.vehicles[index];
  if (!v) return;
  const summary = $('espPairingCarSummary');
  const status = $('espPairingStatus');
  const actions = $('espPairingActions');
  const statusText = $('espStatusText');
  const spinner = $('espSpinner');
  const toggle = $('espPairingToggle');
  if (summary) summary.innerHTML = `<div class="car-name">Pair ESP with ${getVehicleName(v)}</div><div class="car-details">${v.plate || '—'} · ${v.state || '—'}</div>`;
  if (status) { status.style.display = ''; status.classList.remove('success'); }
  if (actions) actions.style.display = 'none';
  if (statusText) statusText.textContent = 'Searching for ESP devices...';
  if (spinner) spinner.className = 'esp-spinner';
  runMockEspConnect(index);
}

function runMockEspConnect(index) {
  const v = state.vehicles[index];
  if (!v) return;
  const status = $('espPairingStatus');
  const statusText = $('espStatusText');
  const actions = $('espPairingActions');
  const toggle = $('espPairingToggle');
  setTimeout(() => {
    if (statusText) statusText.textContent = 'Connecting to ESP-' + (v.plate || 'XXXX').replace(/-/g, '') + '...';
  }, 1000);
  setTimeout(() => {
    if (status) status.classList.add('success');
    if (statusText) statusText.textContent = 'Paired successfully!';
    v.espPaired = true;
    localStorage.setItem('lplate_vehicles', JSON.stringify(state.vehicles));
    if (actions) actions.style.display = 'block';
    if (toggle) toggle.classList.add('on');
  }, 2500);
}

export function finishEspPairing(navigateTo, renderVehiclesList) {
  state.espPairingVehicleIndex = -1;
  navigateTo('vehiclesScreen', null);
  renderVehiclesList();
}

export function toggleEspPairingFromScreen() {
  if (state.espPairingVehicleIndex < 0) return;
  const v = state.vehicles[state.espPairingVehicleIndex];
  if (!v) return;
  v.espPaired = !v.espPaired;
  localStorage.setItem('lplate_vehicles', JSON.stringify(state.vehicles));
  const toggle = $('espPairingToggle');
  if (toggle) toggle.classList.toggle('on', v.espPaired);
  toast(v.espPaired ? 'ESP paired' : 'ESP unpaired');
}

export function renderVehiclesList() {
  const list = $('vehiclesList');
  if (!list) return;
  if (state.vehicles.length === 0) {
    list.innerHTML = '<p style="color:var(--text-dim);font-size:14px;margin:0 16px 24px">No cars yet. Add one below.</p>';
    return;
  }
  list.innerHTML = state.vehicles.map((v, i) => {
    const name = getVehicleName(v);
    const plate = v.plate || '—';
    const stateVal = v.state || '—';
    const toggleClass = v.espPaired ? 'toggle on' : 'toggle';
    return `<div class="vehicle-card">
      <div class="vehicle-name">${name}</div>
      <div class="vehicle-details"><span>${plate}</span><span>${stateVal}</span></div>
      <div class="vehicle-esp-row">
        <span style="font-size:13px;color:var(--text-dim)">Pair ESP</span>
        <div class="${toggleClass}" data-action="toggle-vehicle-esp" data-index="${i}"></div>
      </div>
    </div>`;
  }).join('');
}

export function saveVehicleFromForm(navigateTo, renderVehiclesList, renderVehicleSelect, showEspPairingForVehicle) {
  const name = $('vehicleName')?.value.trim() || '';
  const plate = $('vehiclePlate')?.value.trim() || '';
  const stateVal = $('vehicleState')?.value || 'NSW';
  if (!name) { toast('Enter a nickname'); return; }
  if (state.vehicles.some(v => getVehicleName(v) === name)) { toast('Nickname already exists'); return; }
  const rego = plate.replace(/-/g, '');
  state.vehicles.push({ name, plate, state: stateVal, rego, espPaired: false });
  state.selectedVehicle = name;
  localStorage.setItem('lplate_vehicles', JSON.stringify(state.vehicles));
  $('vehicleName').value = '';
  $('vehiclePlate').value = '';
  renderVehiclesList();
  renderVehicleSelect();
  toast('Car added. Pair ESP to track speed?');
  state.espPairingVehicleIndex = state.vehicles.length - 1;
  navigateTo('espPairingScreen', null);
  showEspPairingForVehicle(state.espPairingVehicleIndex);
}

export function closePreTripModal() {
  $('preTripModal')?.classList.remove('show');
  const sub = $('brbSub');
  if (sub) sub.textContent = 'Tap START to begin';
}

export function selectQuick(el, type) {
  if (type === 'vehicle') {
    const v = el.dataset.v;
    state.manualOdoEnabled = v === MANUAL_ODO_KEY;
    if (!state.manualOdoEnabled) {
      state.selectedVehicle = v;
      state.manualOdoStart = '';
    }
    document.querySelectorAll('#vehicleSelect .quick-select-item, #vehicleMoreOptions .quick-select-item').forEach(i => {
      if (state.manualOdoEnabled) i.classList.toggle('selected', i.dataset.v === MANUAL_ODO_KEY);
      else i.classList.toggle('selected', i.dataset.v === state.selectedVehicle);
    });
    syncManualOdoVisibility();
    if (state.manualOdoEnabled) setTimeout(() => $('manualOdoStart')?.focus(), 0);
  } else {
    el.parentElement.querySelectorAll('.quick-select-item').forEach(i => i.classList.remove('selected'));
    el.classList.add('selected');
    if (type === 'supervisor') {
      const v = el.dataset.v;
      state.manualSupervisorEnabled = v === MANUAL_SUPERVISOR_KEY;
      if (state.manualSupervisorEnabled) {
        state.selectedSupervisor = 'Guest';
        syncManualSupervisorVisibility();
        setTimeout(() => $('manualSupervisorName')?.focus(), 0);
      } else {
        state.manualSupervisorName = '';
        state.manualSupervisorLicenceNo = '';
        state.selectedSupervisor = v;
        syncManualSupervisorVisibility();
      }
    }
  }
}

export function toggleCondition(el) {
  el.classList.toggle('active');
}
