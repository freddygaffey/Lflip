# L-Plate Tracker

NSW learner driver logbook app — fast mobile logging with BLE + odometer from ESP32.

## Tech Stack

- React + Vite
- Capacitor 6 (iOS/Android)
- Tailwind CSS
- Leaflet (maps)
- Chart.js (speed charts)

## Quick Start

```bash
npm install
npm run dev      # Web dev server on :3000
npm run build
npx cap sync     # Sync to native projects
npx cap open android
npx cap open ios
```

## Features

- **Fast logging**: Select supervisor → confirm ODO (last 3 digits) → Start
- **Active trip**: Minimal UI, "DO NOT LOOK AT PHONE" banner
- **Stop flow**: End ODO → weather (with Skip) → summary
- **ESP32**: Odometer only via BLE (mock for now)
- **Progress rings**: Day, total, night hours
- **Parent approval**: Trip `approvalState` for web RBA

## Mock Mode

Set `USE_MOCK = true` in `src/config.js`. BLE, API, GPS, and accelerometer are all mocked for browser dev.

## Spec

See `prompts.md` for full AI-assisted development documentation and consolidated spec.
