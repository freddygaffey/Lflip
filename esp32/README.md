# L-Plate Hardware Firmware

Motorised L-plates for a car, controlled from the Lflip phone app. This folder
is one **PlatformIO** project that builds **several firmwares** from shared code.

Firmware terminology (used throughout this doc, and in the source):

- **master** — the always-powered controller board in the car's OBD port. BLE
  server the phone talks to; holds the pairings; tells the edges what to do.
- **edge** — a plate board. Battery powered, drives a servo to flip the plate.
  Identical firmware on every edge; the master keeps an array of them.

> The phone app uses friendlier words ("controller", "plate"). This is the
> developer/firmware doc, so it uses the firmware's own names: **master** and
> **edge**.

---

## 1. The idea in one picture

```
        ┌─────────────┐   BLE    ┌──────────────────────┐
        │  Lflip app  │◄────────►│   MASTER  (in OBD)    │
        │  (phone)    │  toggle  │   ESP32-C3, 12V power │
        └─────────────┘  status  │   always on          │
                                 └──────────┬───────────┘
                          ESP-NOW (plaintext unicast, channel 1)
                                 ┌──────────┴───────────┐
                                 ▼                      ▼
                        ┌──────────────────┐  ┌──────────────────┐
                        │ EDGE (a plate)   │  │ EDGE (a plate)   │
                        │ C3 + servo       │  │ C3 + servo       │
                        │ 18650, low-V cut │  │ 18650, low-V cut │
                        └──────────────────┘  └──────────────────┘
```

| Role | Where | Power | Job |
|------|-------|-------|-----|
| **master** | car's OBD port | always on (car 12 V) | talks to the phone over BLE; tells the edges what state to show; holds the pairings; paces the edges' poll rate |
| **edge** (up to 4) | each plate | 18650 battery | drives a servo to move the plate between L / CENTER / P; deep-sleeps on low battery |

All boards are **Seeed XIAO ESP32-C3**. The protocol version is **7**
(`PROTO_VERSION` in `protocol.h`); a board on a different version ignores the
traffic as garbage.

---

## 2. Plate positions (3-state)

The plate is a 3-position flap driven by one servo. `PlateState` (in
`protocol.h`) is:

| State | Value | Meaning |
|-------|-------|---------|
| `L`      | 0 | one face shown — L plate |
| `CENTER` | 1 | edge-on / neither face — the "off" position (boot default) |
| `P`      | 2 | the other face shown — P plate |

Each position maps to a **per-edge, calibrated servo pulse width** (see §6).
The plates all move together from one command — there are no front/back roles.

---

## 3. How a toggle flows

The phone never talks to the edges directly. The master is the middle-man and
the single source of truth for what the plates should show.

1. **Phone → master (BLE):** the app writes one byte (`0`/`1`/`2` = `L`/`CENTER`/`P`)
   to the plate characteristic. The master stores it in `desiredState`.
