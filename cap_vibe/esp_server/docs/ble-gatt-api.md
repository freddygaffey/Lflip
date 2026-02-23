# L-Plate ESP32 BLE GATT API

For the Cap app's `ble.real.js` to communicate with the ESP32.

## Device

- **Advertised name:** `L-Plate`
- **Service UUID:** `0000FF00-0000-1000-8000-00805F9B34FB` (short: `FF00`)

## Characteristics

| UUID | Name | Properties | Description |
|------|------|------------|-------------|
| FF01 | Start Command | Write | Start trip logging |
| FF02 | Stop Command | Write | Stop trip logging |
| FF03 | Odometer | Read | Get startOdo and endOdo (km) |
| FF04 | Update Odometer | Write | Set odometer from phone (km) |

## Data Formats

### Start (Write to FF01)

```json
{
  "tripId": "uuid-string",
  "startTime": 1709012345678,
  "startOdometer": 43200,
  "sdId": "driver_name"
}
```

- `startTime`: Unix ms (used to set ESP32 RTC)
- `startOdometer`: km (optional; syncs odo from phone)
- `sdId`: driver/trip identifier for SD log filename

### Stop (Write to FF02)

```json
{
  "weather": "sunny"
}
```

- `weather`: `sunny`, `overcast`, `rain`, `night` (optional; default `sunny`)

### Odometer (Read from FF03)

Returns:

```json
{
  "startOdo": 43200.5,
  "endOdo": 43250.25
}
```

- `startOdo`: odometer at trip start (km)
- `endOdo`: current odometer (km)

Use `endOdo` for `getCurrentOdometer()`. Use both for `requestOdometerData()` at trip end.

### Update Odometer (Write to FF04)

Plain number or JSON:

```
43250
```

or

```json
{ "odo": 43250 }
```
