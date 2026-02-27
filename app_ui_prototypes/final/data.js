/** Mock data and constants */

export const USERS = [
  { email: 'demo@lplate.app', password: 'password123', first: 'Alex', last: 'Mitchell', type: 'learner', state: 'NSW' },
  { email: 'parent@lplate.app', password: 'password123', first: 'Sarah', last: 'Mitchell', type: 'parent', state: 'NSW' },
];

export const TRIPS = [
  { id: 1, date: '2026-02-24', startTime: '08:15', duration: 75, distance: 42.3, supervisor: 'Sarah M.', vehicle: "Mum's Corolla", conditions: ['city', 'school'], status: 'approved', night: false },
  { id: 2, date: '2026-02-22', startTime: '18:45', duration: 90, distance: 58.1, supervisor: 'David M.', vehicle: "Dad's Ranger", conditions: ['night', 'highway'], status: 'approved', night: true },
  { id: 3, date: '2026-02-20', startTime: '10:30', duration: 60, distance: 35.7, supervisor: 'Sarah M.', vehicle: "Mum's Corolla", conditions: ['rain', 'city'], status: 'approved', night: false },
  { id: 4, date: '2026-02-18', startTime: '19:00', duration: 45, distance: 28.9, supervisor: 'David M.', vehicle: "Dad's Ranger", conditions: ['night', 'rural'], status: 'pending', night: true },
  { id: 5, date: '2026-02-15', startTime: '14:00', duration: 120, distance: 85.2, supervisor: 'Sarah M.', vehicle: "Mum's Corolla", conditions: ['highway', 'rural'], status: 'approved', night: false },
  { id: 6, date: '2026-02-12', startTime: '20:30', duration: 55, distance: 31.4, supervisor: 'Sarah M.', vehicle: "Mum's Corolla", conditions: ['night', 'city', 'rain'], status: 'approved', night: true },
  { id: 7, date: '2026-02-10', startTime: '09:00', duration: 95, distance: 62.8, supervisor: 'David M.', vehicle: "Dad's Ranger", conditions: ['city', 'highway'], status: 'pending', night: false },
];

export const TOTAL_HRS = 58;
export const NIGHT_HRS = 12;
export const DAY_HRS = TOTAL_HRS - NIGHT_HRS;
export const TOTAL_REQ = 120;
export const NIGHT_REQ = 20;

export const CHATBOT = {
  hours: `To get your P1 licence in NSW, you need <b>120 hours</b> of supervised driving, with at least <b>20 hours at night</b>. You must hold your learner licence for <b>12 months minimum</b> before the driving test.`,
  night: `Night driving in NSW: at least <b>20 hours</b> of your 120 must be at night (sunset to sunrise). You must still be supervised. Record night trips accurately in your logbook.`,
  speed: `Learner drivers in NSW must <b>not exceed 90 km/h</b> regardless of posted limit. <b>Zero blood alcohol</b> at all times.`,
  logbook: `Your NSW logbook must record: <b>Date</b>, <b>start/end times</b>, <b>duration</b>, <b>odometer readings</b>, <b>day/night</b>, <b>supervisor name and signature</b>, <b>road conditions</b>.`,
  lplate: `In NSW, display <b>L-plates front and rear</b> at all times. Must be clearly visible. Remove when a learner is not driving.`,
  supervisor: `Supervising driver must: hold <b>full unrestricted Australian licence</b> for <b>1+ year</b>, sit beside you, <b>BAC under 0.05</b>, be awake and able to take control.`,
  default: `Check the <b>NSW Transport website</b> or call <b>13 22 13</b> for up-to-date learner driver rules.`,
};
