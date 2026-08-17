// EDGE firmware — plate controller. Battery powered. Identical on every edge.
//
//   * Unpaired (fresh out of the box): broadcast PAIR_REQ until a master answers,
//     then save the master's MAC to flash.
//   * Paired: poll the master for the desired plate state and act.
//   * Button: tap = re-pair (forget master); hold 5 s = factory reset.
//   * USB gesture: with the lead in a computer, unplug/replug it a few times in
//     quick succession to re-pair (see pollUsbGesture). Handy when there's no
//     button to hand — the battery keeps the board alive while USB is out.
//
// (Servo + deep sleep come in a later phase; for now it logs the move.)
#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include <Preferences.h>
#include <ESP32Servo.h>
#include "esp32-hal.h"
#include "protocol.h"
#include "battery.h"

constexpr int PIN_BUTTON    = D1;   // re-pair / reset button to GND
constexpr int PIN_LED       = D2;   // status LED (blinks while pairing)
constexpr int PIN_SERVO_PWR = D9;   // MOSFET gate: HIGH = servo powered, LOW = off
constexpr int PIN_SERVO_PWM = D10;  // servo control signal (PWM)

// Servo travel, in PWM microseconds (NOT degrees). Driving by µs lets us set the
// two end-points just SHORT of the mechanical stops so the servo never stalls and
// grinds against them. These are per-edge and saved in flash; calibrate each plate
// from the app (or the serial jog mode) to its own stops. The defaults are a safe
// centred range so a fresh, uncalibrated board can't slam into a stop.
constexpr int SERVO_US_MIN  = 500;     // absolute clamp — never command outside
constexpr int SERVO_US_MAX  = 2500;    // these (servo's electrical limits)
// Three positions: L face, CENTER (edge-on / off), P face. Safe centred defaults
// until calibrated; the user dials each to its real spot from the app.
constexpr int SERVO_L_US_DEFAULT      = 1300;
constexpr int SERVO_CENTER_US_DEFAULT = 1500;
constexpr int SERVO_P_US_DEFAULT      = 1700;
// Motion is RAMPED (stepped) rather than a single slam to the target. Moving
// slowly limits the servo's peak current so it can't brown out the shared rail
// (there is no power MOSFET fitted — the servo runs straight off the ESP's rail),
// and it makes the travel smooth. Tune STEP_MS up = gentler/slower.
constexpr int      SERVO_STEP_US   = 15;    // pulse increment per ramp step
constexpr uint32_t SERVO_STEP_MS   = 12;    // delay per step (speed -> peak current)
constexpr uint32_t SERVO_SETTLE_MS = 120;   // hold at target before releasing PWM
constexpr uint32_t SERVO_BOOT_DELAY_MS = 1500;  // don't drive the servo until ~1.5s after boot

// Calibrated positions, loaded from flash (fall back to the safe defaults).
int lUs      = SERVO_L_US_DEFAULT;
int centerUs = SERVO_CENTER_US_DEFAULT;
int pUs      = SERVO_P_US_DEFAULT;

// Map a logical plate position to its calibrated servo pulse.
static int usForState(PlateState s) {
  switch (s) {
    case PlateState::L: return lUs;
    case PlateState::P: return pUs;
    default:            return centerUs;   // CENTER
  }
}

Servo plateServo;

static const uint8_t BCAST[6] = { 0xFF,0xFF,0xFF,0xFF,0xFF,0xFF };
// ── DEMO_LOCK: see the matching block in src/master/main.cpp ─────────────────
// Master MAC compiled in, boots straight to ONLINE, fast poll, and the button /
// USB gesture / UNPAIR paths are all disabled so nothing can unpair it mid-demo.
// Flash: -e edge_demo  (must be paired with -e master_demo)
#ifdef DEMO_LOCK
constexpr bool     DEMO_LOCKED        = true;
constexpr uint8_t  DEMO_MASTER_MAC[6] = { 0xB0, 0xA6, 0x04, 0x07, 0x0D, 0x30 };
constexpr uint32_t DEMO_POLL_MS       = 300;
#else
constexpr bool     DEMO_LOCKED        = false;
#endif

