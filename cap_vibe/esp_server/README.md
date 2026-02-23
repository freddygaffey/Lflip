# L-Plate ESP32 Server

PlatformIO firmware for the Cap Vibe L-Plate tracker. **BLE-only** communication with the phone app; no WiFi server.

## Architecture

```
Backend (Flask)  <--HTTP-->  Cap app (phone)  <--BLE-->  ESP32  <--BLE-->  OBD2 dongle
                                                              |
                                                              v
                                                         SD card (trip logs)
```

- **Phone ↔ ESP32:** BLE GATT (ESP32 is peripheral)
- **ESP32 ↔ OBD2:** BLE client (reads vehicle speed for odometer)
- **SD card:** Trip logs (odo-only, no GPS/accel)

## Hardware

- **Board:** DFRobot Beetle ESP32-C3
- **SD card:** SPI (CS=7, MOSI=6, MISO=5, SCK=4)
- **OBD2:** BLE dongle (ELM327-style, e.g. "OBDII", "Veepeak")

## Build & Upload

```bash
cd esp_server
pio run
pio run -t upload
```

## BLE GATT API

See [docs/ble-gatt-api.md](docs/ble-gatt-api.md) for the GATT UUIDs and data formats used by the Cap app.

## SD Log Format

- Path: `/trips/`
- Filename: `{start_time}_{start_odo_km}_{sd_id}.csv` (leading `_` while active)
- Header: `start_time,start_odo_km,sd_id`
- Body: `odo_km` lines (every ~10 s)
- Footer: `end_time,end_odo_km,weather`

## Plan Reference

Implementation follows [../docs/esp-platformio-plan.md](../docs/esp-platformio-plan.md).
