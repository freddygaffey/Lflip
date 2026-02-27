/** Centralized application state */

export const state = {
  currentUser: null,
  tripRecording: false,
  tripTimer: null,
  tripSeconds: 0,
  tripDistance: 0,
  tripBrakes: 0,
  tripStartedAt: null,
  tripConditions: [],
  tripStopPending: false,
  currentFilter: 'all',
  isDark: true,
  selectedVehicle: "Mum's Corolla",
  selectedSupervisor: 'Sarah M.',
  manualOdoEnabled: false,
  manualOdoStart: '',
  manualOdoEnd: '',
  manualSupervisorEnabled: false,
  manualSupervisorName: '',
  manualSupervisorLicenceNo: '',
  vehicles: [
    { name: "Mum's Corolla", plate: "ABC-123", state: "NSW", rego: "ABC123", espPaired: false },
    { name: "Dad's Ranger", plate: "XYZ-456", state: "NSW", rego: "XYZ456", espPaired: true },
  ],
  espPairingVehicleIndex: -1,
};