// ── Ship mode: asleep until first plugged in ─────────────────────────────────
// A plate leaves the factory dormant so it can't flatten its cell sitting in a
// box. The first time it sees a USB host it commissions itself, and from then
// on it boots normally forever — the gate is a one-way door.
//
// The C3 can't be woken by USB (no VBUS on a wake-capable pin), so we wake on a
// timer, look, and sleep again. Two escape hatches so a bad reading can never
// strand a plate: holding the button at any wake also commissions it, and after
// SHIP_MAX_WAKES it gives up and commissions anyway.
constexpr uint32_t SHIP_WAKE_S    = 8;      // look for a host this often
constexpr uint32_t SHIP_MAX_WAKES = 10800;  // ~24h, then commission regardless

constexpr uint32_t POLL_EVERY = 3000;   // ms between polls (30000 later)
constexpr uint32_t REQ_EVERY  = 700;    // ms between pair requests
constexpr uint32_t CONNECT_WINDOW = 60000;  // on boot, try saved master this long before pairing

// ── "unplug/replug the USB lead a few times to re-pair" gesture ──────────────
// The board is battery-powered, so pulling the lead doesn't reset it — we can
// watch the cable come and go. The C3's native USB peripheral flags host
// presence from the 1 kHz SOF frames the host broadcasts (HWCDC::isPlugged), so
// this needs no extra wiring or VBUS-sense pin. Re-insert the lead this many
// times inside the window and the plate forgets its master and starts
// broadcasting to be adopted: same as the serial 'p' key or a button tap.
constexpr uint8_t  REPLUGS_TO_PAIR   = 3;      // re-insertions needed to trigger
constexpr uint32_t GESTURE_WINDOW_MS = 25000;  // they must all land inside this
                                               // (a human cycle is ~4s, so 3 need ~13s)
constexpr uint32_t PLUG_DEBOUNCE_MS  = 200;    // ignore edges faster than a human

// Three-state machine driving loop():
//   CONNECTING — paired board just booted; trying to reach its saved master.
//   ONLINE     — master answered; normal poll-and-move.
//   PAIRING    — no master found (or never paired); broadcast to be adopted.
enum class Mode : uint8_t { CONNECTING, ONLINE, PAIRING };
Mode     mode;
uint32_t connectStart = 0;   // millis() when CONNECTING began (for the 60s window)

Preferences prefs;
bool       paired = false;
uint8_t    masterMac[6];
PlateState myState = PlateState::CENTER;   // boot to the "off" position

// filled by the recv callback, acted on in loop()
volatile bool       gotCmd    = false;
volatile PlateState cmdWant   = PlateState::CENTER;
volatile uint16_t   cmdPollMs = POLL_EVERY;   // idle poll interval the master last asked for
volatile bool       gotAck    = false;
volatile bool       gotUnpair = false;   // master told us to disconnect
uint8_t             ackMaster[6];

// servo calibration request (over-the-air, from the app via the master).
volatile bool       gotCal    = false;
volatile uint8_t    calAction = 0;        // see ServoCalMsg::action in protocol.h
volatile uint16_t   calUs     = 1500;
bool                calLive   = false;    // servo currently powered for jogging?
uint32_t            calLastMs = 0;        // millis() of last jog (for auto power-off)

// ── persistence ─────────────────────────────────────────────────────────────
static void saveConfig() {
  prefs.begin("lplate", false);
  prefs.putBool("paired", paired);
  prefs.putBytes("mmac", masterMac, 6);
  prefs.end();
}

// Survives deep sleep but not a power cut — a plate that loses power entirely
// simply restarts the count, which is the safe direction.
RTC_DATA_ATTR uint32_t shipWakes = 0;

