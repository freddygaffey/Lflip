# Implementation brief: move the master's job onto a plate

Goal: **delete the master board**, so the product is two devices instead of three, with
the smallest possible change to firmware that already works and is flashed on hardware.

This is deliberately a transplant, not a redesign. If you find yourself inventing a new
protocol, new message types, or a way for two plates to agree with each other, stop —
you have gone off-brief.

---

## 1. Current system

```
phone ──BLE──► MASTER ──ESP-NOW──► EDGE (plate)
                      └─ESP-NOW──► EDGE (plate)
```

- `src/master/main.cpp` — BLE peripheral. Holds `desiredState`, answers `POLL` with `CMD`,
  runs pairing. Car-powered, drives no servo.
- `src/edge/main.cpp` — one per plate. Polls the master, moves a servo to L / CENTER / P.
  Battery-powered.
- `lib/protocol/protocol.h` — ESP-NOW contract, `PROTO_VERSION` 7.
- Both plates sit on the **windscreen inside the car**, within ~2 m of the phone.

## 2. Target system

```
phone ──BLE──► PLATE A (hub) ──ESP-NOW──► PLATE B
                 └ drives its own servo
```

One plate takes the master's BLE role **in addition to** being a plate. The other is
unchanged. `desiredState` still lives in exactly one place, so there is no consensus
problem to solve.

**Do not make the plates symmetric.** The phone connects to the hub, as it connects to
the master today. Symmetry would buy the user nothing at 2 m range and would require
inventing sequence numbers, tie-breaks and conflict resolution — all of which this design
avoids by construction.

## 3. Scope of change

**Keep completely unchanged:**

- `lib/protocol/protocol.h` — **stay on `PROTO_VERSION` 7.** No new message types, none
  deleted. `POLL`/`CMD`/`PAIR_REQ`/`PAIR_ACK`/`UNPAIR`/`SERVO_CAL` all keep their meaning.
- `src/edge/main.cpp` — byte-for-byte. The follower plate is today's edge firmware.
- `lib/power/battery.h`, ship mode (`shipModeGate()`), `pollUsbGesture()`, servo control
  and calibration storage (`lUs`/`centerUs`/`pUs`), the button behaviour.
- All four BLE UUIDs, and the shape of the status JSON (see §5).

**Build:** add `[env:hub]`. Source is the edge firmware plus the master's BLE block. Keep
`edge`. Keep the locked demo pair as `hub_demo` / `edge_demo` (two envs, as today — each
needs the *other* board's MAC compiled in, which one env cannot express).

## 4. What the hub firmware is

Take `src/edge/main.cpp` and add:

1. The master's **BLE service and callbacks**, transplanted: `initBle()`, the plate-state
   characteristic write, the command characteristic, the status notify. This code works
   today — move it, don't rewrite it.
2. The master's **`desiredState`** and its pairing side: answer `PAIR_REQ` during a
   pairing window, answer `POLL` with `CMD`.
3. **Local actuation.** On a BLE write, the hub sets `desiredState`, moves *its own*
   servo, and the follower picks the state up on its next poll. The hub is both the
   authority and a plate.

The follower needs no changes at all: it already polls, already obeys `CMD`, already
paces itself from `next_poll_ms`.

## 5. Status JSON — keep the app working

The phone app parses this today and section 12 does not give you permission to break it.
`MasterDebugModal.vue` renders `st.flip` and `st.test`; `plateLink.calibrate(edgeIdx, …)`
indexes into `e[]`. Therefore:

- Keep every existing key: `uid`, `up`, `edges`, `desired`, `pairing`, `flip`, `test`,
  `e[]`, `cand[]`.
- **Report the hub itself as `e[0]`** — its own MAC, battery and current state — with the
  follower after it. That way the existing calibrate-by-index path can reach *both*
  plates with no app change, which it otherwise could not.

## 6. BLE name — fix the identity churn while you are here

Today the master's name is `Lplate-` + a random 5-char UID from `esp_random()`, and it
regenerates on reset, which breaks the app's saved `ble_device_name`.

Derive the UID **deterministically from the hub's own MAC** so it never changes, and stop
regenerating it in `freshPairingReset()`. Keep the `Lplate-` prefix and the 5-character
length — the app matches the **exact** saved name (`plates.ts:97`), so the string must be
stable for the life of the board.

## 7. Two hazards created by putting a servo on the BLE board

The master is car-powered and drives nothing. The hub is battery-powered and drives a
servo while holding a BLE connection. Both of these are new and must be handled:

**a. The low-voltage guard can false-trip on servo sag.** `checkBattery()` runs every 5 s
and `batt::isLow()` double-samples 100 ms apart. A servo ramp blocks for over a second and
can drag the rail through both samples, below `CUTOFF_V`, triggering `parkForever()` — a
permanent deep sleep, mid-use. Suppress the battery check during a move and for ~1 s
after it.

**b. Answer polls from the ESP-NOW receive callback, not `loop()`.** The master replies
inside `onEspNowRecv` today. The servo ramp blocks `loop()`, so if you move the reply
there the follower will time out on exactly the state change it most needs to hear.

## 8. Constraints

- Seeed XIAO ESP32-C3, Arduino core 2.0.x, **NimBLE 1.x only**. ESP-NOW receive callbacks
  on 2.0.17 use the legacy signature `(const uint8_t*, const uint8_t*, int)`.
- Pins: D1 button, D2 LED, D9 servo power, D10 servo PWM, A0 battery. **Leave D3 (GPIO5)
  free** — reserved for a planned VBUS wake pin.
- BLE + ESP-NOW coexist on the master today, so that pairing is proven; adding servo PWM
  to the same chip is not, hence §7.
- Few, lean comments explaining *why*. No emoji. No AI attribution anywhere.

## 9. Acceptance tests

On two real boards, over serial, with the follower on battery:

1. Hub and follower pair using the existing flow; hub reports `edges = 1`.
2. A BLE write of each state (0/1/2) moves **both** plates — the hub locally, the follower
   within one poll interval.
3. The hub's BLE name is unchanged after a reset, a re-flash, and a `freshPairingReset()`.
4. Calibrate the **hub's own** servo through the app's existing calibrate path, then the
   follower's, using the `e[]` indices from §5.
5. Move the hub's servo repeatedly while a BLE connection is open, on battery, and confirm
   it never enters the low-voltage deep sleep (§7a).
6. `hub_demo` + `edge_demo` come up already paired, and no button, serial command or USB
   gesture can unpair them.

## 10. Out of scope

Do not touch the phone app, the Flask backend, or anything outside `esp32/`. If a change
you are making would require an app change, you have deviated from this brief — the whole
point is that the app keeps working untouched.
