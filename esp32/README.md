# L-Plate Hardware Firmware

Motorised L-plates for a car, controlled from the Lflip phone app. This folder
is one **PlatformIO** project that builds **two different firmwares** from
shared code.

---

## 0. Design brief (the original spec)

The architecture as defined for this device:

- **Three ESP32-C3 boards.**
- **Two "edge" boards — one on the front, one on the back (each end of the
  car).** Each edge has:
  - a **servo motor** driven by a **PWM** signal, to raise/lower the plate;
  - a **MOSFET** in line with the servo's power, so the servo can be switched
    fully off (no draw) to allow **deep sleep**;
  - **one to three 18650 batteries** for long-term power.
- **Edge power goal: minimise power usage.** Either **deep sleep** or **light
  sleep with dynamic polling** (to be decided). Target a **30-second polling
  interval as the minimum**, with room for **non-linear scheduling** — e.g.
  polling much less often at night, since the car is physically parked.
- **Scheduling/tracking lives on the always-powered ESP** (the master), because
  it has constant power and can keep time.
- **Master board** is mounted **through the car's OBD port** (constant 12 V
  power) and acts as the **master controller**.
- The master **connects to the phone** running the **L-plate app** (the Lflip
  app, in the parent directory). In the app you **toggle the L-plates on/off**,
  which raises/lowers the servos.

**Implementation decisions made on top of the brief:**

- **No front/back roles.** Every edge runs identical firmware. The master keeps
  an **array** of paired edges; the plates all move together from one toggle.
- **Comms: ESP-NOW with real-MAC pairing** (not plain broadcast). Boards pair
  once, remember each other's MAC in flash, and from then on talk **encrypted**
  point-to-point. This stops two cars in the same car park from interfering.
- **Encryption is required.** Traffic uses ESP-NOW's built-in CCMP encryption.
- **Servo holding: MOSFET-cut + mechanical rest** — move the servo, then cut its
  power; the plate rests against a mechanical stop so it holds with no power.
- **Code organisation: one repo, multiple PlatformIO environments + a shared
  library** for the message definitions.

---

## 1. The idea in one picture

```
        ┌─────────────┐   BLE    ┌──────────────────────┐
        │  Lflip app  │◄────────►│   MASTER  (in OBD)    │
        │  (phone)    │  toggle  │   ESP32-C3, 12V power │
        └─────────────┘  status  │   always on          │
                                 └──────────┬───────────┘
                          ESP-NOW (encrypted unicast, channel 1)
                                 ┌──────────┴───────────┐
                                 ▼                      ▼
                        ┌──────────────────┐  ┌──────────────────┐
                        │ EDGE (a plate)   │  │ EDGE (a plate)   │
                        │ C3 + servo+MOSFET│  │ C3 + servo+MOSFET│
                        │ 18650, deep-sleep│  │ 18650, deep-sleep│
                        └──────────────────┘  └──────────────────┘
```

| Role | Where | Power | Job |
|------|-------|-------|-----|
| **Master** | car's OBD port | always on (car 12 V) | talks to the phone over Bluetooth; tells the plates what to do; holds the pairings |
| **Edge** (1+) | each plate | 18650 battery, sleeps to save power | drives a servo (via a MOSFET) to raise/lower the plate |

---

## 2. How a toggle flows

The phone never talks to the plates directly. The master is the middle-man and
the single "source of truth" for what the plates *should* be doing.

1. **Phone → Master (BLE):** you tap the toggle. The phone writes one byte
   (`0` = down, `1` = up) to the master.
2. **Master stores it:** the master keeps one `desiredState` value. That's all
   the BLE write does — update the wanted state.
3. **Edge asks (ESP-NOW):** each edge periodically wakes and sends an encrypted
   `PollMsg` to the master: *"battery is X, I'm currently down — what now?"*
4. **Master replies (ESP-NOW):** it sends back an encrypted `CmdMsg`: *"be UP."*
5. **Edge acts:** if that differs from what it's doing, it powers the servo,
   moves the plate, cuts power, and sleeps again.

