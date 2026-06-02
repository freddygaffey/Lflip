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
Trade-off: worst-case time to raise a plate ≈ one poll interval. Fine for
L-plates — and the interval isn't fixed, it adapts (below).

### Adaptive poll cadence (the battery story)

The edge's poll interval is **not constant**. The master computes the next one
on every reply and hands it back inside the `CmdMsg` (a `next_sleep_s` field);
the edge just obeys and sleeps that long. The master picks the interval from
four signals, fastest-wins:

1. **Phone presence.** The master is the BLE server, so it knows for free
   whether the phone is connected. Phone connected ⇒ a trip is happening ⇒ poll
   **fast (~1 s)** for snappy toggles.
2. **Speed** (streamed from the app's GPS over BLE while connected).
   Stopped / `<15 km/h` ⇒ pulling in/out, parking, drop-off ⇒ **fast**; cruising
   `>40–100 km/h` ⇒ committed to the drive, nothing to toggle ⇒ **slow
   (~5–10 s)**. This saves the most energy, because the highway cruise is the
   bulk of a drive and is exactly when responsiveness matters *least*.
3. **Current plate state.** `DOWN` (the illegal-if-driving state) ⇒ poll
   **faster**, so a raise happens promptly; `UP` (the safe state) ⇒ poll lazily.
4. **Time of day** (used when no phone is around). Short baseline during
   likely-driving windows (school run ~7–9 am, evening ~4–7 pm) so the edge
   *discovers* the phone within seconds when driving is probable; longer midday;
   very long overnight (~60 s+, the car is parked).

> **Hard boundary:** speed and time change *how often we check* — **never the
> plate state**. Whose trip it is (learner vs parent) is always a human choice;
> it can't be inferred from speed.

**Where the master gets the time:** it has no internet in the OBD port. Either
the phone writes the current epoch time over BLE on each connect (cheap,
re-synced every drive — start here) or fit a **DS3231 RTC** (battery-backed,
survives power loss).

Rough budget, one 18650 (~3000 mAh), edge awake ~150 ms per poll @ ~80 mA:

| Window | Cadence | ~Daily cost |
|--------|---------|-------------|
| Night (10 pm–4 am) | 60 s | ~1.5 mAh |
| Midday idle | 60 s | ~2.5 mAh |
| Commute windows (~5 h) | 5–10 s | ~6 mAh |
| Actually driving (~1 h, phone present, speed-aware) | 1–10 s | ~6–12 mAh |
| **Total** | | **~20 mAh/day → ~3–4 months** |

The always-awake placeholder loop in the current firmware lasts only **~2–3
days**; the months-scale figure needs the deep-sleep + adaptive cadence above.

### Fail-safe: default to plates UP

The legal risk is **one-directional**:

- Plates **UP while parked** — legal (just unnecessary).
- Plates **DOWN while driving** — **illegal**.

So the whole system **fails toward UP**. On boot, on wake, on lost comms, on any
uncertainty, the edge defaults to **plates displayed**. Because of the same
asymmetry, *lowering* can be lazy (a parent's plates retracting a little slowly
is legal-but-cosmetic) while *raising* must be eager — which is why the `DOWN`
state polls faster.

Normal operation still commands the state explicitly (parent ⇒ DOWN, learner ⇒
UP); the UP bias only governs the degraded / uncertain case. Concretely:
**boot/wake default = UP**, and **edge raises if it misses N consecutive polls.**

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
| **Mock servo** *(edge, now)* | **D10 (GPIO10)** | bench stand-in: **HIGH = open/UP, LOW = closed/DOWN**. Put an LED/meter here to watch toggles. |
| MOSFET gate / power-enable *(edge)* | **D10 (GPIO10)** | the mock pin becomes the servo **power switch**; gate via ~150 Ω, 10 kΩ gate→GND pulldown |
| Servo PWM signal *(edge)* | **D9 (GPIO9)** | the servo's control wire — low current, driven straight from the GPIO via ESP32Servo. *(GPIO9 is a boot-strapping pin; the servo's signal input is high-impedance so it won't affect boot, but don't tie anything that pulls it low at reset.)* |

The master also needs its 12 V→5 V supply from the OBD port; the edges run from
1–3 × 18650.

