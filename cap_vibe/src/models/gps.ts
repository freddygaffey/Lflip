export interface GpsPoint {
  timestamp: number;
  lat: number;
  lng: number;
  speed: number | null;    // m/s from phone GPS (may be null)
  altitude: number | null;
  accuracy: number;        // metres
  heading: number | null;
}
