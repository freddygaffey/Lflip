/**
 * @typedef {'sunny'|'overcast'|'rain'|'night'} WeatherCondition
 */

/**
 * @typedef {'pending'|'active'|'stopped'|'complete'} TripStatus
 */

/**
 * @typedef {'unsynced'|'syncing'|'synced'|'error'} SyncStatus
 */

/**
 * @typedef {'pending'|'approved'|'rejected'} ApprovalState
 */

/**
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} [cloudId]
 * @property {string} supervisorId
 * @property {string} supervisorName
 * @property {number} startTime - unix ms
 * @property {number} [endTime] - unix ms
 * @property {number} startOdometer - km
 * @property {number} [endOdometer] - km
 * @property {TripStatus} status
 * @property {SyncStatus} syncStatus
 * @property {ApprovalState} [approvalState]
 * @property {string} [approvedBy]
 * @property {number} [approvedAt]
 * @property {WeatherCondition} weather
 * @property {import('./gps.js').GpsPoint[]} gpsPoints
 * @property {import('./accel.js').AccelPoint[]} accelPoints
 * @property {import('./accel.js').AccelEvent[]} accelEvents
 * @property {number} [distanceKm]
 * @property {number} [odoDistanceKm]
 * @property {number} [dayMinutes]
 * @property {number} [nightMinutes]
 * @property {number} [maxSpeedKmh]
 * @property {number} [avgSpeedKmh]
 * @property {number} [startLat]
 * @property {number} [startLng]
 * @property {'esp32'|'manual'} [odoSource] - where odometer came from
 */

/**
 * @typedef {Object} TripStartConfig
 * @property {string} tripId
 * @property {number} startTime - unix ms
 * @property {number} [startOdometer] - passed to ESP32 for odometer sync
 */

/**
 * @typedef {Object} LogbookSummary
 * @property {number} totalHours
 * @property {number} dayHours
 * @property {number} nightHours
 * @property {number} tripCount
 * @property {number} targetHours
 * @property {number} nightTargetHours
 * @property {number} [lastTripDate]
 */

/**
 * @typedef {Object} TripFilters
 * @property {string} [supervisorId]
 * @property {number} [dateFrom]
 * @property {number} [dateTo]
 * @property {boolean} [nightOnly]
 * @property {boolean} [dayOnly]
 */

/**
 * @typedef {Object} AuthToken
 * @property {string} token
 * @property {string} userId
 * @property {string} name
 */
