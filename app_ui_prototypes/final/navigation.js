/** Screen navigation - split into single-responsibility functions */

import { state } from './state.js';
import { $ } from './ui.js';

/** Only toggles .active on screens */
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = $(screenId);
  if (target) target.classList.add('active');
}

/** Updates nav items and visibility */
function updateNavState(screenId, navEl) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  const nav = $('bottomNav');
  if (['vehiclesScreen', 'espPairingScreen', 'activeTripScreen'].includes(screenId)) {
    nav?.classList.add('hidden');
  } else {
    nav?.classList.remove('hidden');
  }
}

/** Runs screen-specific setup when entering */
function onScreenEnter(screenId, deps) {
  const {
    renderVehiclesList,
    initActiveTripMap,
  } = deps;

  if (screenId === 'vehiclesScreen') {
    renderVehiclesList();
    const stateSelect = $('vehicleState');
    if (stateSelect && state.currentUser?.state) stateSelect.value = state.currentUser.state;
  } else if (screenId === 'activeTripScreen') {
    initActiveTripMap();
  }
}

export function createNavigateTo(deps) {
  const {
    renderVehiclesList,
    initActiveTripMap,
    stopTripWithoutNavigate,
  } = deps;

  return function navigateTo(screenId, navEl) {
    if (screenId === 'activeTripScreen' && !state.tripRecording) {
      screenId = 'loggerScreen';
      navEl = document.querySelector('[data-screen="loggerScreen"]');
    }
    if (state.tripRecording && screenId !== 'activeTripScreen') {
      stopTripWithoutNavigate();
    }
    showScreen(screenId);
    updateNavState(screenId, navEl);
    onScreenEnter(screenId, { renderVehiclesList, initActiveTripMap });
  };
}