2. **Edge polls (ESP-NOW):** each paired edge periodically unicasts a `PollMsg`
   to the master (its battery mV + the state it currently believes it's in).
3. **Master replies (ESP-NOW):** it sends back a `CmdMsg` carrying the
   `desired` state **and** a `next_poll_ms` — how long the edge should wait
   before polling again (see below).
4. **Edge acts:** if `desired` differs from its current state, and it's past the
   ~1.5 s boot-settle delay, it ramps the servo to the new position, lets it
   settle, then releases the PWM signal (the plate rests on a mechanical stop).

### Adaptive poll cadence (what's actually implemented)

The edge's poll interval is set by the master on every reply (`next_poll_ms`):

| Condition | Interval | Constant |
|-----------|----------|----------|
| A phone/BLE client is connected to the master | **~300 ms** | `FAST_POLL_MS` |
| No phone connected (idle) | **~3000 ms** | `IDLE_POLL_MS` |

The master knows whether a phone is connected for free (it's the BLE server).
Phone connected ⇒ a trip is happening ⇒ poll fast so toggles feel instant;
disconnected ⇒ slow down to save the edge's battery.

On top of that the edge **overrides to ~250 ms** for a few seconds right after a
move or after boot (so a rapid second toggle still lands quickly); otherwise it
obeys the master's `next_poll_ms`. The edge only learns of a change when it
polls, so worst-case reaction time ≈ one poll interval.

> **Planned, not yet implemented:** a richer cadence that also factors in GPS
> speed, current plate state, and time-of-day, plus real deep-sleep between
> polls for months-scale battery life. Today only phone-presence drives the
> rate, and the edge stays awake between polls (short battery life). Treat the
> speed/time-of-day story as a design goal, not current behaviour.

---

## 4. Pairing, re-pairing & reset (the UX)

Comms are **plaintext ESP-NOW** with real-MAC pairing (no encryption is
configured — `p.encrypt = false` on every peer, and `protocol.h` says so). MAC
pairing is what stops two cars in the same car park from interfering: boards
learn each other's MAC once, save it to flash, and from then on only answer a
known MAC.

**What's saved in flash (NVS), survives power-off:**

| Board | Remembers |
|-------|-----------|
| master | its list of edge MACs (up to 4) + a random UID (its BLE identity) |
| edge   | its master's MAC + its own servo calibration (L / CENTER / P µs) |

### First-time pairing (auto-join)

1. **Put the master into pairing mode** — tap its **BOOT** button once (or send
   the "enter discovery" command from the app). The status LED blinks and the
   window stays open for **~60 s** (`PAIR_WINDOW`).
2. **Power on any unpaired edge.** A fresh edge broadcasts a `PAIR_REQ` every
   ~700 ms.
3. The master **auto-adopts** any unpaired edge that asks during the window —
   up to its max of **4** edges. There is no "pick one from a list" step. (The
   app *can* still pick a specific discovered MAC if it wants, via the pair-MAC
   command, but it isn't required.)
4. Each newly paired edge is self-tested: the master waits ~6 s for that edge to
   poll back, proving the link works, and reports `pass`/`fail` in its status.

> **Caveat on the master's BOOT tap:** the tap doesn't *just* open the window —
> it also gives the master a **brand-new BLE identity** (a new `LP-<uid>` name)
> and reboots, which drops any connected phone. Existing edge pairings are
> **kept** (they key off MAC, not the BLE name, so the edges reconnect on their
> own). Because the BLE name changed, the app no longer recognises the car and
> **must re-add it**. So a BOOT tap is really "fresh identity + reopen pairing",
> not a bare pairing toggle. (A pure "open the window" is available from the app
> via the enter-discovery command, which does *not* change identity.)

### Re-pairing / moving an edge to a different master

Tap the **edge's** own BOOT/button once. It forgets its current master
(`forgetMaster()`), drops into PAIRING mode, and broadcasts to join whichever
master currently has its pairing window open.

### Button reference

| Board | Tap (short press) | Hold ~5 s |
|-------|-------------------|-----------|
| **master** | fresh identity + reopen the ~60 s pairing window (keeps existing edges; app must re-add the car) | **factory reset** — wipes the edge list *and* the UID, reboots with a new identity |
| **edge** | forget master & re-pair (advertise to join a master in pairing mode) | **factory reset** — wipes the master pairing *and* this edge's servo calibration |

Both boards debounce a press as: ≥30 ms release = tap; ≥5000 ms held = long
press (fires once at the 5 s mark). See `pollButton()` in each `main.cpp`.

> There is also a master-only serial command `u` (`unpairAllAndRepair`) that
> disconnects and forgets **all** edges but keeps the UID, then reopens pairing.
> It is not wired to the button — it's a bench helper only.

### LED states

| Board | LED | Meaning |
|-------|-----|---------|
| master | blinking (~4 Hz) | pairing window is open (blinks for the *whole* window, not just until an edge joins) |
| master | solid on | not pairing **and** at least one edge is paired |
| master | off | not pairing and no edges paired |
| edge | blinking | in PAIRING mode (broadcasting for a master) |
| edge | solid on | CONNECTING (reaching its saved master) or ONLINE |

---

## 5. BLE interface (master ⇄ phone)

The master advertises as **`LP-<uid>`** (e.g. `LP-2DD17AC9`) — the UID is
generated on first boot and persisted, so two cars don't clash. One service with
four characteristics:

| Purpose | UUID suffix | Access | Payload |
|---------|-------------|--------|---------|
| Service | `…0001` | — | — |
| Plate state | `…0002` | write / read | 1 byte: `0`=L, `1`=CENTER, `2`=P |
| Command | `…0003` | write | opcode byte (see below) |
| Status JSON | `…0004` | read / notify | status blob, pushed ~1/s |

**Command opcodes** (first byte of a write to the command characteristic):

| Opcode | Action |
|--------|--------|
| `1` | enter discovery (open pairing window) |
| `2` | factory reset the master |
| `3` | stop discovery |
| `4` | pair a specific discovered edge — followed by its 6 MAC bytes (7-byte write) |
| `5` | relay a servo-calibration step to one edge — `[5][edgeIdx][action][us_lo][us_hi]` |

The status JSON reports uptime, edge count, desired state, pairing flag, a
whole-system flip verdict (`nohw`/`ok`/`pending`/`failed`), the self-test
result, and per-edge rows (MAC, last-seen age, battery mV, current state) plus
any discovered-but-unpaired candidates.

---

## 6. Servo & power (edge)

The servo **is** driven for real now (via `ESP32Servo`); it's no longer a mock.

**Pins (XIAO ESP32-C3, edge):**

| Signal | Pin | Notes |
|--------|-----|-------|
| Re-pair / reset button | **D1** | momentary to GND, internal pull-up |
| Status LED | **D2** | blinks while pairing |
| Servo PWM signal | **D10** | the servo's control wire, driven straight from the GPIO |
| Servo power-enable (MOSFET gate) | **D9** | **inert** — no MOSFET is fitted (see below); pin is toggled but does nothing |

**Master pins:** BOOT button on **GPIO9** (the onboard button — no external
wiring), status LED on **D2**.

**No power MOSFET.** The design's low-side switch MOSFET was **removed**; the
servo now runs directly off the ESP's rail. `PIN_SERVO_PWR` (D9) is still
toggled in the code but is inert without a MOSFET wired. To keep the always-live
servo from browning out the rail, the firmware instead relies on **gentle
motion + releasing the signal**:

- **Ramped travel.** `movePlate()` steps the pulse width toward the target in
  small increments (`SERVO_STEP_US` = 15 µs every `SERVO_STEP_MS` = 12 ms),
  starting from the last known position so there's no jump. Slow motion = low
  peak current = no brownout, and smoother travel.
- **Release at rest.** After a `SERVO_SETTLE_MS` (120 ms) hold, the servo is
  detached and the PWM line driven **LOW**. An analog servo with no signal
  relaxes (low draw), and the plate rests on a mechanical stop.
- **Boot-settle.** The servo isn't driven until ~1.5 s after boot
  (`SERVO_BOOT_DELAY_MS`) so boot inrush + a move can't coincide and brown out.

**Calibration.** Each edge stores its own L / CENTER / P pulse widths in flash
(defaults 1300 / 1500 / 1700 µs, hard-clamped to 500–2500 µs). Calibrate per
plate either:

- **Over the air** — the app sends opcode `5` to the master, which relays a
  `SERVO_CAL` message to that edge. Actions: `0` = live jog to a µs value,
  `1` = save as L, `2` = save as P, `4` = save as CENTER, `3` = end / power off.
  A live jog auto-powers-off after ~8 s idle so a stalled servo can't drain the
  cell.
- **Over serial** — `c` starts a centred jog; `+`/`-` = ±25 µs, `]`/`[` =
  ±100 µs; `l`/`m`/`p` save the current position as L / Center / P; `x` ends.

**Battery soft-cutoff.** `lib/power/battery.h` gives battery-powered boards a
low-voltage guard. Every 5 s the edge reads the cell (averaged) via an A0
resistor divider; if it's in the "plausible but low" band (below `CUTOFF_V`
3.20 V, above the `SENSE_FLOOR` 2.50 V, confirmed twice), it cuts the servo and
enters **deep sleep forever** (`parkForever()`) so the cell isn't
over-discharged. **Power-cycle to recover.** With no divider wired A0 reads
~0 V, which is below the floor, so the guard does nothing — it can't false-trip
a USB/bench board. This is a *soft* guard, not a substitute for a protected
cell / BMS.

---

## 7. File layout & build environments

```
esp32/
├─ platformio.ini            ← defines the build "environments"
├─ lib/
│  ├─ protocol/protocol.h    ← SHARED ESP-NOW message contract (master + edge)
│  └─ power/battery.h        ← shared low-voltage cutoff (edge + batt test)
└─ src/
   ├─ master/main.cpp        ← master firmware   (env:master)
   ├─ edge/main.cpp          ← edge firmware     (env:edge)
   ├─ batt/main.cpp          ← bench: battery/heartbeat test (env:batt)
   └─ pinscan/main.cpp       ← bench: servo-pin finder        (env:pinscan)
```

`platformio.ini` environments (each `build_src_filter` picks one `src/`
subfolder so only that firmware compiles):

| Env | What it builds | Key lib_deps |
|-----|----------------|--------------|
| **master** | the OBD controller | `NimBLE-Arduino@^1.4.2` (BLE) |
| **edge** | a plate board | `ESP32Servo@^1.1.1` (servo) |
| **pinscan** | bench servo-finder: sweeps a 50 Hz servo signal on **all** pads D0..D10 at once, so you can plug the servo into any pad to find a good solder joint | — |
| **batt** | bench battery test: blinks the LED as a heartbeat + prints cell voltage; parks on low battery | — |

`default_envs = master, edge`, so a bare `pio run` builds both firmwares (not
the bench sketches).

### `lib/protocol/protocol.h` — the contract

ESP-NOW copies a struct's bytes verbatim from one chip to the other, so both
firmwares must agree on the exact byte layout — hence one definition, shared,
with `__attribute__((packed))` to strip padding. Message types:

| Struct | Direction | Meaning |
|--------|-----------|---------|
| `PairReqMsg`  | edge → master (broadcast) | "pair me" |
| `PairAckMsg`  | master → edge (unicast)   | "you're paired" |
| `PollMsg`     | edge → master (unicast)   | "what should I be?" (+ battery mV + current state) |
| `CmdMsg`      | master → edge (unicast)   | "be this" (+ `next_poll_ms`) |
| `UnpairMsg`   | master → edge (unicast)   | "forget me, go back to pairing" |
| `ServoCalMsg` | master → edge (unicast)   | "jog / save a servo end-point" |

All traffic is **plaintext** — there is no encryption, PMK, or LMK in the code.

---

## 8. Building & flashing

PlatformIO lives at `~/.platformio/penv/bin/pio` (bare `pio` isn't always on
your PATH). Run from the `esp32/` folder:

```bash
# compile only
~/.platformio/penv/bin/pio run -e master
~/.platformio/penv/bin/pio run -e edge

# compile + flash a connected board, then watch serial output (Ctrl-C to quit)
~/.platformio/penv/bin/pio run -e edge   -t upload -t monitor
~/.platformio/penv/bin/pio run -e master -t upload -t monitor

# bench helpers
~/.platformio/penv/bin/pio run -e pinscan -t upload
~/.platformio/penv/bin/pio run -e batt    -t upload
```

`-e` picks the environment. Bare `pio run` builds `master` + `edge`.

> **Editor squiggles:** your IDE's clang may underline `Arduino.h not found` or
> `unknown type …`. That's just the language server missing the ESP32 include
> paths — **ignore it**. If `pio run` says SUCCESS, the code is fine.

---

## 9. Bench-testing the pairing + toggle path

1. Flash one board as **master**, another as **edge** (each in its own terminal
   with `-t monitor`).
2. The fresh edge prints `PAIR_REQ broadcast...` repeatedly (nothing saved yet).
3. **Tap the master's BOOT button.** It enters discovery (LED blinks); the
   master logs `PAIR_REQ from …` and auto-adopts the edge; the edge prints
   `PAIRED to …`. They're now bound in flash.
4. The edge switches to `POLL sent` on its cadence; the master logs each
   `POLL … -> reply desired=…` and runs its ~6 s self-test.
5. Connect a BLE app (**nRF Connect**) to the master — it advertises as
   `LP-<uid>`. Write `00`/`01`/`02` to characteristic `a1b2c3d4-0002-…` to
   command L / CENTER / P; the edge's next reply picks it up and moves the servo.
6. Power-cycle both — they reconnect automatically (pairing persisted). Hold a
   button ~5 s to factory-reset.

**Serial bench shortcuts.** Master: `p` discovery, `u` disconnect-all + wipe +
re-pair, `l` list candidates, `0`–`5` pair candidate N, `r` factory reset,
`s` status. Edge: `p` re-pair, `r` factory reset, `c` start servo calibration
(then the jog keys above), `s` status.

---

## 10. Known gotchas

- **Arduino-ESP32 core is 2.0.x (IDF 4.4).** The ESP-NOW receive callback uses
  the **legacy signature** `void cb(const uint8_t* mac, const uint8_t* data,
  int len)` — sender MAC is the first argument. The newer
  `esp_now_recv_info_t*` form only exists on IDF 5 / core 3.x and will **not**
  compile here.
- **NimBLE must be the 1.x line** (`@^1.4.2`); 2.x requires core 3.x.
- **GPIO9 is the boot-strapping / BOOT pin.** The master reads it as its button;
  fine because it's only read at runtime, but don't tie anything that pulls it
  low at reset.
- **This repo is inside OneDrive.** The cloud-sync client has corrupted source
  files mid-edit (scrambled/duplicated lines → bogus compile errors). If a build
  fails on code that looks correct, re-save the file — or move the project out of
  OneDrive.
- **The master can flatten the *car* battery.** Most cars keep OBD pin 16 live
  with the ignition off, so an always-on ESP32-C3 (~50–80 mA) is a parasitic
  drain over a week or two of the car sitting. A low-power (light-sleep when idle)
  behaviour on the master is still a TODO.

---

## 11. Status / what's implemented

- [x] Two build environments (master/edge) + two bench sketches, shared protocol
- [x] Real-MAC pairing: 60 s window, **auto-join** of any unpaired edge (up to 4)
- [x] Persistent pairings + per-master UID / per-edge servo calibration (NVS)
- [x] BLE server on the master, unique per-car name `LP-<uid>`, status JSON
- [x] Poll → reply → **real servo move** (ramped, calibrated 3-state L/CENTER/P)
- [x] Over-the-air servo calibration (app → master → edge)
- [x] Battery voltage read + low-voltage deep-sleep cutoff on the edge
- [x] Phone-presence poll cadence (fast ~300 ms connected / ~3 s idle)
- [ ] Encryption on ESP-NOW traffic (currently plaintext)
- [ ] Real deep-sleep between polls for months-scale battery life
- [ ] Richer adaptive cadence (speed + state + time-of-day) — see §3
- [ ] Master low-power behaviour (protect the car battery)
