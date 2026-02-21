/**
 * API Service Interface — mirrors Flask routes.
 * Mock uses in-memory + Preferences; real uses fetch to API_BASE_URL.
 *
 * Auth: login, register
 * Trips: syncTrip, getTrips, getTrip, deleteTrip, approveTrip
 * Supervisors: getSupervisors, addSupervisor, updateSupervisor, deleteSupervisor
 * Cars: getCars, addCar (if multi-car)
 * Stats: getLogbookSummary
 * Device: registerDevice
 */
