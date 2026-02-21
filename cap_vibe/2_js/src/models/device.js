/**
 * @typedef {'disconnected'|'scanning'|'connecting'|'connected'} ConnectionStatus
 */

/**
 * @typedef {Object} BleDevice
 * @property {string} id
 * @property {string} name
 * @property {number} rssi
 * @property {string} mac
 */

/**
 * @typedef {Object} DeviceInfo
 * @property {string} firmwareVersion
 * @property {string} mac
 * @property {number} batteryPct
 * @property {boolean} sdCardPresent
 * @property {number} sdCardFreeBytes
 * @property {boolean} obd2Connected
 * @property {string} [obd2Protocol]
 */
