/**
 * Event delegation - single click listener on #app
 * Replaces inline onclick handlers with data-action attributes
 */

export function initEventDelegation(handlers) {
  const app = document.getElementById('app');
  if (!app) return;

  app.addEventListener('click', (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    switch (action) {
      case 'login':
        e.preventDefault();
        handlers.handleLogin();
        break;
      case 'register':
        e.preventDefault();
        handlers.handleRegister();
        break;
      case 'demo-login':
        e.preventDefault();
        handlers.demoLogin(actionEl.dataset.type || 'learner');
        break;
      case 'show-auth':
        e.preventDefault();
        handlers.showAuth(actionEl.dataset.screen || 'loginScreen');
        break;
      case 'brb':
        e.preventDefault();
        handlers.handleBRB();
        break;
      case 'navigate':
        e.preventDefault();
        const screenId = actionEl.dataset.screen;
        const navEl = actionEl.classList.contains('nav-item') ? actionEl : document.querySelector('.nav-item[data-screen="' + screenId + '"]');
        handlers.navigateTo(screenId, navEl);
        break;
      case 'open-pre-trip':
        e.preventDefault();
        handlers.openPreTripModal();
        break;
      case 'filter-trips':
        e.preventDefault();
        handlers.filterTrips(actionEl);
        break;
      case 'open-trip-modal':
        e.preventDefault();
        handlers.openTripModal(Number(actionEl.dataset.id));
        break;
      case 'close-modal':
        if (e.target === actionEl) {
          const modalId = actionEl.dataset.modalId;
          if (modalId === 'preTripModal') handlers.closePreTripModal();
          else if (modalId === 'tripModal') handlers.closeTripModal();
        }
        break;
      case 'approve-trip':
        e.preventDefault();
        handlers.approveTrip(Number(actionEl.dataset.id));
        break;
      case 'reject-trip':
        e.preventDefault();
        handlers.rejectTrip(Number(actionEl.dataset.id));
        break;
      case 'send-chat':
        e.preventDefault();
        handlers.sendChat();
        break;
      case 'ask-question':
        e.preventDefault();
        handlers.askQuestion(actionEl.textContent);
        break;
      case 'toggle-theme':
        e.preventDefault();
        handlers.toggleTheme();
        break;
      case 'toast-demo':
        e.preventDefault();
        handlers.toast('Demo only');
        break;
      case 'sign-out':
        e.preventDefault();
        handlers.signOut();
        break;
      case 'scan-esp':
        e.preventDefault();
        handlers.scanForEsp();
        break;
      case 'save-vehicle':
        e.preventDefault();
        handlers.saveVehicleFromForm();
        break;
      case 'toggle-vehicle-esp':
        e.preventDefault();
        handlers.toggleVehicleEspPairing(Number(actionEl.dataset.index));
        break;
      case 'finish-esp-pairing':
        e.preventDefault();
        handlers.finishEspPairing();
        break;
      case 'toggle-esp-pairing-screen':
        e.preventDefault();
        handlers.toggleEspPairingFromScreen();
        break;
      case 'close-pre-trip':
        e.preventDefault();
        handlers.closePreTripModal();
        break;
      case 'add-vehicle':
        e.preventDefault();
        handlers.closePreTripModal();
        handlers.navigateTo('vehiclesScreen', null);
        break;
      case 'select-quick':
        e.preventDefault();
        handlers.selectQuick(actionEl, actionEl.dataset.type || 'vehicle');
        break;
      case 'toggle-condition':
        e.preventDefault();
        handlers.toggleCondition(actionEl);
        break;
      case 'start-drive':
        e.preventDefault();
        handlers.startDriveFromModal();
        break;
      case 'toggle-vehicle-more':
        e.preventDefault();
        handlers.toggleVehicleMoreOptions();
        break;
      case 'toggle-trip':
        e.preventDefault();
        handlers.toggleTrip();
        break;
      case 'confirm-odo-stop':
        e.preventDefault();
        handlers.confirmOdoStop();
        break;
      case 'cancel-odo-stop':
        e.preventDefault();
        handlers.cancelOdoStop();
        break;
      default:
        break;
    }
  });

  // Enter key for chat input
  app.addEventListener('keydown', (e) => {
    if (e.target.id === 'chatInput' && e.key === 'Enter') {
      handlers.sendChat();
    }
  });
}
