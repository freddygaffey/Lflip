# ESP32 PlatformIO Plan — OBD2 + SD Card, BLE to Phone & OBD2

Plan for rewriting the L-Plate server firmware: **no GPS, no accelerometer**; **SD card** and **OBD2 BLE module**; **phone talks to ESP32 over BLE** (no WiFi server for the app).

**Existing codebase:** `C:\Users\fredg\OneDrive - cgs.act.edu.au\school\12y\IT\ass final\all_code\L_plate_server` (esp server branch / folder)

**References:**
- `cap_vibe/docs/api-and-database-design.md` — trip/odo semantics
- `cap_vibe/2_js/src/services/ble/ble.interface.js` — phone expects start/stop and odometer (startOdo, endOdo) from device

---

## 1. Architecture

```
Backend (Flask API)  <--HTTP-->  Cap app (phone)  <--BLE-->  ESP32  <--BLE-->  OBD2 dongle  <--OBD2-->  Car
                                                                       |
                                                                       v
                                                                  SD card (trip logs)
```

- **Backend ↔ Cap app:** HTTP (trips, auth, pairing, etc.). Cap app is the only thing that talks to the backend.
- **Cap app ↔ ESP32:** **BLE**. Phone is BLE central; ESP32 is **BLE peripheral (GATT server)**. Phone sends start/stop, requests current odometer and trip odometer data (startOdo, endOdo).
- **ESP32 ↔ OBD2:** **BLE client**. ESP32 connects to the OBD2 BLE dongle, reads vehicle speed and/or odometer.
- **SD card** on ESP32: trip logs (odo-only).

There is **no WiFi server on ESP32** for the phone. All app–device communication is BLE. WiFi on ESP32 can be kept for OTA or config if needed later.

---

## 2. Current vs Target

| Aspect | Current (L_plate_server) | Target |
|--------|---------------------------|--------|
| Phone ↔ ESP32 | WiFi (HTTP /start, /stop, etc.) | **BLE** (GATT: start, stop, odo request) |
| GPS | Present (stubbed) | **Remove** |
| Accelerometer | Present (stubbed) | **Remove** |
| Odometer | Preferences + GPS speed integration | **From OBD2 BLE module** (ESP32 as BLE client) |
| SD card | Logs GPS + accel CSV | **Keep** — log trip metadata + odo only |
| WiFi on ESP32 | Server for phone + AP for config | **Optional** (OTA/config only); not used by Cap app |

---

## 3. What to Reuse from L_plate_server

| File / area | Reuse / adapt |
|-------------|----------------|
| `platformio.ini` | Keep board (esp32c3), remove Adafruit GPS. Add: **NimBLE** (or Bluedroid) for both BLE server (phone) and BLE client (OBD2). No Async WebServer. |
| `wifi_manager.cpp/h` | **Optional**: keep for OTA or config if needed; not used by Cap app. Otherwise remove or stub. |
| `odo.cpp/h` | Keep: `init_odo`, `get_odo`, `set_odo`, `update_ODO_with_speed`. Feed speed from OBD2 when available. |
| `sd_card.cpp/h` | **Heavily adapt**: remove `log_gps`, `log_acell`, and all `#include "gps.h"`, `"acell.h"`. Keep: `init_sd_card`, `make_log_file`, `_get_log_file`, `end_trip`, buffer flush. Log only trip metadata + odo. |
| `main.cpp` | **Replace**: no HTTP server. Init BLE server (GATT) for phone, BLE client for OBD2, SD, odo, logging. In `loop()`: run BLE, logging state machine, OBD2 poll. |
| `logging.cpp/h` | **Adapt**: remove GPS and accel. Keep state machine (WAITING, LOGGING, SYNCING). In LOGGING, poll OBD2 for odo and optionally log to SD. |
| `gps.cpp/h` | **Remove**. |
| `acell.cpp/h` | **Remove**. |

---

## 4. New Components

### 4.1 BLE GATT Server (ESP32 peripheral — for Cap app)

- **ESP32 advertises** so the Cap app can discover and connect (e.g. device name "L-Plate" or similar).
- **GATT service(s)** and characteristics to match what the Cap app expects (see `ble.interface.js`):
  - **Start command** — phone writes tripId + startTime; ESP32 sets RTC if needed, calls `start_loging(start_time, SD_ID)`, responds ack.
  - **Stop command** — phone writes; ESP32 calls `stop_logging(weather)` (or weather from phone), responds ack.
  - **Request odometer** — phone reads; ESP32 returns current odo (from OBD2 or stored) and/or trip startOdo/endOdo.
  - **Device info** — optional (name, version).
