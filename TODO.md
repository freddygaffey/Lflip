# TODO

Outstanding work, ordered by what actually gates the demo.
Hand-in **Thu 27 Aug 2026**. Marking **Mon 7 – Fri 18 Sep 2026** (possibly Sat 12 Sep).

Bugs with reproduction steps live in `BUGS.md`. This is the work list.

---

## Do first

- [ ] **Rotate the VPS SSH key.** `keys_to_the_server.txt` held the private key for
      `sir@lflip-flask` in plaintext inside a OneDrive-synced folder, so it has left
      this machine. Generate a new keypair, add the new public key to the server's
      `authorized_keys`, remove the old one. The file is deleted and gitignored, but
      deleting a leaked key doesn't unleak it.
- [ ] **Deploy the backend.** The CORS anchor fix (`3657dda`) is committed but the VPS
      is still running the old code. Run `pull_and_restart.sh`. Keep dev == main.

## Hardware — nothing below has ever run on a board

- [ ] **Flash and verify the locked demo build.** `master_demo` + `edge_demo` compile
      and are committed, but have never been flashed. Confirm: boots pre-paired with
      no negotiation, advertises the fixed name `Lplate-DEM01`, plate toggles L/Center/P.
      The whole "guaranteed demo" rests on this and it is currently unproven.
      Flash both together, then don't touch them.
- [ ] **Settle the USB re-plug gesture.** Three attempts, no evidence either way.
      Window is now 25 s. One question decides it: *does the LED blink when you
      re-plug?* If no, `HWCDC::isPlugged()` isn't seeing the cable and it needs a
      VBUS-sense pin instead — or dropping, since the button tap already works.
- [ ] **Test the BLE `localName` fix** (`0c462ca`) with a phone. This is the
      "can't see the device" bug. Written, committed, never tested on a device.
- [ ] **Drive-test background GPS.** Untested on hardware since `972c19d`.
- [ ] **Build the A0 battery divider.** Without it the readings are a floating pin
      (280–1740 mV observed; a real cell is 3000–4200 mV) and the low-voltage cutoff
      is inert. Then calibrate `DIVIDER` in `lib/power/battery.h` against a multimeter
      — 3.13 is a placeholder and wrong for two cells in series.

## Firmware bugs (stock build — DEMO_LOCK sidesteps these, Kit A doesn't)

- [ ] **Debounce `pollButton()`** (`esp32/src/master/main.cpp`). `freshPairingReset()`
      fires unprompted and mints a new UID, so the BLE name changed six times in one
      session and broke the app's saved `ble_device_name` each time. Require GPIO9 LOW
      for ~50 ms and ignore presses in the first second after boot.
- [ ] **Give the plate a missed-poll counter.** `runOnline()` logs
      `no reply (master out of range?)` forever with no fallback, so a plate whose
      master dropped it polls into the void indefinitely. ~5 unanswered polls → seek.
- [ ] **Make unpair converge.** A plate that leaves never tells the master, which keeps
      a phantom entry holding a `MAX_EDGES` slot. Fire-and-forget UNPAIR, no ack.

## App

- [ ] **Kit B app behaviour.** Disable unpair at runtime when connected to
      `Lplate-DEM01`, showing "permanently paired for the demo — use the other phone".
      Detect it from the device name rather than shipping a second app build, so the
      wrong build can't end up on the wrong phone.
- [ ] **Keep Kit A permanently in pairing.** `PAIR_WINDOW` is 60 s and auto-closes;
      simplest is the app re-sending the discovery opcode rather than a new firmware mode.
- [ ] Fix `/api/register` 500 on the dev backend.
- [ ] Fix `signOut` wiping everything via `Preferences.clear()`.
- [ ] Fix the silent navigation failure in `login.vue`.
- [ ] Add `SurveyOverlay.vue` and `classes/survey.ts` to git — untracked means they're
      outside lint and type-checking.

## Logistics — depends on other people, start early

- [ ] Send the Service Desk email (two iPhones, USB-C power, stands, clean network,
      config freeze, and access to test in advance).
- [ ] Friend registers `com.pebnum.lflip` as an explicit App ID and creates the app in
      App Store Connect. Then set his team in Xcode → Signing & Capabilities.
- [ ] Install directly on the two school phones for marking. Do **not** make the demo
      depend on App Store review.
- [ ] Record a hardware demo video for the App Store review notes — a reviewer can't
      test BLE hardware they don't have, and this is the likeliest rejection reason.
- [ ] Freeze the demo build, install it, *then* submit that same build for review.

## After submission

- [ ] The 5 remaining npm advisories: `vitest` 0.34→4, `vite` 5→8, `@vitejs/plugin-vue`
      4→6, plus esbuild and vite-node. All dev/build tooling that never ships in the
      app; vite 5→8 is three majors and a real risk to the build.
- [ ] The pairing roadmap: unilateral leave, silence-based convergence, MAC-derived
      stable identity, app-led plate selection, identify command, shared LED language.
