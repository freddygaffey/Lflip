/**
 * @typedef {Object} AccelPoint
 * @property {number} timestamp - unix ms
 * @property {number} x - m/s² lateral
 * @property {number} y - m/s² longitudinal
 * @property {number} z - m/s² vertical
 */

/**
 * @typedef {'hard_brake'|'sharp_turn'|'rapid_acceleration'} AccelEventType
 */

/**
 * @typedef {Object} AccelEvent
 * @property {AccelEventType} type
 * @property {number} timestamp
 * @property {number} magnitude - m/s²
 * @property {number} [lat]
 * @property {number} [lng]
 */