// Runs before anything else in setup(). Returns only if the plate is (or has
// just become) commissioned; otherwise it deep-sleeps and never returns.
static void shipModeGate() {
#if defined(DEMO_LOCK) || !ARDUINO_USB_CDC_ON_BOOT
  return;                                    // demo build must always just run
#else
  prefs.begin("lplate", false);
  if (prefs.getBool("comm", false)) { prefs.end(); return; }   // already awake, forever

  delay(400);                                // let the USB peripheral see SOF frames
  bool plugged = HWCDC::isPlugged();
  bool held    = digitalRead(PIN_BUTTON) == LOW;
  shipWakes++;

  if (plugged || held || shipWakes >= SHIP_MAX_WAKES) {
    prefs.putBool("comm", true);
    prefs.end();
    Serial.printf("commissioned (%s) — normal boot from now on\n",
                  plugged ? "USB" : held ? "button" : "timeout");
    return;
  }
  prefs.end();

  Serial.printf("ship mode — asleep until first plug-in (look %u)\n", shipWakes);
  Serial.flush();
  esp_sleep_enable_timer_wakeup((uint64_t)SHIP_WAKE_S * 1000000ULL);
  esp_deep_sleep_start();
#endif
}

static void loadConfig() {
  prefs.begin("lplate", true);
  paired = prefs.getBool("paired", false);
  prefs.getBytes("mmac", masterMac, 6);
  lUs      = prefs.getUShort("lUs",      SERVO_L_US_DEFAULT);        // calibrated positions
  centerUs = prefs.getUShort("centerUs", SERVO_CENTER_US_DEFAULT);
  pUs      = prefs.getUShort("pUs",      SERVO_P_US_DEFAULT);
  prefs.end();
  Serial.printf("paired=%s  servo L=%dus C=%dus P=%dus\n",
                paired ? "yes" : "no", lUs, centerUs, pUs);
}

// Persist the servo positions (called when calibration saves one).
static void saveServoCal() {
  prefs.begin("lplate", false);
  prefs.putUShort("lUs",      lUs);
  prefs.putUShort("centerUs", centerUs);
  prefs.putUShort("pUs",      pUs);
  prefs.end();
  Serial.printf("saved servo cal: L=%dus C=%dus P=%dus\n", lUs, centerUs, pUs);
}

static void factoryReset() {
  Serial.println("FACTORY RESET");
  prefs.begin("lplate", false);
  prefs.clear();
  prefs.end();
  delay(200);
  ESP.restart();
}

// ── ESP-NOW ─────────────────────────────────────────────────────────────────
static void addBroadcastPeer() {
  if (esp_now_is_peer_exist(BCAST)) return;
  esp_now_peer_info_t p = {};
  memcpy(p.peer_addr, BCAST, 6);
  p.channel = ESPNOW_CHANNEL;
  p.encrypt = false;
  esp_now_add_peer(&p);
}

static void addMaster() {
  if (esp_now_is_peer_exist(masterMac)) esp_now_del_peer(masterMac);
  esp_now_peer_info_t p = {};
  memcpy(p.peer_addr, masterMac, 6);
  p.channel = ESPNOW_CHANNEL;
  p.encrypt = false;
  esp_now_add_peer(&p);
}