> **Why two pins for the servo?** Cutting the power rail (D10) isn't enough on
> its own: while the servo is unpowered, its **signal wire** at 3.3 V can
> backfeed through the servo and leak. So the firmware drives the PWM pin
> **LOW** whenever it cuts power. `movePlate()` = enable power → send PWM to the
> angle → wait `SERVO_TRAVEL_MS` → detach + PWM LOW → cut power; the mechanical
> rest holds the plate. Tune `SERVO_UP_DEG` / `SERVO_DOWN_DEG` to your stops.

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
5. Connect a BLE app (**nRF Connect**) to the master — it advertises a **unique
   per-car name `LP-<uid>`** (e.g. `LP-2DD17AC9`), generated on first boot and
   saved, so two cars don't clash. Write `01` to characteristic
   `a1b2c3d4-0002-…`. The edge's next reply flips to `desired=1` and it drives
   D10 (mock servo) HIGH.
6. Power-cycle both — they reconnect automatically (pairing persisted). Hold a
   button 5 s to factory-reset.

---

## 8. Hardware notes (servo + power, coming next)

Each edge drives its servo through an **N-channel MOSFET used as a low-side power
switch** (the MOSFET sits between the servo's GND and battery GND; gate ← D10):

- Gate HIGH → servo's ground path closed → servo powered; gate LOW → open → servo
  fully off (≈0 draw while asleep).
- **~150 Ω gate resistor** in series with D10, and a **10 kΩ gate→GND pulldown**.
  The pulldown is essential: during boot and **deep sleep** the GPIO floats, and
  without it the gate could half-turn-on and quietly drain the 18650s.
- Common ground: ESP32 GND and battery − tie together at the MOSFET source.
- Move sequence: power on → send PWM → wait → PWM LOW → cut power. The plate rests
  against a mechanical stop so it holds position with **no power**.

**You can't skip the MOSFET and power the servo from a GPIO.** A pin sources only
~20 mA (40 mA absolute max); a servo pulls 150 mA–2.5 A. The GPIO can drive the
*signal* wire directly, but the *power rail* needs a switch element. The XIAO has
**no software-switchable power rail** of its own (its `3V3` is always-on), so a
MOSFET — or a load-switch IC — is the minimum required part.

**Choosing the part (gate driven at 3.3 V):**

- ✅ **AO3400 / SI2302** (SOT-23, tiny — ideal for a battery board) or **IRLB8721**
  (TO-220) — these are *fully on* at ~2.5 V, so they're happy at 3.3 V.
- ⚠️ **IRLZ44N** *works* for one small servo but isn't ideal: its R<sub>DS(on)</sub>
  is specified at **V<sub>GS</sub> = 5 V**, and it's a 47 A TO-220 brick — overkill,
  and only partially enhanced at 3.3 V.
- ❌ **IRF540** and other non-logic-level FETs won't switch properly at 3.3 V.
- 🧩 **Tidier alternative:** a **load-switch IC** (e.g. **TPS22918**, AP22802) is a
  packaged MOSFET with the gate resistor/pulldown built in — feed it `VIN`,
  `VOUT`, `GND`, and an `ON` pin straight from D10.

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
- **The master can flatten the *car* battery.** Most cars keep OBD pin 16 live
  even with the ignition off, so an always-on ESP32-C3 (~50–80 mA) is a parasitic
  drain that will run a car battery down over a week or two of the car sitting.
  The master needs its own low-power behaviour (light-sleep when no phone has
  connected and no edge has polled for a while) — same presence/time logic as the
  edges, applied on the master side.

---

## 10. Status / what's left

- [x] Project skeleton, two build environments, shared protocol header
- [x] Real-MAC pairing with a button + auto-pair on first boot
- [x] ESP-NOW encryption (PMK + per-system LMK) on poll/command traffic
- [x] Persistent storage of pairings (survives power-off)
- [x] BLE server on the master, unique per-car name `LP-<uid>`
- [x] Poll → reply → plate move, **mocked on D10** (HIGH=UP, LOW=DOWN)
- [x] Phone-app BLE integration in the Lflip Vue app (per-car `plateLink`,
      trip-scoped connect + car-edit test buttons)
- [ ] Real servo + MOSFET `movePlate()` (power-enable + PWM) on the edge
- [ ] Deep sleep + battery voltage read on the edge
- [ ] Adaptive poll cadence (presence + speed + state + time-of-day) — see §2
- [ ] Fail-safe default-UP on boot/lost-comms — see §2
- [ ] Phone→master time sync + speed streaming over BLE
- [ ] Master low-power behaviour (protect the car battery)
