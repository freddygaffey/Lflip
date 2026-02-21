export interface AccelPoint {
  timestamp: number;
  x: number; // m/s² lateral
  y: number; // m/s² longitudinal
  z: number; // m/s² vertical
}

export type AccelEventType = 'hard_brake' | 'sharp_turn' | 'rapid_acceleration';

export interface AccelEvent {
  type: AccelEventType;
  timestamp: number;
  magnitude: number; // m/s²
  lat?: number;
  lng?: number;
}