void onEspNowRecv(const uint8_t* mac, const uint8_t* data, int len) {
  if (len < 2) return;
  if (data[0] != PROTO_VERSION) return;
  MsgType type = (MsgType)data[1];

  if (type == MsgType::PAIR_ACK && !paired) {
    memcpy(ackMaster, mac, 6);                  // master's MAC = packet sender
    gotAck = true;                              // finish the work in loop()
  } else if (type == MsgType::CMD && paired) {
    if (memcmp(mac, masterMac, 6) != 0) return; // only our master
    CmdMsg cmd; memcpy(&cmd, data, sizeof(cmd));
    cmdWant   = cmd.desired;
    cmdPollMs = cmd.next_poll_ms;
    gotCmd    = true;
  } else if (type == MsgType::UNPAIR && paired) {
    if (memcmp(mac, masterMac, 6) != 0) return; // only our master can evict us
    gotUnpair = true;                           // forget it in loop()
  } else if (type == MsgType::SERVO_CAL && paired) {
    if (memcmp(mac, masterMac, 6) != 0) return; // only our master
    if ((size_t)len < sizeof(ServoCalMsg)) return;
    ServoCalMsg m; memcpy(&m, data, sizeof(m));
    calAction = m.action;
    calUs     = m.us;
    gotCal    = true;                           // act on it in loop()
  }
}

void initEspNow() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) { Serial.println("ESP-NOW init FAILED"); return; }
  esp_now_register_recv_cb(onEspNowRecv);
  addBroadcastPeer();
  if (paired) addMaster();
  Serial.printf("ESP-NOW up, my MAC %s\n", WiFi.macAddress().c_str());
}

static void sendPairReq() {
  PairReqMsg req = { PROTO_VERSION, MsgType::PAIR_REQ };
  esp_now_send(BCAST, (uint8_t*)&req, sizeof(req));
  Serial.println("PAIR_REQ broadcast...");
}

static void sendPoll() {
  PollMsg poll = {};
  poll.version = PROTO_VERSION;
  poll.type    = MsgType::POLL;
  poll.battMv  = (uint16_t)(batt::volts() * 1000.0f);   // real cell voltage (0 if no A0 divider wired)
  poll.current = myState;
  esp_now_send(masterMac, (uint8_t*)&poll, sizeof(poll));
}

// Move the plate: power the servo (MOSFET on), drive it to the angle, wait,
// then cut power. The plate rests on a mechanical stop so it holds with no draw.
// The PWM line is forced LOW before cutting power so it can't backfeed the
// unpowered servo through its signal pin.
static void movePlate(PlateState s) {
  const int target = usForState(s);
  int cur = usForState(myState);                    // assume we're at our last position
  Serial.printf("  -> moving plate %u -> %u (%d->%d us)\n",
                (unsigned)myState, (unsigned)s, cur, target);

  digitalWrite(PIN_SERVO_PWR, HIGH);               // inert without a MOSFET; correct if one is fitted
  plateServo.attach(PIN_SERVO_PWM, SERVO_US_MIN, SERVO_US_MAX);
  plateServo.writeMicroseconds(cur);               // start where we are -> no jump to the middle

  // Ramp gently to the target. Small steps = low angular speed = low peak current,
  // so an always-powered servo can't sag the rail into a brownout. Also smooth.
  const int step = (target >= cur) ? SERVO_STEP_US : -SERVO_STEP_US;
  while (abs(target - cur) > SERVO_STEP_US) {
    cur += step;
    plateServo.writeMicroseconds(cur);
    delay(SERVO_STEP_MS);
  }
  plateServo.writeMicroseconds(target);
  delay(SERVO_SETTLE_MS);

  plateServo.detach();                             // release: no signal -> analog servo relaxes (low draw)
  pinMode(PIN_SERVO_PWM, OUTPUT);
  digitalWrite(PIN_SERVO_PWM, LOW);                // idle the signal line
  digitalWrite(PIN_SERVO_PWR, LOW);
  myState = s;
}

// ── servo calibration ─────────────────────────────────────────────────────────
// Power the servo and hold it at `us` so you can SEE where the arm sits, then
// note the value just shy of each stop and save it as the UP or DOWN end-point.
// Driven by the serial jog keys AND over-the-air from the app (via the master).
// The servo stays powered between jogs and auto-cuts after a few idle seconds
// (checkCalTimeout) so a stalled servo can't sit there draining the cell.
static void servoJog(int us) {
  us = constrain(us, SERVO_US_MIN, SERVO_US_MAX);
  if (!calLive) {                                 // first jog — attach and drive
    digitalWrite(PIN_SERVO_PWR, HIGH);            // inert without a MOSFET
    plateServo.attach(PIN_SERVO_PWM, SERVO_US_MIN, SERVO_US_MAX);
    calLive = true;
  }
  plateServo.writeMicroseconds(us);
  calUs     = us;
  calLastMs = millis();
  Serial.printf("CAL jog us=%d\n", us);
}

