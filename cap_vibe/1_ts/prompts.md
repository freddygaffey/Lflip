# L-Plate Tracker — Capacitor Native App (Vibe Code Prompt)

## Project Overview

Build a **Capacitor** native mobile app (iOS/Android) for tracking NSW learner driver logbook hours. The **phone is the primary data logger** — it records GPS and accelerometer data using its own native sensors throughout the trip. The app connects via **Bluetooth Low Energy (BLE)** to an ESP32-C3 in the car which is plugged into the car's **OBD2 port**. The phone sends a "start" command to the ESP32 over BLE at trip start, and at the end of the trip the ESP32 transfers all the OBD2 data it collected (speed, RPM, engine data, etc.) back to the phone over BLE.

**Data flow summary:**
- **Phone logs during trip:** GPS coordinates, accelerometer, timestamps (using native Capacitor plugins)
- **ESP32 logs during trip:** OBD2 data (vehicle speed, RPM, engine load, coolant temp, etc.)
- **At trip end:** ESP32 sends its OBD2 data dump to the phone over BLE. The phone merges both datasets into one complete trip record.

**Key constraint:** The BLE connection, OBD2 data transfer, and API backend do not exist yet. **Mock all three** so development can proceed on the app UI and logic independently. The mocks must be easy to swap out for real implementations later.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | **Ionic + React** (or React standalone + Capacitor) |
| Native runtime | **Capacitor 6+** |
| Language | **TypeScript** |
| State management | React Context or Zustand (keep it simple) |
| Routing | React Router |
| Styling | Tailwind CSS or Ionic components |
| BLE | `@capacitor-community/bluetooth-le` (mocked for now) |
| GPS | `@capacitor/geolocation` (real during dev, works in emulator) |
| Motion | `@capacitor/motion` (accelerometer — real during dev) |
| HTTP | `@capacitor/http` or fetch (mocked for now) |
| Local storage | `@capacitor/preferences` or SQLite via `@capacitor-community/sqlite` |
| Build | Vite + Capacitor CLI |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                Mobile App (Capacitor)                │
│                                                     │
│  ┌────────────────────────────────────────────────┐ │
│  │            Native Sensor Services              │ │
│  │  ┌──────────────┐  ┌───────────────────────┐  │ │
│  │  │ GPS Logger   │  │ Accelerometer Logger  │  │ │
│  │  │ (real phone  │  │ (real phone sensor)   │  │ │
│  │  │  sensor)     │  │                       │  │ │
│  │  └──────────────┘  └───────────────────────┘  │ │
│  └────────────────────────────────────────────────┘ │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌────────┐           │
│  │  Screens  │  │  Hooks   │  │ State  │           │
│  └────┬─────┘  └────┬─────┘  └───┬────┘           │
│       │              │            │                 │
│  ┌────▼──────────────▼────────────▼──────────────┐ │
│  │              Service Layer                     │ │
│  │  ┌─────────────┐ ┌──────────┐ ┌────────────┐ │ │
│  │  │ BLE Service │ │ API Svc  │ │ Sensor Svc │ │ │
│  │  │ (interface)  │ │(interface)│ │ (GPS+Accel)│ │ │
│  │  └──────┬──────┘ └────┬─────┘ └────────────┘ │ │
│  │         │              │                      │ │
│  │  ┌──────▼──────┐ ┌────▼──────┐               │ │
│  │  │ Mock BLE    │ │ Mock API  │               │ │
│  │  │ + Mock OBD2 │ │(swap later│               │ │
│  │  │ (swap later)│ │           │               │ │
│  │  └─────────────┘ └───────────┘               │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

         BLE                    
          │                     
    ┌─────▼─────┐              
    │  ESP32-C3 │              
    │  ┌──────┐ │              
    │  │ OBD2 │ │              
    │  │Reader│ │              
    │  └──┬───┘ │              
    └─────┼─────┘              
          │                     
    ┌─────▼─────┐              
    │  Car OBD2 │              
    │   Port    │              
    └───────────┘              
```

### Critical Design Rule: Interface-first mocking

Every external dependency (BLE, API) **must** be behind a TypeScript interface. Create:

```
src/
  services/
    ble/
      ble.interface.ts      ← IBleService interface
      ble.mock.ts           ← MockBleService (fake data, timers)
      ble.real.ts           ← RealBleService (implement later)
      index.ts              ← exports current implementation
    api/
      api.interface.ts      ← IApiService interface
      api.mock.ts           ← MockApiService (in-memory + localStorage)
      api.real.ts           ← RealApiService (implement later)
      index.ts              ← exports current implementation
```

A single flag (`USE_MOCK = true`) in a config file switches between mock and real implementations. **No mock logic should leak into UI components.**

---

## Screens & Features

### 1. Dashboard (Home)
- Current trip status (idle / recording / paused)
- Big START / STOP button
- If recording: live elapsed time, current speed (from mock BLE), distance
- Summary cards:
  - Total hours logged (day + night breakdown)
  - Hours remaining to reach 120 hours (NSW requirement)
  - Number of trips completed
- Quick-access to recent trips

### 2. Start Trip Flow
- Select supervising driver from saved list (or add new)
- Confirm weather condition (sunny, rain, overcast, night)
- Confirm odometer reading (manual input, prefilled with last known value)
- Tap "Start" → sends start command to ESP32 via BLE → begins trip timer
- App receives periodic BLE updates: GPS coords, speed, accelerometer summary

### 3. Active Trip View
- Live map showing route (polyline drawn from phone GPS data, e.g. Leaflet or Google Maps via Capacitor plugin)
- Elapsed time (updates every second)
- Current speed (from phone GPS — OBD2 speed comes later)
- Distance driven (calculated from GPS points using haversine)
- Day/Night indicator (based on local sunrise/sunset or time)
- BLE connection status indicator (show if ESP32 is still connected)
- STOP button (with confirmation dialog)

### 4. Stop Trip Flow
- Confirm end odometer reading
- **OBD2 data transfer phase**: after stopping, the app requests OBD2 data from ESP32 over BLE
  - Show transfer progress bar (0-100%)
  - Allow "Skip" if transfer fails (trip still valid without OBD2 data)
  - On success: merge OBD2 data with phone-logged GPS/accel data
- Auto-calculate distance (odo end - odo start) and cross-check with GPS distance
- Trip summary shown:
  - Date, start time, end time
  - Duration (hours:minutes)
  - Distance (km) — GPS vs odometer comparison
  - Day vs night hours
  - Supervisor name
  - Weather
  - Route map thumbnail
  - OBD2 data status (received / skipped / failed)
- Save trip → pushes to local DB and queues for API sync

### 5. Trip History / Logbook
- Scrollable list of all trips, sorted newest first
- Each trip card shows: date, duration, distance, supervisor, day/night tag
- Tap a trip → Trip Detail screen with full map, stats, accelerometer highlights
- Filter by: supervisor, date range, day/night
- Running total at top: X hours day, Y hours night, Z total

### 6. Trip Detail
- Full route map
- Speed over time chart — **dual line**: GPS speed (phone) vs OBD2 vehicle speed (ESP32) if available
- RPM over time chart (from OBD2 data, if available)
- Acceleration events (hard braking, sharp turns) marked on timeline and on map
- Engine data summary (avg RPM, avg engine load, coolant temp range) if OBD2 data present
- Trip metadata (supervisor, weather, odo readings)
- Export trip as PDF (stretch goal)

### 7. Supervisor Management
- List of saved supervisors
- Add supervisor: name, licence number (optional), relationship
- Edit / delete supervisor
- Each supervisor shows total hours supervised

### 8. Device Management (BLE)
- Scan for ESP32 devices
- Connect / disconnect
- Show connection status, signal strength
- Device info: firmware version, battery level, SD card status
- **OBD2 status**: show if ESP32 is connected to the car's OBD2 port, supported PIDs
- WiFi credential management: send new SSID/password to ESP32 via BLE

### 9. Settings
- User profile (learner name, licence number)
- Target hours (default 120, customisable)
- Night hours definition (auto sunset/sunrise or manual time range)
- Cloud sync settings (auto-sync on WiFi, manual sync)
- Units (km/mph — default km)
- Theme (light/dark)

### 10. Sync Status
- List of trips pending sync to cloud
- Manual "Sync Now" button
- Last sync timestamp
- Error log for failed syncs

---

## Mock BLE Service Specification

The BLE service handles communication with the ESP32. The ESP32's role is simple: receive start/stop commands, collect OBD2 data during the trip, and send that data back at trip end. **The phone handles all GPS and accelerometer logging itself.**

```typescript
interface IBleService {
  // Connection
  scanForDevices(): Promise<BleDevice[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): ConnectionStatus;
  onConnectionStatusChange(callback: (status: ConnectionStatus) => void): void;

  // Trip control (commands sent TO ESP32)
  sendStartCommand(config: TripStartConfig): Promise<{ ack: boolean }>;
  sendStopCommand(): Promise<{ ack: boolean }>;

  // OBD2 data transfer (received FROM ESP32 after trip ends)
  requestObd2Data(): Promise<Obd2TripData>;
  onObd2TransferProgress(callback: (progress: number) => void): void;  // 0-100%

  // Device management
  getDeviceInfo(): Promise<DeviceInfo>;
  sendWifiCredentials(ssid: string, password: string): Promise<boolean>;
  updateOdometer(odo: number): Promise<boolean>;
}

// What the phone sends to ESP32 at trip start
interface TripStartConfig {
  tripId: string;
  startTime: number;         // unix ms
}

// OBD2 data the ESP32 collected during the trip, sent back at trip end
interface Obd2TripData {
  tripId: string;
  samples: Obd2Sample[];    // one sample every ~1 second
  dtcCodes?: string[];       // any diagnostic trouble codes found
}

interface Obd2Sample {
  timestamp: number;         // unix ms
  vehicleSpeed: number;      // km/h (from OBD2 PID 0x0D)
  rpm: number;               // engine RPM (PID 0x0C)
  engineLoad: number;        // % (PID 0x04)
  coolantTemp?: number;      // °C (PID 0x05)
  throttlePosition?: number; // % (PID 0x11)
  fuelLevel?: number;        // % (PID 0x2F)
}
```

### Phone Sensor Service (NOT mocked — use real Capacitor plugins)

The phone logs its own sensors during the trip. This service wraps `@capacitor/geolocation` and `@capacitor/motion`:

```typescript
interface ISensorService {
  // GPS logging
  startGpsLogging(intervalMs: number): void;    // default 1000ms
  stopGpsLogging(): GpsPoint[];
  onGpsUpdate(callback: (point: GpsPoint) => void): void;

  // Accelerometer logging
  startAccelLogging(intervalMs: number): void;  // default 200ms
  stopAccelLogging(): AccelPoint[];
  onAccelUpdate(callback: (point: AccelPoint) => void): void;
}

interface GpsPoint {
  timestamp: number;
  lat: number;
  lng: number;
  speed: number | null;      // m/s (from phone GPS, may be null)
  altitude: number | null;
  accuracy: number;          // meters
  heading: number | null;
}

interface AccelPoint {
  timestamp: number;
  x: number;                 // m/s² (lateral)
  y: number;                 // m/s² (longitudinal)
  z: number;                 // m/s² (vertical)
}
```

> **Note:** GPS and accelerometer should use real Capacitor plugins even during development — they work in emulators and on physical devices. Only BLE and the API backend need mocking.

### Mock BLE behaviour:
- `scanForDevices()` returns 1-2 fake devices after a 2-second delay (simulate scanning)
- `connect()` succeeds after 1.5s delay
- `sendStartCommand()` returns `{ ack: true }` after 500ms
- `sendStopCommand()` returns `{ ack: true }` after 500ms
- `requestObd2Data()` simulates a multi-second BLE data transfer:
  - Fires progress callbacks (10%, 30%, 50%, 80%, 100%) over ~5 seconds
  - Returns a fake `Obd2TripData` with one sample per second matching the trip duration
  - OBD2 vehicle speed should roughly correlate with the GPS speed the phone logged
  - RPM varies 800-4000 realistically based on speed
  - Engine load varies 15-80%
- `getDeviceInfo()` returns fake device info including battery, firmware version, and OBD2 connection status

---

## Mock API Service Specification

The real backend will be a **Flask webserver** that Fred builds separately. The mock API must mirror the exact same REST endpoints so that swapping from mock to real is just changing a base URL.

### Flask API Endpoints (the mock must match these exactly)

```
POST   /api/auth/login              → { token }
POST   /api/auth/register           → { token }

GET    /api/trips                   → [Trip]           (with query params for filters)
GET    /api/trips/<trip_id>         → Trip
POST   /api/trips                   → { cloudId }      (sync a trip up)
DELETE /api/trips/<trip_id>         → { success }

GET    /api/supervisors             → [Supervisor]
POST   /api/supervisors             → Supervisor
PUT    /api/supervisors/<id>        → Supervisor
DELETE /api/supervisors/<id>        → { success }

GET    /api/logbook/summary         → LogbookSummary
POST   /api/devices/register        → { success }      (register ESP32 by MAC)
```

### TypeScript Interface (mirrors the Flask routes)

```typescript
interface IApiService {
  // Base URL config: mock uses '' (in-memory), real uses Flask server URL
  
  // Auth
  login(email: string, password: string): Promise<AuthToken>;
  register(email: string, password: string, name: string): Promise<AuthToken>;

  // Trips — matches Flask /api/trips endpoints
  syncTrip(trip: Trip): Promise<{ cloudId: string }>;       // POST /api/trips
  getTrips(filters?: TripFilters): Promise<Trip[]>;          // GET /api/trips
  getTrip(tripId: string): Promise<Trip>;                    // GET /api/trips/:id
  deleteTrip(tripId: string): Promise<void>;                 // DELETE /api/trips/:id

  // Supervisors — matches Flask /api/supervisors endpoints
  getSupervisors(): Promise<Supervisor[]>;
  addSupervisor(supervisor: Omit<Supervisor, 'id'>): Promise<Supervisor>;
  updateSupervisor(id: string, updates: Partial<Supervisor>): Promise<Supervisor>;
  deleteSupervisor(id: string): Promise<void>;

  // Stats
  getLogbookSummary(): Promise<LogbookSummary>;              // GET /api/logbook/summary

  // Device
  registerDevice(mac: string): Promise<void>;                // POST /api/devices/register
}
```

### Real implementation pattern (api.real.ts — for when Flask is ready):

```typescript
// This is what the real service will look like. Don't build it yet.
class RealApiService implements IApiService {
  private baseUrl: string;  // e.g. 'http://192.168.1.50:5000' or deployed URL
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async syncTrip(trip: Trip): Promise<{ cloudId: string }> {
    const res = await fetch(`${this.baseUrl}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(trip)
    });
    if (!res.ok) throw new Error(`Sync failed: ${res.status}`);
    return res.json();
  }
  // ... same pattern for every endpoint
}
```

### Mock behaviour:
- All methods have a 200-500ms random delay (simulate Flask response time)
- 5% chance of throwing a network error (simulate flaky connection)
- Returns JSON in the exact same shape Flask will return
- Data persisted to `@capacitor/preferences` so it survives app restarts
- Pre-seed with **3-5 sample trips** in Canberra with realistic data so the app isn't empty on first load
- Pre-seed with 2 sample supervisors (e.g., "Mum" and "Dad")
- Auth mock: any email/password combo works, returns a fake JWT-style token

---

## Data Models

```typescript
interface Supervisor {
  id: string;
  name: string;
  licenceNumber?: string;
  relationship: string;      // e.g. "Parent", "Instructor", "Friend"
  createdAt: number;
}

interface UserProfile {
  name: string;
  licenceNumber?: string;
  targetHours: number;       // default 120
  nightStartHour: number;    // default from sunset calc or 19 (7pm)
  nightEndHour: number;      // default from sunrise calc or 6 (6am)
}

type ConnectionStatus = 'disconnected' | 'scanning' | 'connecting' | 'connected';

interface BleDevice {
  id: string;
  name: string;
  rssi: number;
  mac: string;
}

interface DeviceInfo {
  firmwareVersion: string;
  mac: string;
  batteryPct: number;
  sdCardPresent: boolean;
  sdCardFreeBytes: number;
  wifiConfigured: boolean;
  wifiSsid?: string;
  obd2Connected: boolean;     // is ESP32 talking to car OBD2?
  obd2Protocol?: string;      // e.g. "ISO 15765-4 (CAN)"
}
```

---

## File Structure

```
lplate-tracker/
├── capacitor.config.ts
├── ionic.config.json (if using Ionic)
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── config.ts                    ← USE_MOCK flag lives here
│   ├── theme/
│   │   └── global.css
│   ├── models/
│   │   ├── trip.ts
│   │   ├── supervisor.ts
│   │   ├── gps.ts                   ← GpsPoint type
│   │   ├── accel.ts                 ← AccelPoint, AccelEvent types
│   │   ├── obd2.ts                  ← Obd2Sample, Obd2TripData types
│   │   └── device.ts
│   ├── services/
│   │   ├── ble/
│   │   │   ├── ble.interface.ts     ← IBleService (start/stop/OBD2 transfer)
│   │   │   ├── ble.mock.ts          ← fake BLE + fake OBD2 data generation
│   │   │   ├── ble.real.ts          ← stub, implement later
│   │   │   └── index.ts
│   │   ├── sensors/
│   │   │   ├── sensor.interface.ts  ← ISensorService
│   │   │   └── sensor.real.ts       ← wraps @capacitor/geolocation + motion
│   │   ├── api/
│   │   │   ├── api.interface.ts
│   │   │   ├── api.mock.ts          ← in-memory + localStorage backend
│   │   │   ├── api.real.ts          ← stub, implement later
│   │   │   └── index.ts
│   │   ├── tripManager/
│   │   │   └── tripManager.ts       ← orchestrates sensors + BLE + data merge
│   │   └── location/
│   │       └── nightTime.ts         ← sunrise/sunset calculation for Canberra
│   ├── hooks/
│   │   ├── useTrip.ts               ← active trip state management
│   │   ├── useBle.ts                ← BLE connection hook
│   │   ├── useSensors.ts            ← GPS + accel logging hook
│   │   ├── useLogbook.ts            ← trip history and stats
│   │   └── useSync.ts               ← sync queue management
│   ├── context/
│   │   ├── TripContext.tsx
│   │   ├── BleContext.tsx
│   │   └── AuthContext.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── ActiveTrip.tsx
│   │   ├── StartTrip.tsx
│   │   ├── StopTrip.tsx             ← includes OBD2 transfer progress UI
│   │   ├── TripHistory.tsx
│   │   ├── TripDetail.tsx           ← GPS + OBD2 data side by side
│   │   ├── Supervisors.tsx
│   │   ├── DeviceManagement.tsx
│   │   ├── Settings.tsx
│   │   └── SyncStatus.tsx
│   ├── components/
│   │   ├── TripCard.tsx
│   │   ├── RouteMap.tsx
│   │   ├── SpeedChart.tsx           ← dual-line: GPS speed vs OBD2 speed
│   │   ├── RpmChart.tsx             ← OBD2 RPM over time
│   │   ├── Obd2TransferProgress.tsx ← BLE data transfer progress bar
│   │   ├── ProgressRing.tsx         ← hours progress visualisation
│   │   ├── SupervisorPicker.tsx
│   │   ├── WeatherPicker.tsx
│   │   ├── ConnectionBadge.tsx
│   │   └── StatCard.tsx
│   └── utils/
│       ├── formatTime.ts
│       ├── calculateDistance.ts      ← haversine formula
│       ├── mergeTrip.ts             ← merge phone GPS/accel with OBD2 data
│       ├── detectAccelEvents.ts     ← find hard brakes/turns from accel data
│       └── seedData.ts              ← sample trips and supervisors
├── android/                          ← Capacitor Android project
├── ios/                              ← Capacitor iOS project
└── README.md
```

---

## NSW Logbook Requirements to Enforce

The app must track compliance with NSW learner driver rules:

1. **120 total hours** required (minimum) before progressing to P1
2. **20 hours must be at night** (between sunset and sunrise)
3. Each trip must record: date, start/end time, start/end odometer, supervisor details, weather/road conditions
4. Supervisor must hold a **full unrestricted Australian licence**
5. Learner must display L-plates (app can show a reminder)
6. **Zero BAC** — app can show a pre-drive reminder
7. Speed limit for learners: **90 km/h max** in NSW (even in 100/110 zones)
8. The app should warn if GPS speed exceeds 90 km/h during a trip

---

## UX Guidelines

- **Mobile-first**: This is a phone app used in a car. Buttons must be large and tappable.
- **Dark mode support**: Night driving means dark mode is essential.
- **Minimal interaction while driving**: The active trip screen should be glanceable (big speed, big timer). All complex interaction happens before/after trips.
- **Offline-first**: Everything works without internet. Sync is opportunistic.
- **Encouraging tone**: Show progress toward 120 hours positively (progress bars, milestones, celebrations at 25%, 50%, 75%, 100%).

---

## Implementation Priority

Build in this order:

1. **Project scaffold** — Capacitor + React + routing + config
2. **Models and interfaces** — all TypeScript types and service interfaces
3. **Mock services** — BLE mock with Canberra route, API mock with seed data
4. **Dashboard** — summary stats, start button, connection status
5. **Start/Stop trip flow** — supervisor picker, weather, odometer
6. **Active trip view** — timer, speed, live map
7. **Trip history and detail** — list, filters, detail with charts
8. **Supervisor management** — CRUD screens
9. **Device management** — scan, connect, WiFi config
10. **Settings and sync** — user profile, sync queue, preferences

---

## Sample Canberra Route for Seed Data

Predefine GPS waypoints for realistic sample trips in the seed data. These are used to populate the mock API with pre-existing trips so the app isn't empty on first load:

```typescript
// Canberra sample route: Civic → Parliament → Lake loop (~15 min drive)
const SAMPLE_ROUTE_POINTS = [
  { lat: -35.2809, lng: 149.1300 },  // Civic, London Circuit
  { lat: -35.2835, lng: 149.1310 },  // Commonwealth Ave
  { lat: -35.2880, lng: 149.1330 },  // Heading toward bridge
  { lat: -35.2960, lng: 149.1340 },  // Commonwealth Ave Bridge
  { lat: -35.3008, lng: 149.1290 },  // Near Parliament House
  { lat: -35.2990, lng: 149.1240 },  // State Circle
  { lat: -35.2940, lng: 149.1200 },  // Kings Ave direction
  { lat: -35.2880, lng: 149.1280 },  // Back over bridge
  { lat: -35.2830, lng: 149.1310 },  // Return to Civic
  { lat: -35.2809, lng: 149.1300 },  // End at Civic
];
```

Use these to generate sample trips with interpolated GPS points, matching OBD2 data, and realistic accelerometer readings. Create 3-5 sample trips of varying lengths (15 min, 30 min, 1 hour) at different times of day (some day, some night).

The mock OBD2 data for seed trips should show vehicle speed that roughly matches the GPS-derived speed, with RPM and engine load that make physical sense for the speed.

---

## Trip Orchestration Flow

The `TripManager` service coordinates the entire trip lifecycle:

```
START TRIP:
1. User selects supervisor, weather, enters odometer
2. App sends startCommand to ESP32 via BLE → ESP32 begins logging OBD2
3. App starts phone GPS logging (1 second interval)
4. App starts phone accelerometer logging (200ms interval)
5. Active trip UI shown

DURING TRIP:
- Phone continuously logs GPS + accelerometer to local arrays
- ESP32 independently logs OBD2 data (phone doesn't see this yet)
- UI shows live map, speed (from phone GPS), elapsed time

STOP TRIP:
1. User taps stop, confirms end odometer
2. App sends stopCommand to ESP32 via BLE → ESP32 stops logging OBD2
3. App stops phone GPS and accelerometer logging
4. App calls requestObd2Data() → ESP32 transfers OBD2 data over BLE
   - Show progress bar during transfer
   - If transfer fails, allow retry or skip
5. App merges phone data (GPS + accel) with OBD2 data into one Trip record
6. Detect accel events (hard brakes, sharp turns) from accelerometer data
7. Calculate derived stats (distance, max speed, day/night split)
8. Save complete trip to local DB
9. Queue trip for API sync
```

---

## Flask Backend (NOT built now — for reference only)

The Flask server Fred will build later should follow this spec. Including it here so the mock stays aligned.

```
Flask Backend Spec:
- Python 3.10+, Flask + Flask-CORS
- SQLite database (or PostgreSQL for production)
- JWT auth via flask-jwt-extended
- All endpoints return JSON
- All endpoints prefixed with /api/

Database tables:
- users (id, email, password_hash, name, created_at)
- trips (id, user_id, supervisor_id, start_time, end_time, start_odo, end_odo,
         distance_km, day_minutes, night_minutes, weather, route_json, 
         obd2_json, accel_events_json, synced_at)
- supervisors (id, user_id, name, licence_number, relationship, created_at)
- devices (id, user_id, mac, firmware_version, registered_at)

Auth: Bearer token in Authorization header for all endpoints except login/register.
MAC + shared API key for ESP32 device auth (separate from user auth).
```

When the Flask backend is ready, switching is just:
1. Set `USE_MOCK = false` in `config.ts`
2. Set `API_BASE_URL = 'http://your-flask-server:5000'`
3. The `RealApiService` makes the same fetch calls the mock simulated

---

## What NOT to Build Yet

- Real BLE integration (just the mock — the interface is ready for swap)
- Real API calls (just the mock — the interface is ready for swap)
- Real OBD2 parsing on ESP32 (the mock generates fake OBD2 data)
- Push notifications
- Social features / sharing
- PDF export
- App store deployment config

Focus on getting the **full UI and app logic working end-to-end with mocks**, so that plugging in real BLE, OBD2 data, and API later is just swapping service implementations. The phone sensor logging (GPS + accelerometer) should use **real Capacitor plugins** from the start.

----------------------------------------------------------------

can you make it look more like the image below ignore the pwa and web stuff but laos note theat this was desigend for a desktop app the app you are makeing is mobiel so ajust it for that

- have pi chart make the drive desplayd like this 
- rba for a parat to aprove there kids drive 
- only use the odo from the esp not all the other stuff 
- the esp dosent sync with wifi it only tranfers over plutooth also 
- when the app is open it will automaticly synck the blytooth 
- make it autmaticly sync to the cloud if on mobile data but if not let them know that they are  not synced 
- change optimse for starting a drive so make the home screed a optin to select car then sd use a make htem enter wether at the end beut give them the optin to skip then use a api

XXX added a image of my wireframes xxx

then i ansserd some questions

_______________________________________________