### Why polling instead of pushing?

A **deep-asleep radio can't receive anything**, so the master can't push to a
sleeping edge. The edge wakes on its own timer and *pulls* the latest state.
Trade-off: worst-case time to raise a plate ≈ one poll interval (start: 30 s).
Fine for L-plates.

---

## 3. Pairing & security (the "unboxing")

Plain broadcast would let a second system nearby hear your messages. Instead the
boards **pair once** and then only talk to known MACs, encrypted.

**What gets saved (in flash / NVS, survives power-off):**

| Board | Remembers |
|-------|-----------|
| Master | the list of edge MACs + a randomly-generated system key (LMK) |
| Edge | the master's MAC + that same system key (LMK) |

**The pairing handshake** (the standard ESP-NOW auto-pairing pattern — see
`github.com/tomorrow56/ESPNowAutoPairing` — with encryption added on top):

1. **Master:** tap the **pairing button**. It listens for 60 s (LED blinks).
2. **Edge:** a brand-new edge (nothing saved yet) automatically broadcasts a
   `PAIR_REQ`. (You can force this later by tapping the edge's button.)
3. **Master** hears it, records the edge's MAC, and replies with a `PAIR_ACK`
   that carries the **system key (LMK)**.
4. Both sides switch that link to an **encrypted peer** using the key. The edge
   saves the master's MAC + key to flash. Done — they're bound for good.
5. From now on every `POLL`/`CMD` is **CCMP-encrypted unicast**.

**Encryption details:** a fixed product-wide **PMK** is compiled into every
board (`ESPNOW_PMK` in `protocol.h`); the master generates a **random per-system
LMK** the first time it pairs anything. The PMK protects the LMK; the LMK
encrypts the actual traffic. The only moment a key is exposed is the brief, user-
initiated `PAIR_ACK` — the same "trust on first use" model as Bluetooth pairing.

**Reset:**

- **Master** — hold the button **5 s** → factory reset (forgets all edges).
- **Edge** — tap = re-pair (forget master); hold **5 s** → factory reset.

---

## 4. File layout

```
esp32/
├─ platformio.ini          ← project config: defines the two build "environments"
├─ lib/
│  └─ protocol/protocol.h  ← SHARED message definitions + keys (the "contract")
└─ src/
   ├─ master/main.cpp      ← master firmware  (built by env:master)
   └─ edge/main.cpp        ← edge firmware    (built by env:edge)
```

### `platformio.ini` — the project brain

- `[env]` holds settings shared by everything (board, framework, baud rate).
- `[env:master]` / `[env:edge]` are two **separate build targets** from the same
  repo. Each sets a flag (`-D ROLE_MASTER` / `-D ROLE_EDGE`) and a
  `build_src_filter` picking which `src/` subfolder to compile.
- `lib_deps` under `[env:master]` pulls in **NimBLE 1.x** (only the master needs
  Bluetooth).

### `lib/protocol/protocol.h` — the contract

ESP-NOW copies the bytes of a struct from one chip to the other, so both
firmwares **must agree on the exact byte layout**. Defining it once, here,
guarantees that. The four message types:

| Struct | Direction | Encrypted? | Meaning |
|--------|-----------|-----------|---------|
| `PairReqMsg` | edge → master (broadcast) | no | "pair me" |
| `PairAckMsg` | master → edge (unicast)   | no | "you're paired — here's the key" |
| `PollMsg`    | edge → master (unicast)   | **yes** | "what should I be?" (+ battery) |
| `CmdMsg`     | master → edge (unicast)   | **yes** | "be this" |

`PROTO_VERSION` lets a mismatched board ignore garbage. `__attribute__((packed))`
stops the compiler inserting padding that would break the layout.

---

## 5. Wiring (per board)

| Signal | Pin | Notes |
|--------|-----|-------|
| Pairing/reset button | **D1 (GPIO3)** | momentary button to **GND**; uses the internal pull-up |
| Status LED | **D2 (GPIO4)** | LED + resistor to GND; blinks while pairing |
| Servo signal *(edge, later)* | TBD | PWM out |
| MOSFET gate *(edge, later)* | TBD | switches servo power; 100 kΩ gate→GND pulldown |

The master also needs its 12 V→5 V supply from the OBD port; the edges run from
1–3 × 18650.

---

## 6. Building & flashing

PlatformIO lives at `~/.platformio/penv/bin/pio` (the bare `pio` isn't always on
your PATH). Run these from the `esp32/` folder:

```bash
# compile only
~/.platformio/penv/bin/pio run -e master
~/.platformio/penv/bin/pio run -e edge

# compile + flash a connected board, then watch serial output
~/.platformio/penv/bin/pio run -e edge -t upload -t monitor   # Ctrl-C to quit
```

`-e` picks the environment. Bare `pio run` builds both.

> **Editor squiggles:** your IDE's clang may underline `Arduino.h not found` or
> `unknown type ...`. That's just the language server missing the ESP32 include
> paths — **ignore it**. If `pio run` says SUCCESS, the code is fine.

---

## 7. Testing the pairing + toggle path (no servo yet)

1. Flash one board as **master**, another as **edge** (each in its own terminal
   with `-t monitor`).
2. The fresh edge prints `PAIR_REQ broadcast...` repeatedly (nothing saved yet).
3. **Tap the master's button.** It prints `PAIRING MODE on`, then `PAIR_REQ
   from ...`, and the edge prints `PAIRED to ...`. They're now bound in flash.
4. The edge switches to `POLL sent` every few seconds; the master logs each
   `POLL ... -> reply desired=0`.
5. Connect a BLE app (**nRF Connect**) to **"L-Plate Master"** and write `01` to
   characteristic `a1b2c3d4-0002-…`. The edge's next reply flips to `desired=1`
   and it logs the (simulated) move.
6. Power-cycle both — they reconnect automatically (pairing persisted). Hold a
   button 5 s to factory-reset.

---

## 8. Hardware notes (servo + power, coming next)

Each edge will drive its servo through a **logic-level N-channel MOSFET** used as
a power switch:

- Gate HIGH → servo powered; gate LOW → servo fully off (≈0 draw while asleep).
- A **100 kΩ gate-to-GND pulldown** keeps the servo off during boot/sleep.
- Move sequence: power on → send PWM → wait → cut power. The plate rests against a
  mechanical stop so it holds position with **no power**.
- Use a MOSFET fully on at 3.3 V gate (e.g. AO3400 / IRLZ44N). A plain IRF540
  won't switch properly at 3.3 V.

---

## 9. Known gotchas (don't re-learn these the hard way)

- **Arduino-ESP32 core is 2.0.17 (IDF v4.4.7).** The ESP-NOW receive callback
  uses the **legacy signature** `void cb(const uint8_t* mac, const uint8_t* data,
  int len)` — sender MAC is the first argument. The newer `esp_now_recv_info_t*`
  form only exists on IDF 5 / core 3.x and will **not** compile here.
- **NimBLE must be the 1.x line** (`@^1.4.2`); 2.x requires core 3.x.
- **This repo is inside OneDrive.** The cloud-sync client has corrupted source
  files mid-edit (duplicated/scrambled lines → bogus compile errors). If a build
  fails on code that looks correct, the file may be corrupted — re-save it, or
  better, **move the project out of the OneDrive folder.**

---

## 10. Status / what's left

- [x] Project skeleton, two build environments, shared protocol header
- [x] Real-MAC pairing with a button + auto-pair on first boot
- [x] ESP-NOW encryption (PMK + per-system LMK) on poll/command traffic
- [x] Persistent storage of pairings (survives power-off)
- [x] BLE server on the master the phone connects to
- [x] Poll → reply → (simulated) plate move
- [ ] Servo + MOSFET `movePlate()` on the edge
- [ ] Deep sleep + battery voltage read on the edge
- [ ] Non-linear poll scheduling (less often at night)
- [ ] Phone-app BLE integration in the Lflip Vue app