static void servoCalOff() {
  if (!calLive) return;
  plateServo.detach();
  pinMode(PIN_SERVO_PWM, OUTPUT);
  digitalWrite(PIN_SERVO_PWM, LOW);
  digitalWrite(PIN_SERVO_PWR, LOW);
  calLive = false;
  Serial.println("CAL servo off");
}

// Apply a calibration request that arrived over the air (set by the callback).
// action: 0 = live jog, 1 = save µs as L, 2 = save as P, 4 = save as CENTER,
//         3 = end/power-off.
static void handleCal() {
  if (!gotCal) return;
  gotCal = false;
  switch (calAction) {
    case 0: servoJog(calUs); break;
    case 1: lUs      = constrain((int)calUs, SERVO_US_MIN, SERVO_US_MAX); saveServoCal(); break;
    case 2: pUs      = constrain((int)calUs, SERVO_US_MIN, SERVO_US_MAX); saveServoCal(); break;
    case 4: centerUs = constrain((int)calUs, SERVO_US_MIN, SERVO_US_MAX); saveServoCal(); break;
    case 3: servoCalOff(); break;
  }
}

// Cut servo power if a jog session has gone idle (no jog for a few seconds).
static void checkCalTimeout() {
  if (calLive && millis() - calLastMs > 8000) servoCalOff();
}

// ── button: 0 none, 1 short press, 2 long (5s) press ──────────────────────────
int pollButton() {
  static bool down = false; static uint32_t downAt = 0; static bool longFired = false;
  bool now = digitalRead(PIN_BUTTON) == LOW;
  uint32_t t = millis();
  if (now && !down)      { down = true; downAt = t; longFired = false; }
  else if (now && down)  { if (!longFired && t - downAt >= 5000) { longFired = true; return 2; } }
  else if (!now && down) { down = false; if (!longFired && t - downAt >= 30) return 1; }
  return 0;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\nEDGE online — protocol v%u\n", PROTO_VERSION);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_SERVO_PWR, OUTPUT);
  digitalWrite(PIN_SERVO_PWR, LOW);          // servo unpowered at boot
  pinMode(PIN_SERVO_PWM, OUTPUT);
  digitalWrite(PIN_SERVO_PWM, LOW);          // idle the signal line (no backfeed)
  shipModeGate();                            // may deep-sleep; never returns if so
  loadConfig();
  initEspNow();

#ifdef DEMO_LOCK
  paired = true;                             // compiled-in link; NVS is ignored
  memcpy(masterMac, DEMO_MASTER_MAC, 6);
  addMaster();
  cmdPollMs = DEMO_POLL_MS;
  mode = Mode::ONLINE;                       // no CONNECTING window, no seeking
  Serial.printf("DEMO_LOCK — pinned to %02X:%02X:%02X:%02X:%02X:%02X, controls disabled\n",
                masterMac[0], masterMac[1], masterMac[2],
                masterMac[3], masterMac[4], masterMac[5]);
  connectStart = millis();
  return;
#endif

  // Paired board reboot: try the saved master first (CONNECTING). A board that
  // was never paired goes straight to broadcasting (PAIRING).
  mode = paired ? Mode::CONNECTING : Mode::PAIRING;
  connectStart = millis();
}

