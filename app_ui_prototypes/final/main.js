/**
 * L-Plate Logger - Main entry point
 * Wires up modules and uses event delegation (data-action)
 */

import { state } from './state.js';
import { initEventDelegation } from './events.js';
import { showAuth, handleLogin as authLogin, handleRegister as authRegister, demoLogin as authDemoLogin, updateUserUI, applyRoleUI } from './auth.js';
import { renderProgressMini, renderPieCharts } from './progress.js';
import { renderTrips, filterTrips, openTripModal, closeTripModal, toggleTrip, stopTripWithoutNavigate, initActiveTripMap, confirmManualOdoStop, cancelManualOdoStop } from './trips.js';
import { renderApprovals, approveTrip, rejectTrip } from './approvals.js';
import { toast, toggleTheme as uiToggleTheme } from './ui.js';
import { createNavigateTo } from './navigation.js';
import {
  renderVehicleSelect,
  renderVehiclesList,
  toggleVehicleMoreOptions,
  toggleVehicleEspPairing,
  scanForEsp,
  showEspPairingForVehicle,
  finishEspPairing,
  toggleEspPairingFromScreen,
  saveVehicleFromForm,
  closePreTripModal,
  selectQuick,
  toggleCondition,
} from './vehicles.js';
import { sendChat, askQuestion } from './chatbot.js';

// Create navigateTo with dependencies
const navigateTo = createNavigateTo({
  renderVehiclesList,
  initActiveTripMap,
  stopTripWithoutNavigate,
});

// Wrap vehicle/trip functions that need navigateTo
function startDriveFromModalWired() {
  // Capture selected conditions at start (for history/logbook)
  state.tripConditions = Array.from(document.querySelectorAll('#conditionPills .condition-pill.active'))
    .map(el => el.dataset.c)
    .filter(Boolean);

  if (state.manualOdoEnabled) {
    const raw = document.getElementById('manualOdoStart')?.value?.trim() || '';
    const odo = Number(raw);
    if (!raw || !Number.isFinite(odo) || odo < 0) {
      toast('Enter a valid odometer start');
      document.getElementById('manualOdoStart')?.focus();
      return;
    }
    state.manualOdoStart = String(odo);
  }
  if (state.manualSupervisorEnabled) {
    const name = document.getElementById('manualSupervisorName')?.value?.trim() || '';
    if (!name) {
      toast('Enter supervising driver name');
      document.getElementById('manualSupervisorName')?.focus();
      return;
    }
    const licenceNo = document.getElementById('manualSupervisorLicenceNo')?.value?.trim() || '';
    if (!licenceNo) {
      toast('Enter supervising driver licence number');
      document.getElementById('manualSupervisorLicenceNo')?.focus();
      return;
    }
    state.manualSupervisorName = name;
    state.manualSupervisorLicenceNo = licenceNo;
    state.selectedSupervisor = name;
  }
  closePreTripModal();
  toggleTrip(navigateTo);
}

function handleBRB() {
  if (state.tripRecording) {
    toggleTrip(navigateTo);
    return;
  }
  openPreTripModal();
}

function openPreTripModal() {
  renderVehicleSelect();
  document.getElementById('preTripModal')?.classList.add('show');
}

function enterApp() {
  document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
  document.getElementById('bottomNav')?.classList.remove('hidden');
  updateUserUI();
  applyRoleUI();
  renderProgressMini();
  renderPieCharts();
  renderTrips();
  renderApprovals();
  const isParent = state.currentUser?.type === 'parent';
  if (isParent) navigateTo('approvalsScreen', document.getElementById('navApprovals'));
  else navigateTo('loggerScreen', document.querySelector('[data-screen="loggerScreen"]'));
}

function handleLogin() {
  const user = authLogin();
  if (user) enterApp();
}

function handleRegister() {
  const user = authRegister();
  if (user) enterApp();
}

function demoLogin(type) {
  authDemoLogin(type);
  enterApp();
}

function signOut() {
  state.currentUser = null;
  sessionStorage.removeItem('lplate_user');
  if (state.tripRecording) toggleTrip(navigateTo);
  document.getElementById('bottomNav')?.classList.add('hidden');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  showAuth('loginScreen');
  toast('Signed out');
}

function toggleTheme() {
  state.isDark = !state.isDark;
  uiToggleTheme(state);
}

function saveVehicleFromFormWired() {
  saveVehicleFromForm(navigateTo, renderVehiclesList, renderVehicleSelect, (i) => showEspPairingForVehicle(i));
}

function finishEspPairingWired() {
  finishEspPairing(navigateTo, renderVehiclesList);
}

function approveTripWired(id) {
  approveTrip(id);
  renderTrips();
}

function toggleVehicleEspPairingWired(index) {
  toggleVehicleEspPairing(index, renderVehiclesList);
}

// Event delegation - single click listener on #app
initEventDelegation({
  showAuth,
  handleLogin,
  handleRegister,
  demoLogin,
  signOut,
  navigateTo,
  handleBRB,
  openPreTripModal,
  closePreTripModal,
  selectQuick,
  toggleCondition,
  startDriveFromModal: startDriveFromModalWired,
  toggleTrip: () => toggleTrip(navigateTo),
  filterTrips,
  openTripModal,
  closeTripModal,
  approveTrip: approveTripWired,
  rejectTrip,
  sendChat,
  askQuestion,
  toast,
  toggleTheme,
  toggleVehicleMoreOptions,
  toggleVehicleEspPairing: toggleVehicleEspPairingWired,
  scanForEsp,
  finishEspPairing: finishEspPairingWired,
  toggleEspPairingFromScreen,
  saveVehicleFromForm: saveVehicleFromFormWired,
  confirmOdoStop: () => confirmManualOdoStop(navigateTo),
  cancelOdoStop: cancelManualOdoStop,
});

// Init
(function init() {
  const saved = sessionStorage.getItem('lplate_user');
  if (saved) {
    try {
      state.currentUser = JSON.parse(saved);
      enterApp();
    } catch (_) {}
  }

  const theme = localStorage.getItem('lplate_theme');
  if (theme === 'light') {
    state.isDark = false;
    document.documentElement.setAttribute('data-theme', 'light');
    const t = document.getElementById('themeToggle');
    if (t) t.classList.add('on');
  }

  const savedVehicles = localStorage.getItem('lplate_vehicles');
  if (savedVehicles) {
    try {
      const parsed = JSON.parse(savedVehicles);
      state.vehicles = parsed.map(v => typeof v === 'string' ? { name: v, plate: '', state: 'NSW', rego: '', espPaired: false } : v);
      if (!state.vehicles.some(v => (v.name || v) === state.selectedVehicle)) {
        state.selectedVehicle = state.vehicles[0]?.name || '';
      }
    } catch (_) {}
  }

  // Hash-based preview for gallery
  const params = new URLSearchParams(location.search);
  const themeParam = params.get('theme');
  if (themeParam === 'light' || themeParam === 'dark') {
    document.documentElement.setAttribute('data-theme', themeParam);
    localStorage.setItem('lplate_theme', themeParam);
  }
  const h = (location.hash || '').slice(1);
  const map = { logger: 'loggerScreen', history: 'historyScreen', chat: 'chatScreen', settings: 'settingsScreen', approvals: 'approvalsScreen' };
  if (map[h]) {
    demoLogin('learner');  // demoLogin calls enterApp internally
    setTimeout(() => {
      const navEl = document.querySelector('.nav-item[data-screen="' + map[h] + '"]');
      navigateTo(map[h], navEl || null);
    }, 600);
  }
})();