- Use **NimBLE** or Bluedroid **BLE server** APIs. Handle connect/disconnect; when phone disconnects, keep logging state and OBD2 client as needed.

### 4.2 OBD2 BLE Module (ESP32 as BLE client)

- ESP32 scans/connects to a known OBD2 BLE device (e.g. by name or address).
- Use **NimBLE** (or Bluedroid) as BLE client. Typical OBD2 BLE dongles expose a serial-like service; send AT/OBD commands and parse responses.
- **Odometer:** Not all cars expose odometer via OBD2. Common approach: use **vehicle speed** PID and integrate over time to estimate distance, or use PID 0x01 0x0C (engine RPM) and 0x01 0x0D (vehicle speed) — store “trip distance” from speed integration and add to stored “base odo” (from `/odo_update` or last known).
- **New module:** e.g. `obd2_ble.cpp/h`: `init_obd2_ble()`, `connect_to_obd2()`, `read_vehicle_speed_kmh()`, `read_odometer_km()` (if supported), or `get_integrated_trip_km()`. Call from `logging.cpp` when state == LOGGING to update odo and optionally write odo line to SD.

### 4.3 SD Log Format (simplified)

- No GPS or accel lines.
- Option A: One file per trip: header line `start_time,start_odo_km,sd_id`, then lines `odo_km` at interval (e.g. every 10 s), footer line `end_time,end_odo_km,weather`.
- Option B: Only header + footer (start_odo, end_odo, weather). Minimal.
- Reuse existing file naming under `/trips/` if desired (e.g. `_<start_time>_<start_odo>_<sd_name>.csv`).

---

## 5. Implementation Order

| Step | Task |
|------|------|
| 1 | **platformio.ini**: Remove Adafruit GPS. Add NimBLE (or Bluedroid) for BLE server + BLE client. No Async WebServer. |
| 2 | **Remove** gps.cpp/h, acell.cpp/h; remove references in logging, sd_card. |
| 3 | **sd_card**: Remove GPS/accel logging; keep init, make_log_file, end_trip; odo-only log format. |
| 4 | **ble_server** (new): GATT server for Cap app — advertise, start/stop characteristics, odometer read. Match `ble.interface.js` contract. |
| 5 | **obd2_ble** (new): BLE client to OBD2 dongle; read speed and/or odo; expose to logging/odo. |
| 6 | **logging.cpp**: Remove GPS/accel; in LOGGING state poll OBD2 and optionally log odo to SD. |
| 7 | **main.cpp**: Init BLE server, BLE client (OBD2), SD, odo, logging. Loop: BLE + logging callback. No HTTP server. |
| 8 | **wifi_manager**: Remove or make optional (e.g. for OTA only). |

---

## 6. File Layout After Changes

```
L_plate_server/
├── platformio.ini       # No GPS; NimBLE (or BLE stack) for server + client
├── src/
│   ├── main.cpp         # Init BLE server, BLE client (OBD2), SD, odo, logging; loop
│   ├── ble_server.cpp   # NEW: GATT server for Cap app (start, stop, odo)
│   ├── obd2_ble.cpp     # NEW: BLE client to OBD2 dongle
│   ├── odo.cpp
│   ├── sd_card.cpp      # Odo-only logging
│   ├── logging.cpp      # No GPS/accel; OBD2 odo + SD
│   └── wifi_manager.cpp # Optional (OTA/config)
├── include/
│   ├── ble_server.h
│   ├── obd2_ble.h
│   ├── odo.h
│   ├── sd_card.h
│   ├── logging.h
│   └── wifi_manager.h   # Optional
# Remove: gps.cpp/h, acell.cpp/h
```

---

## 7. Notes

- **Data flow:** Backend ↔ Cap app (HTTP). Cap app ↔ ESP32 (BLE only). ESP32 ↔ OBD2 (BLE). SD on ESP32 for trip logs.
- **ble.interface.js:** Implement on ESP32 the GATT side of sendStartCommand, sendStopCommand, requestOdometerData, getCurrentOdometer so the Cap app’s BLE service can talk to the ESP32.
- **OBD2 PIDs:** Vehicle speed is usually PID 0x0D. Odometer is often not standard; use speed integration + stored base odo if needed.