// Forget our master and drop back to pairing. Called from BOTH the button and
// the serial 'p' command — writing it once as a named function (instead of the
// same 4 lines twice) is the "don't repeat yourself" rule: fix a bug here once
// and it's fixed in both places.
static void forgetMaster() {
  if (paired && esp_now_is_peer_exist(masterMac)) esp_now_del_peer(masterMac);
  paired = false;
  saveConfig();                 // persist: a power-cycle mustn't revive the old master
  mode = Mode::PAIRING;
  Serial.println("re-pairing requested");
}

// Blink the status LED n times — used to confirm a counted USB re-plug even
// though there's no serial to watch while the lead is out.
static void blinkLed(uint8_t n) {
  for (uint8_t i = 0; i < n; i++) {
    digitalWrite(PIN_LED, HIGH); delay(60);
    digitalWrite(PIN_LED, LOW);  delay(120);
  }
}

// Watch the USB lead and count re-insertions; on the Nth within the window, drop
// the saved master and go back to broadcasting (same as the serial 'p' key), so
// the plate can be adopted by a master in pairing mode. Servo calibration is
// kept — use the button hold or serial 'r' for a full wipe.
// HWCDC::isPlugged() reads the C3's live host-present flag (kept up to date from
// USB SOF frames by a core tick hook), so it's true whenever the cable is in an
// enumerating host, whether or not a serial monitor is open. Polled often —
// loop() top AND during the long idle wait — so a whole out-and-in can't slip
// between two samples.
// NOTE: this only works on battery. With no cell fitted, pulling the lead cuts
// power and the counter (plain statics) dies with it.
static void pollUsbGesture() {
#if ARDUINO_USB_CDC_ON_BOOT
  static bool     init       = false;
  static bool     wasPlugged = false;
  static uint8_t  replugs    = 0;
  static uint32_t firstMs    = 0;
  static uint32_t lastEdgeMs = 0;

  bool plugged = HWCDC::isPlugged();
  if (!init) { wasPlugged = plugged; init = true; return; }         // no phantom edge at boot
  if (plugged == wasPlugged) return;                               // steady — nothing to do

  uint32_t now = millis();
  if (now - lastEdgeMs < PLUG_DEBOUNCE_MS) return;                 // bounce — let it settle
  lastEdgeMs = now;
  bool rising = plugged && !wasPlugged;                            // unplugged -> plugged = a re-plug
  wasPlugged  = plugged;
  if (!rising) return;                                             // only count re-insertions

  if (replugs == 0 || now - firstMs > GESTURE_WINDOW_MS) {         // (re)start the window
    replugs = 0; firstMs = now;
  }
  replugs++;
  Serial.printf("USB re-plug %u/%u\n", replugs, REPLUGS_TO_PAIR);
  blinkLed(replugs);

  if (replugs >= REPLUGS_TO_PAIR) {
    replugs = 0;
    Serial.println("USB gesture -> pairing mode");
    forgetMaster();                                               // -> Mode::PAIRING, starts broadcasting
  }
#endif
}

// A delay() that keeps watching the USB lead, so an unplug/replug during a long
// idle poll gap still registers rather than being missed between polls.
static void usbAwareDelay(uint32_t ms) {
  uint32_t start = millis();
  while (millis() - start < ms) {
    pollUsbGesture();
    delay(20);
  }
}

