export interface Obd2Sample {
  timestamp: number;
  vehicleSpeed: number;      // km/h (PID 0x0D)
  rpm: number;               // engine RPM (PID 0x0C)
  engineLoad: number;        // % (PID 0x04)
  coolantTemp?: number;      // °C (PID 0x05)
  throttlePosition?: number; // % (PID 0x11)
  fuelLevel?: number;        // % (PID 0x2F)
}

export interface Obd2TripData {
  tripId: string;
  samples: Obd2Sample[];
  dtcCodes?: string[];
}