// Bench testing without a physical button: type a letter in the serial monitor.
//   p = re-pair (forget master)   r = factory reset   s = status
//   (or, no keyboard: unplug/replug the USB lead 3x = 'p' — see pollUsbGesture)
//   c = start servo calibration; then +/- = ±25us, ]/[ = ±100us,
//       l/m/p = save current as L / Center / P, x = finish
void handleSerial() {
  if (!Serial.available()) return;
  char c = Serial.read();

  // Servo jog keys — only while a calibration session is live.
  if (calLive) {
    switch (c) {
      case '+': servoJog(calUs + 25);  return;
      case '-': servoJog(calUs - 25);  return;
      case ']': servoJog(calUs + 100); return;
      case '[': servoJog(calUs - 100); return;
      case 'l': lUs      = calUs; saveServoCal(); return;   // save L
      case 'm': centerUs = calUs; saveServoCal(); return;   // save Center (middle)
      case 'p': pUs      = calUs; saveServoCal(); return;   // save P
      case 'x': servoCalOff(); return;
    }
  }

#ifdef DEMO_LOCK
  if (c == 'p' || c == 'r') {                     // locked: can't drop the master
    Serial.println("DEMO_LOCK — pairing controls disabled");
    return;
  }
#endif
  switch (c) {
    case 'p': forgetMaster();   break;
    case 'r': factoryReset();   break;
    case 'c': servoJog(1500);   break;            // start calibration, centred
    case 's': Serial.printf("status: paired=%d, myState=%u, L=%dus C=%dus P=%dus, usb=%d\n",
                            paired, (unsigned)myState, lUs, centerUs, pUs,
#if ARDUINO_USB_CDC_ON_BOOT
                            (int)HWCDC::isPlugged()
#else
                            -1
#endif
                            ); break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  The board is always in ONE of three modes. Each mode is its own function
//  below, so loop() reads like a sentence. Read loop() (at the very bottom)
//  first, then jump into whichever mode function you care about — put the cursor
//  on the name and press `gd` (go to definition).
//
//      boot ──paired?──► CONNECTING ──master replies──► ONLINE
//                            │ silent 60s                (poll & move, forever)
//                            ▼
//                         PAIRING ──master adopts us──► ONLINE
// ─────────────────────────────────────────────────────────────────────────────

// Every 5s: if the battery is too low, cut the servo and deep-sleep so we can't
// over-discharge the cell. (Needs the A0 divider wired; without it reads ~0.)
static void checkBattery() {
  // `static` inside a function = this variable keeps its value between calls
  // (like a global, but only THIS function can see it). Same trick as pollButton.
  static uint32_t lastCheck = 0;
  if (millis() - lastCheck < 5000) return;   // not time yet — leave early
  lastCheck = millis();

  if (!batt::isLow()) return;                // battery fine — nothing to do
  digitalWrite(PIN_SERVO_PWR, LOW);          // cut servo power
  plateServo.detach();
  pinMode(PIN_SERVO_PWM, OUTPUT);
  digitalWrite(PIN_SERVO_PWM, LOW);
  digitalWrite(PIN_LED, LOW);
  batt::parkForever();                       // deep sleep — never returns
}

// Button: short press = re-pair, 5s hold = factory reset.
static void handleButton() {
  switch (pollButton()) {                    // `gd` on pollButton to see 0/1/2
    case 1: forgetMaster(); break;
    case 2: factoryReset(); break;
  }
}

// CONNECTING — a paired board that just booted. Poke the saved master and listen.
static void tryReconnect() {
  digitalWrite(PIN_LED, HIGH);               // solid LED = trying to reconnect
  gotCmd = false;
  sendPoll();
  uint32_t start = millis();
  while (!gotCmd && millis() - start < 500) { delay(5); }

  // >>> TODO 1 <<<  Master replied this round? (the callback set gotCmd = true)
  //   If so, switch mode to Mode::ONLINE and `return;`.
  //
  if (gotCmd){ if (mode == Mode::CONNECTING) {
    mode = Mode::ONLINE;
    return;
  }}


  // >>> TODO 2 <<<  Silent for the whole window?
  //   Compare millis() - connectStart against CONNECT_WINDOW (rollover-safe form).
  //   If past it: set paired = false; set mode = Mode::PAIRING; then return.
  //   EXERCISE: why set paired = false first? Press `gd` on onEspNowRecv and read
  //   what it checks before accepting a PAIR_ACK. Write the answer in a comment.

  if (millis() - connectStart > CONNECT_WINDOW){
    paired = false;
    mode = Mode::PAIRING;
  } 
  delay(500);                                // retry cadence while connecting
}

// ONLINE — the normal job: ask the master what state it wants, move if needed.
static void runOnline() {
  // Remembers (across calls) when we last actually moved the plate, so we can
  // poll quickly for a short while after activity. `static` = keeps its value.
  static uint32_t lastMove = 0;

  gotCmd = false;
  sendPoll();
  Serial.printf("POLL sent (current=%u)\n", (unsigned)myState);
  uint32_t start = millis();
  while (!gotCmd && millis() - start < 500) { delay(5); }

  if (gotCmd) {
    Serial.printf("CMD reply: desired=%u (we are %u)\n",
                  (unsigned)cmdWant, (unsigned)myState);
    // Don't drive the servo for the first ~1.5s after boot: let the rail settle
    // so the boot inrush + a move can't coincide and brown us out (and so a
    // brownout can't turn into a move-reset-move loop).
    if (cmdWant != myState && millis() > SERVO_BOOT_DELAY_MS) {
      movePlate(cmdWant); lastMove = millis();
    }
  } else {
    Serial.println("no reply (master out of range?)");
  }

  // Adaptive poll rate: for a few seconds after a move the supervisor may toggle
  // again, so stay responsive (poll fast). When idle, slow right down to save
  // battery. (We can't react faster than this to the FIRST press after idle —
  // the edge only learns of a change when it polls.)
  // Poll fast right after boot (so the first move lands ~1.5s in) and for a few
  // seconds after any move; otherwise slow down to save power.
  bool recentlyActive = (lastMove != 0 && millis() - lastMove < 5000) || millis() < 4000;
  uint32_t wait = recentlyActive ? 250 : cmdPollMs;   // master paces idle rate (fast if phone present)
  usbAwareDelay(wait);                                 // keep watching the USB lead through the idle gap
}

// PAIRING — shout "pair me" until a master in pair mode answers and adopts us.
static void broadcastForPairing() {
  digitalWrite(PIN_LED, (millis() / 250) & 1);   // blink while pairing
  sendPairReq();
  uint32_t start = millis();
  while (!gotAck && millis() - start < REQ_EVERY) { delay(5); }
  if (!gotAck) return;                       // no answer yet — try again next loop

  // memcpy(dest, src, n) = copy n bytes. ackMaster was filled by the callback
  // with the MAC of whoever sent the PAIR_ACK — that's our new master.
  memcpy(masterMac, ackMaster, 6);
  addMaster();
  paired = true;
  gotAck = false;
  saveConfig();                              // remember the master across power-off
  Serial.printf("PAIRED to %02X:%02X:%02X:%02X:%02X:%02X\n",
                masterMac[0],masterMac[1],masterMac[2],
                masterMac[3],masterMac[4],masterMac[5]);
  digitalWrite(PIN_LED, HIGH);
  mode = Mode::ONLINE;                        // adopted -> go live
}

// This is the heart of the program. Arduino calls it over and over, forever.
// Read top-to-bottom: housekeeping first, then "do the current mode's job".
void loop() {
  checkBattery();
  handleSerial();
#ifndef DEMO_LOCK
  handleButton();
  pollUsbGesture();                // unplug/replug the USB lead 3x = re-pair
#endif

  gotUnpair = gotUnpair && !DEMO_LOCKED;   // locked build ignores an UNPAIR
  if (gotUnpair) {                 // master told us to disconnect
    gotUnpair = false;
    Serial.println("master sent UNPAIR — forgetting it and re-pairing");
    forgetMaster();                // drop the peer, paired=false, mode=PAIRING
    saveConfig();                  // persist so a reboot doesn't auto-reconnect
  }

  handleCal();                     // apply any over-the-air calibration request
  checkCalTimeout();               // power the servo down if jogging went idle
  if (calLive) { delay(10); return; }   // hold the servo still while calibrating

  switch (mode) {
    case Mode::CONNECTING: tryReconnect();        break;
    case Mode::ONLINE:     runOnline();           break;
    case Mode::PAIRING:    broadcastForPairing();  break;
  }
}
