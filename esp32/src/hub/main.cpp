// HUB firmware — a plate that also carries the master's job, so the product is
// two devices instead of three. This file is the edge firmware plus the master's
// BLE/authority block transplanted on top:
//
//   phone ──BLE──► HUB (this board) ──ESP-NOW──► follower plate
//                    └ drives its own servo
//
// The hub holds desiredState, answers the follower's POLLs with CMD, runs the
// pairing window, and moves its own servo on a BLE write. The follower runs the
// unchanged edge firmware. Protocol v7, no new message types.
#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include <Preferences.h>
#include <NimBLEDevice.h>
#include <ESP32Servo.h>
#include "esp32-hal.h"
#include "protocol.h"
#include "battery.h"

constexpr int PIN_BUTTON    = D1;   // pairing / reset button to GND (plate hardware)
constexpr int PIN_LED       = D2;   // status LED (blinks while pairing)
constexpr int PIN_SERVO_PWR = D9;   // MOSFET gate: HIGH = servo powered, LOW = off
constexpr int PIN_SERVO_PWM = D10;  // servo control signal (PWM)
// D3 (GPIO5) stays free — reserved for a planned VBUS wake pin.

// ── BLE identifiers (the phone app must use these exact UUIDs) ─────────────
static const char* SVC_UUID  = "a1b2c3d4-0001-4000-8000-000000000001";
static const char* CHAR_UUID = "a1b2c3d4-0002-4000-8000-000000000002";  // plate 0/1/2
static const char* CMD_UUID  = "a1b2c3d4-0003-4000-8000-000000000003";  // debug cmd
static const char* STAT_UUID = "a1b2c3d4-0004-4000-8000-000000000004";  // status JSON

// ── Servo travel (same as the edge — this board IS a plate) ────────────────
constexpr int SERVO_US_MIN  = 500;
constexpr int SERVO_US_MAX  = 2500;
constexpr int SERVO_L_US_DEFAULT      = 1300;
constexpr int SERVO_CENTER_US_DEFAULT = 1500;
constexpr int SERVO_P_US_DEFAULT      = 1700;
// Ramped motion keeps the servo's peak current low (it shares the ESP's rail).
constexpr int      SERVO_STEP_US   = 15;
constexpr uint32_t SERVO_STEP_MS   = 12;
constexpr uint32_t SERVO_SETTLE_MS = 120;
constexpr uint32_t SERVO_BOOT_DELAY_MS = 1500;  // let the rail settle after boot

int lUs      = SERVO_L_US_DEFAULT;
int centerUs = SERVO_CENTER_US_DEFAULT;
int pUs      = SERVO_P_US_DEFAULT;

static int usForState(PlateState s) {
  switch (s) {
    case PlateState::L: return lUs;
    case PlateState::P: return pUs;
    default:            return centerUs;
  }
}

Servo plateServo;

// ── Master-side config ─────────────────────────────────────────────────────
constexpr uint8_t  MAX_EDGES   = 4;      // follower plates
constexpr uint32_t PAIR_WINDOW = 60000;  // pairing auto-exits after 60 s

Preferences  prefs;
uint8_t      edgeMac[MAX_EDGES][6];
uint8_t      edgeCount = 0;
String       gUid;          // BLE name suffix — derived from our MAC, never changes

uint32_t     edgeLastSeen[MAX_EDGES] = {0};
uint16_t     edgeBattMv[MAX_EDGES]   = {0};
uint8_t      edgeCur[MAX_EDGES]      = {0};

volatile PlateState desiredState = PlateState::CENTER;   // set by the phone
volatile bool       phoneConnected = false;
volatile uint32_t   desiredSince = 0;
bool      pairing = false;
uint32_t  pairingStart = 0;

PlateState myState = PlateState::CENTER;   // this plate's actual position

constexpr uint32_t EDGE_STALE_MS   = 8000;
constexpr uint32_t FLIP_TIMEOUT_MS = 10000;

constexpr uint8_t  MAX_CAND = 6;
uint8_t   candMac[MAX_CAND][6];
uint32_t  candSeen[MAX_CAND] = {0};
uint8_t   candCount = 0;

constexpr uint32_t TEST_TIMEOUT_MS = 6000;
int         testEdge   = -1;
uint32_t    testStart  = 0;
const char* testResult = "none";

// Servo calibration for THIS plate arrives over BLE (cmd opcode 5, idx 0) and is
// applied in loop(), same flags/flow as the edge's over-the-air path.
volatile bool       gotCal    = false;
volatile uint8_t    calAction = 0;
volatile uint16_t   calUs     = 1500;
bool                calLive   = false;
uint32_t            calLastMs = 0;

// A servo move drags the shared rail; don't let the low-voltage guard read the
// sag as a flat cell (see checkBattery).
uint32_t            battQuietUntil = 0;
constexpr uint32_t  BATT_QUIET_MS  = 1000;

// ── DEMO_LOCK: see the matching block in src/edge/main.cpp ─────────────────
// Follower MAC compiled in, fixed BLE name, fast poll, destructive controls
// disabled. Flash: -e hub_demo  (paired with -e edge_demo — the edge build must
// carry THIS board's MAC as its DEMO_MASTER_MAC).
#ifdef DEMO_LOCK
constexpr uint8_t DEMO_EDGE_MAC[6] = { 0xB0, 0xA6, 0x04, 0x06, 0x23, 0xB4 };
constexpr char    DEMO_UID[]       = "DEM01";        // 5 chars -> "Lplate-DEM01"
#endif

constexpr uint16_t FAST_POLL_MS = 300;
constexpr uint16_t IDLE_POLL_MS = 3000;

// ── Ship mode: asleep until first plugged in (same one-way gate as the edge) ─
// Commissioning happens ONLY on first plug-in or a button hold — no timeout.
constexpr uint32_t SHIP_WAKE_S    = 8;

// ── "unplug/replug the USB lead a few times to re-pair" gesture ────────────
constexpr uint8_t  REPLUGS_TO_PAIR   = 3;
constexpr uint32_t GESTURE_WINDOW_MS = 25000;
constexpr uint32_t PLUG_DEBOUNCE_MS  = 200;

// ── small helpers ──────────────────────────────────────────────────────────
static bool macEq(const uint8_t* a, const uint8_t* b) { return memcmp(a, b, 6) == 0; }

static int findEdge(const uint8_t* mac) {
  for (int i = 0; i < edgeCount; i++) if (macEq(edgeMac[i], mac)) return i;
  return -1;
}

static void addCandidate(const uint8_t* mac) {
  for (int i = 0; i < candCount; i++)
    if (macEq(candMac[i], mac)) { candSeen[i] = millis(); return; }
  if (candCount >= MAX_CAND) return;
  memcpy(candMac[candCount], mac, 6);
  candSeen[candCount] = millis();
  candCount++;
  Serial.printf("discovered candidate edge #%u\n", candCount - 1);
}

static void addPeer(const uint8_t* mac) {
  if (esp_now_is_peer_exist(mac)) esp_now_del_peer(mac);
  esp_now_peer_info_t p = {};
  memcpy(p.peer_addr, mac, 6);
  p.channel = ESPNOW_CHANNEL;
  p.encrypt = false;
  esp_now_add_peer(&p);
}

// ── persistence ────────────────────────────────────────────────────────────
static void saveConfig() {
  prefs.begin("lplate", false);
  prefs.putUChar("n", edgeCount);
  for (int i = 0; i < edgeCount; i++) {
    char k[4]; snprintf(k, sizeof(k), "e%d", i);
    prefs.putBytes(k, edgeMac[i], 6);
  }
  prefs.end();
}

static void loadConfig() {
  prefs.begin("lplate", true);
  edgeCount = prefs.getUChar("n", 0);
  if (edgeCount > MAX_EDGES) edgeCount = 0;
  for (int i = 0; i < edgeCount; i++) {
    char k[4]; snprintf(k, sizeof(k), "e%d", i);
    prefs.getBytes(k, edgeMac[i], 6);
  }
  lUs      = prefs.getUShort("lUs",      SERVO_L_US_DEFAULT);
  centerUs = prefs.getUShort("centerUs", SERVO_CENTER_US_DEFAULT);
  pUs      = prefs.getUShort("pUs",      SERVO_P_US_DEFAULT);
  prefs.end();
  Serial.printf("loaded %u edge(s)  servo L=%dus C=%dus P=%dus\n",
                edgeCount, lUs, centerUs, pUs);
}

static void saveServoCal() {
  prefs.begin("lplate", false);
  prefs.putUShort("lUs",      lUs);
  prefs.putUShort("centerUs", centerUs);
  prefs.putUShort("pUs",      pUs);
  prefs.end();
  Serial.printf("saved servo cal: L=%dus C=%dus P=%dus\n", lUs, centerUs, pUs);
}

static void factoryReset() {
  Serial.println("FACTORY RESET — clearing all pairings");
  prefs.begin("lplate", false);
  prefs.clear();
  prefs.end();
  delay(200);
  ESP.restart();
}

// Survives deep sleep but not a power cut — restarting the count is the safe way.
RTC_DATA_ATTR uint32_t shipWakes = 0;

// Runs before anything else in setup(). Returns only if the plate is (or has
// just become) commissioned; otherwise it deep-sleeps and never returns.
static void shipModeGate() {
#if defined(DEMO_LOCK) || !ARDUINO_USB_CDC_ON_BOOT
  return;                                    // demo build must always just run
#else
  prefs.begin("lplate", false);
  if (prefs.getBool("comm", false)) { prefs.end(); return; }

  delay(400);                                // let the USB peripheral see SOF frames
  bool plugged = HWCDC::isPlugged();
  bool held    = digitalRead(PIN_BUTTON) == LOW;
  shipWakes++;

  if (plugged || held) {
    prefs.putBool("comm", true);
    prefs.end();
    Serial.printf("commissioned (%s) — normal boot from now on\n",
                  plugged ? "USB" : "button");
    return;
  }
  prefs.end();

  Serial.printf("ship mode — asleep until first plug-in (look %u)\n", shipWakes);
  Serial.flush();
  esp_sleep_enable_timer_wakeup((uint64_t)SHIP_WAKE_S * 1000000ULL);
  esp_deep_sleep_start();
#endif
}

// ── ESP-NOW ────────────────────────────────────────────────────────────────
static void sendCmd(const uint8_t* mac) {
  CmdMsg cmd = {};
  cmd.version      = PROTO_VERSION;
  cmd.type         = MsgType::CMD;
  cmd.desired      = desiredState;
#ifdef DEMO_LOCK
  cmd.next_poll_ms = FAST_POLL_MS;               // always responsive for the demo
#else
  cmd.next_poll_ms = phoneConnected ? FAST_POLL_MS : IDLE_POLL_MS;
#endif
  esp_now_send(mac, (uint8_t*)&cmd, sizeof(cmd));
}

static void pairEdge(const uint8_t* mac) {
  if (findEdge(mac) < 0) {
    if (edgeCount >= MAX_EDGES) { Serial.println("edge list full"); return; }
    memcpy(edgeMac[edgeCount++], mac, 6);
    saveConfig();
    Serial.printf("paired new edge #%u\n", edgeCount - 1);
  }
  addPeer(mac);

  PairAckMsg ack = {};
  ack.version = PROTO_VERSION;
  ack.type    = MsgType::PAIR_ACK;
  esp_now_send(mac, (uint8_t*)&ack, sizeof(ack));
}

static void startSelfTest(const uint8_t* mac) {
  testEdge   = findEdge(mac);
  testStart  = millis();
  testResult = "testing";
  Serial.printf("self-test: waiting for edge #%d to report in\n", testEdge);
}

static void pairSelected(const uint8_t* mac) {
  bool known = false;
  for (int i = 0; i < candCount; i++) if (macEq(candMac[i], mac)) known = true;
  if (!known) { Serial.println("pair request for unknown MAC — ignoring"); return; }
  pairEdge(mac);
  startSelfTest(mac);
}

static void updateSelfTest() {
  if (testEdge < 0) return;
  if (edgeLastSeen[testEdge] && edgeLastSeen[testEdge] >= testStart) {
    testResult = "pass";
    Serial.printf("self-test PASS edge #%d\n", testEdge);
    testEdge = -1;
  } else if (millis() - testStart > TEST_TIMEOUT_MS) {
    testResult = "fail";
    Serial.printf("self-test FAIL edge #%d (no poll)\n", testEdge);
    testEdge = -1;
  }
}

// Polls are answered HERE, in the callback — never from loop(). A servo ramp
// blocks loop() for over a second, and the follower must not time out on
// exactly the state change it most needs to hear.
void onEspNowRecv(const uint8_t* mac, const uint8_t* data, int len) {
  if (len < 2) return;
  uint8_t  ver  = data[0];
  MsgType  type = (MsgType)data[1];
  if (ver != PROTO_VERSION) return;

  if (type == MsgType::PAIR_REQ) {
#ifdef DEMO_LOCK
    return;                                     // locked build: the pair list never changes
#endif
    if (!pairing) return;
    Serial.printf("PAIR_REQ from %02X:%02X:%02X:%02X:%02X:%02X\n",
                  mac[0],mac[1],mac[2],mac[3],mac[4],mac[5]);
    addCandidate(mac);
    bool isNew = findEdge(mac) < 0;
    if (!isNew || edgeCount < MAX_EDGES) {
      pairEdge(mac);
      if (isNew && findEdge(mac) >= 0) startSelfTest(mac);
    }
  } else if (type == MsgType::POLL) {
    int idx = findEdge(mac);
    if (idx < 0) return;
    PollMsg poll; memcpy(&poll, data, sizeof(poll));
    edgeLastSeen[idx] = millis();
    edgeBattMv[idx]   = poll.battMv;
    edgeCur[idx]      = (uint8_t)poll.current;
    sendCmd(mac);
  }
}

static void enterPairing() {
  pairing = true;
  pairingStart = millis();
  candCount = 0;
  Serial.println("DISCOVERY MODE on (60s) — listening for edges");
}

// Disconnect every follower, wipe the pairing list, reopen discovery.
// Order matters: tell the edges BEFORE dropping them as peers.
static void unpairAllAndRepair() {
  Serial.printf("disconnecting %u edge(s), wiping pairings, re-pairing\n", edgeCount);

  UnpairMsg msg = {};
  msg.version = PROTO_VERSION;
  msg.type    = MsgType::UNPAIR;
  for (int rep = 0; rep < 3; rep++) {          // unicast can drop; send a few times
    for (int i = 0; i < edgeCount; i++)
      esp_now_send(edgeMac[i], (uint8_t*)&msg, sizeof(msg));
    delay(50);
  }

  for (int i = 0; i < edgeCount; i++)
    if (esp_now_is_peer_exist(edgeMac[i])) esp_now_del_peer(edgeMac[i]);
  edgeCount = 0;
  saveConfig();

  for (int i = 0; i < MAX_EDGES; i++) { edgeLastSeen[i] = 0; edgeBattMv[i] = 0; edgeCur[i] = 0; }
  testEdge = -1; testResult = "none";

  enterPairing();
}

void initEspNow() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) { Serial.println("ESP-NOW init FAILED"); return; }
  esp_now_register_recv_cb(onEspNowRecv);
  for (int i = 0; i < edgeCount; i++) addPeer(edgeMac[i]);
  Serial.printf("ESP-NOW up, my MAC %s\n", WiFi.macAddress().c_str());
}

// ── servo (this plate) ─────────────────────────────────────────────────────
static void movePlate(PlateState s) {
  const int target = usForState(s);
  int cur = usForState(myState);
  Serial.printf("  -> moving plate %u -> %u (%d->%d us)\n",
                (unsigned)myState, (unsigned)s, cur, target);

  digitalWrite(PIN_SERVO_PWR, HIGH);
  plateServo.attach(PIN_SERVO_PWM, SERVO_US_MIN, SERVO_US_MAX);
  plateServo.writeMicroseconds(cur);

  const int step = (target >= cur) ? SERVO_STEP_US : -SERVO_STEP_US;
  while (abs(target - cur) > SERVO_STEP_US) {
    cur += step;
    plateServo.writeMicroseconds(cur);
    delay(SERVO_STEP_MS);
  }
  plateServo.writeMicroseconds(target);
  delay(SERVO_SETTLE_MS);

  plateServo.detach();
  pinMode(PIN_SERVO_PWM, OUTPUT);
  digitalWrite(PIN_SERVO_PWM, LOW);
  digitalWrite(PIN_SERVO_PWR, LOW);
  myState = s;
  battQuietUntil = millis() + BATT_QUIET_MS;   // rail needs a moment before the guard trusts A0
}

static void servoJog(int us) {
  us = constrain(us, SERVO_US_MIN, SERVO_US_MAX);
  if (!calLive) {
    digitalWrite(PIN_SERVO_PWR, HIGH);
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
  battQuietUntil = millis() + BATT_QUIET_MS;
  Serial.println("CAL servo off");
}

// action: 0 = live jog, 1 = save µs as L, 2 = save as P, 4 = save as CENTER, 3 = off.
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

static void checkCalTimeout() {
  if (calLive && millis() - calLastMs > 8000) servoCalOff();
}

// ── BLE ────────────────────────────────────────────────────────────────────
NimBLECharacteristic* statChar = nullptr;

// Plate state write: 0 = L, 1 = CENTER (off), 2 = P. The hub moves its own
// servo from loop() (a ramp is too long for the BLE task); the follower picks
// the state up on its next poll.
class PlateCharCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) override {
    std::string v = c->getValue();
    if (v.empty()) return;
    uint8_t b = (uint8_t)v[0];
    if (b > 2) return;
    PlateState want = (PlateState)b;
    if (want != desiredState) desiredSince = millis();
    desiredState = want;
    Serial.printf("BLE write -> desired=%u\n", (unsigned)desiredState);
  }
};

// Command write from the app. First byte = opcode:
//   1 = enter discovery   2 = factory reset   3 = stop discovery
//   4 = pair this edge — followed by its 6-byte MAC
//   5 = servo calibration: [0x05][idx][action][us_lo][us_hi]
//       idx 0 is the hub's OWN servo (e[0] in the status JSON); idx 1.. are the
//       followers, forwarded as SERVO_CAL. Same app path calibrates every plate.
class CmdCharCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) override {
    std::string v = c->getValue();
    if (v.empty()) return;

    if ((uint8_t)v[0] == 4 && v.size() >= 7) {
      pairSelected((const uint8_t*)v.data() + 1);
      return;
    }

    if ((uint8_t)v[0] == 5 && v.size() >= 5) {
      uint8_t  idx    = (uint8_t)v[1];
      uint8_t  action = (uint8_t)v[2];
      uint16_t us     = (uint16_t)((uint8_t)v[3] | ((uint8_t)v[4] << 8));
      if (idx == 0) {                          // this board — apply in loop()
        calAction = action;
        calUs     = us;
        gotCal    = true;
        return;
      }
      if (idx > edgeCount) { Serial.printf("cal: bad edge idx %u\n", idx); return; }
      ServoCalMsg m = {};
      m.version = PROTO_VERSION;
      m.type    = MsgType::SERVO_CAL;
      m.action  = action;
      m.us      = us;
      esp_now_send(edgeMac[idx - 1], (uint8_t*)&m, sizeof(m));
      Serial.printf("cal relay -> edge %u action=%u us=%u\n", idx, action, (unsigned)us);
      return;
    }

    switch ((uint8_t)v[0]) {
      case 1: enterPairing(); break;
      case 2: factoryReset(); break;
      case 3: pairing = false; Serial.println("DISCOVERY MODE off (app)"); break;
      default: Serial.printf("unknown cmd %u\n", (unsigned)v[0]);
    }
  }
};

// Flip verdict for the app's trip-start screen. The hub is itself a plate, so
// there is always at least one live plate — "nohw" can no longer happen.
static const char* flipStatus() {
  bool allConfirmed = (myState == desiredState);
  for (int i = 0; i < edgeCount; i++) {
    bool live = edgeLastSeen[i] && (millis() - edgeLastSeen[i] < EDGE_STALE_MS);
    if (!live) continue;
    if (edgeCur[i] != (uint8_t)desiredState) allConfirmed = false;
  }
  if (allConfirmed) return "ok";
  if (millis() - desiredSince < FLIP_TIMEOUT_MS) return "pending";
  return "failed";
}

// Status JSON — same keys the app already parses. The hub reports ITSELF as
// e[0] (own MAC, battery, state) with the followers after it, so the app's
// calibrate-by-index path reaches every plate with no app change.
static String buildStatus() {
  String s = "{\"uid\":\"" + gUid + "\",\"up\":" + String(millis() / 1000)
           + ",\"edges\":" + String(edgeCount)
           + ",\"desired\":" + String((unsigned)desiredState)
           + ",\"pairing\":" + (pairing ? "true" : "false")
           + ",\"flip\":\"" + flipStatus() + "\""
           + ",\"test\":\"" + testResult + "\""
           + ",\"e\":[";
  s += "{\"i\":0,\"mac\":\"" + WiFi.macAddress() + "\",\"age\":0"
     + ",\"mv\":" + String((uint16_t)(batt::volts() * 1000.0f))
     + ",\"cur\":" + String((unsigned)myState) + "}";
  for (int i = 0; i < edgeCount; i++) {
    char mac[18];
    snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
             edgeMac[i][0], edgeMac[i][1], edgeMac[i][2],
             edgeMac[i][3], edgeMac[i][4], edgeMac[i][5]);
    long age = edgeLastSeen[i] ? (long)(millis() - edgeLastSeen[i]) : -1;
    s += ",{\"i\":" + String(i + 1) + ",\"mac\":\"" + mac + "\",\"age\":" + String(age)
       + ",\"mv\":" + String(edgeBattMv[i]) + ",\"cur\":" + String(edgeCur[i]) + "}";
  }
  s += "],\"cand\":[";
  for (int i = 0; i < candCount; i++) {
    if (i) s += ",";
    char mac[18];
    snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
             candMac[i][0], candMac[i][1], candMac[i][2],
             candMac[i][3], candMac[i][4], candMac[i][5]);
    long age = (long)(millis() - candSeen[i]);
    s += "{\"mac\":\"" + String(mac) + "\",\"age\":" + String(age) + "}";
  }
  s += "]}";
  return s;
}

static void pushStatus() {
  if (!statChar) return;
  String s = buildStatus();
  statChar->setValue((uint8_t*)s.c_str(), s.length());
  statChar->notify();
}

// BLE name suffix, derived from our own MAC — same alphabet as the old random
// UID but stable for the life of the board, so the app's saved device name
// (matched exactly) can never go stale. No reset or re-flash changes it.
static String uidFromMac() {
  static const char cs[] = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";  // 32 chars, no 0/O/1/I
  uint8_t mac[6];
  WiFi.macAddress(mac);
  uint32_t r = ((uint32_t)mac[2] << 24) | ((uint32_t)mac[3] << 16)
             | ((uint32_t)mac[4] << 8)  | (uint32_t)mac[5];
  char buf[6];
  for (int i = 0; i < 5; i++) { buf[i] = cs[r & 31]; r >>= 5; }
  buf[5] = '\0';
  return String(buf);
}

// Button-tap: unpair the followers and reopen pairing. Unlike the old master,
// the BLE identity is NOT regenerated — it's MAC-derived, so the phone's saved
// name keeps working across this reset.
static void freshPairingReset() {
  Serial.println("FRESH PAIRING — unpair plates, reopen pairing");
  UnpairMsg msg = {};
  msg.version = PROTO_VERSION;
  msg.type    = MsgType::UNPAIR;
  for (int rep = 0; rep < 3; rep++) {
    for (int i = 0; i < edgeCount; i++)
      esp_now_send(edgeMac[i], (uint8_t*)&msg, sizeof(msg));
    delay(50);
  }
  edgeCount = 0;
  saveConfig();
  prefs.begin("lplate", false);
  prefs.putBool("pairboot", true);             // setup() reopens pairing after the reboot
  prefs.end();
  delay(150);
  ESP.restart();
}

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer*) override {
    phoneConnected = true;
    Serial.println("BLE phone connected -> fast poll");
  }
  void onDisconnect(NimBLEServer* s) override {
    phoneConnected = false;
    Serial.println("BLE phone disconnected -> idle poll");
    NimBLEDevice::startAdvertising();
  }
};

void initBle() {
  String name = "Lplate-" + gUid;
  NimBLEDevice::init(name.c_str());
  NimBLEServer* server = NimBLEDevice::createServer();
  server->setCallbacks(new ServerCallbacks());
  NimBLEService* svc   = server->createService(SVC_UUID);
  NimBLECharacteristic* ch = svc->createCharacteristic(
      CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE);
  ch->setCallbacks(new PlateCharCallbacks());

  NimBLECharacteristic* cmd = svc->createCharacteristic(
      CMD_UUID, NIMBLE_PROPERTY::WRITE);
  cmd->setCallbacks(new CmdCharCallbacks());
  statChar = svc->createCharacteristic(
      STAT_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  statChar->setValue("{}");

  svc->start();
  NimBLEAdvertising* adv = NimBLEDevice::getAdvertising();
  adv->addServiceUUID(SVC_UUID);
  adv->start();
  Serial.printf("BLE advertising as '%s'\n", name.c_str());
}

// ── button: 0 none, 1 short press, 2 long (5s) press ───────────────────────
int pollButton() {
  static bool down = false; static uint32_t downAt = 0; static bool longFired = false;
  bool now = digitalRead(PIN_BUTTON) == LOW;
  uint32_t t = millis();
  if (now && !down)      { down = true; downAt = t; longFired = false; }
  else if (now && down)  { if (!longFired && t - downAt >= 5000) { longFired = true; return 2; } }
  else if (!now && down) { down = false; if (!longFired && t - downAt >= 30) return 1; }
  return 0;
}

static void blinkLed(uint8_t n) {
  for (uint8_t i = 0; i < n; i++) {
    digitalWrite(PIN_LED, HIGH); delay(60);
    digitalWrite(PIN_LED, LOW);  delay(120);
  }
}

// USB re-plug gesture (see the edge for the full story). On the hub there is no
// master to forget, so the Nth re-plug does what a button-tap does: unpair the
// followers and reopen pairing.
static void pollUsbGesture() {
#if ARDUINO_USB_CDC_ON_BOOT
  static bool     init       = false;
  static bool     wasPlugged = false;
  static uint8_t  replugs    = 0;
  static uint32_t firstMs    = 0;
  static uint32_t lastEdgeMs = 0;

  bool plugged = HWCDC::isPlugged();
  if (!init) { wasPlugged = plugged; init = true; return; }
  if (plugged == wasPlugged) return;

  uint32_t now = millis();
  if (now - lastEdgeMs < PLUG_DEBOUNCE_MS) return;
  lastEdgeMs = now;
  bool rising = plugged && !wasPlugged;
  wasPlugged  = plugged;
  if (!rising) return;

  if (replugs == 0 || now - firstMs > GESTURE_WINDOW_MS) {
    replugs = 0; firstMs = now;
  }
  replugs++;
  Serial.printf("USB re-plug %u/%u\n", replugs, REPLUGS_TO_PAIR);
  blinkLed(replugs);

  if (replugs >= REPLUGS_TO_PAIR) {
    replugs = 0;
    Serial.println("USB gesture -> re-pairing followers");
    unpairAllAndRepair();
  }
#endif
}

// Every 5s: park in deep sleep if the cell is genuinely low. A servo move drags
// the rail for over a second, so the guard stands down during a move (it blocks
// loop anyway) and for BATT_QUIET_MS after — sag must not read as a flat cell.
static void checkBattery() {
  static uint32_t lastCheck = 0;
  if ((int32_t)(millis() - battQuietUntil) < 0) return;
  if (millis() - lastCheck < 5000) return;
  lastCheck = millis();

  if (!batt::isLow()) return;
  digitalWrite(PIN_SERVO_PWR, LOW);
  plateServo.detach();
  pinMode(PIN_SERVO_PWM, OUTPUT);
  digitalWrite(PIN_SERVO_PWM, LOW);
  digitalWrite(PIN_LED, LOW);
  batt::parkForever();                       // deep sleep — never returns
}

static void handleButton() {
  switch (pollButton()) {
    case 1: freshPairingReset(); break;      // tap  : unpair followers, reopen pairing
    case 2: factoryReset();      break;      // hold : full reset (keeps the BLE name — it's MAC-derived)
  }
}

// Bench testing over serial:
//   p = discovery   u = disconnect-all + wipe + re-pair   l = list discovered
//   0-5 = pair that candidate   r = factory reset   s = status
//   t = cycle plate L/Center/P
//   c = start servo calibration; then +/- = ±25us, ]/[ = ±100us,
//       l/m/p = save current as L / Center / P, x = finish
void handleSerial() {
  if (!Serial.available()) return;
  char ch = Serial.read();

  // Servo jog keys — only while a calibration session is live.
  if (calLive) {
    switch (ch) {
      case '+': servoJog(calUs + 25);  return;
      case '-': servoJog(calUs - 25);  return;
      case ']': servoJog(calUs + 100); return;
      case '[': servoJog(calUs - 100); return;
      case 'l': lUs      = calUs; saveServoCal(); return;
      case 'm': centerUs = calUs; saveServoCal(); return;
      case 'p': pUs      = calUs; saveServoCal(); return;
      case 'x': servoCalOff(); return;
    }
  }

#ifdef DEMO_LOCK
  if (ch == 'p' || ch == 'u' || ch == 'r' || (ch >= '0' && ch <= '5')) {
    Serial.println("DEMO_LOCK — pairing controls disabled");
    return;
  }
#endif
  if (ch >= '0' && ch <= '5') {
    int n = ch - '0';
    if (n < candCount) pairSelected(candMac[n]);
    else Serial.printf("no candidate #%d\n", n);
    return;
  }
  switch (ch) {
    case 'p': enterPairing(); break;
    case 'u': unpairAllAndRepair(); break;
    case 'l':
      Serial.printf("%u candidate(s):\n", candCount);
      for (int i = 0; i < candCount; i++)
        Serial.printf("  #%d %02X:%02X:%02X:%02X:%02X:%02X\n", i,
                      candMac[i][0],candMac[i][1],candMac[i][2],
                      candMac[i][3],candMac[i][4],candMac[i][5]);
      break;
    case 'r': factoryReset(); break;
    case 'c': servoJog(1500); break;
    case 't':
      desiredState = (PlateState)(((uint8_t)desiredState + 1) % 3);
      desiredSince = millis();
      Serial.printf("bench toggle -> desired=%u\n", (unsigned)desiredState);
      break;
    case 's': Serial.printf("status: %u edge(s) paired, desired=%u, myState=%u, pairing=%d, "
                            "test=%s, batt=%.2fV, L=%dus C=%dus P=%dus\n",
                            edgeCount, (unsigned)desiredState, (unsigned)myState,
                            pairing, testResult, batt::volts(), lUs, centerUs, pUs); break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\nHUB online — protocol v%u\n", PROTO_VERSION);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_SERVO_PWR, OUTPUT);
  digitalWrite(PIN_SERVO_PWR, LOW);          // servo unpowered at boot
  pinMode(PIN_SERVO_PWM, OUTPUT);
  digitalWrite(PIN_SERVO_PWM, LOW);          // idle the signal line (no backfeed)
  shipModeGate();                            // may deep-sleep; never returns if so
  loadConfig();
  initEspNow();
  gUid = uidFromMac();                       // stable identity — never regenerated
#ifdef DEMO_LOCK
  gUid = DEMO_UID;                           // fixed name; app binding can't go stale
  edgeCount = 1;                             // pairing is compiled in, not negotiated
  memcpy(edgeMac[0], DEMO_EDGE_MAC, 6);
  addPeer(edgeMac[0]);
  Serial.printf("DEMO_LOCK — pinned to %02X:%02X:%02X:%02X:%02X:%02X, controls disabled\n",
                edgeMac[0][0], edgeMac[0][1], edgeMac[0][2],
                edgeMac[0][3], edgeMac[0][4], edgeMac[0][5]);
#endif
  initBle();

  // If we just rebooted from a tap fresh-pairing, reopen the 60s window now.
  prefs.begin("lplate", false);
  bool pairboot = prefs.getBool("pairboot", false);
  if (pairboot) prefs.putBool("pairboot", false);
  prefs.end();
  if (pairboot) enterPairing();
}

void loop() {
  checkBattery();
  handleSerial();
#ifndef DEMO_LOCK
  handleButton();
  pollUsbGesture();
#endif

  handleCal();                     // apply any calibration request from the app
  checkCalTimeout();
  if (calLive) { delay(10); return; }   // hold the servo still while calibrating

  updateSelfTest();

  if (pairing && millis() - pairingStart > PAIR_WINDOW) {
    pairing = false;
    Serial.println("DISCOVERY MODE off (timeout)");
  }

  // Local actuation — the hub is a plate too. The follower learns of the same
  // change on its next poll (answered in the ESP-NOW callback, so this ramp
  // can't starve it). Boot delay lets the rail settle first.
  if (desiredState != myState && millis() > SERVO_BOOT_DELAY_MS)
    movePlate(desiredState);

  // LED: blink while pairing, otherwise solid-on if we have followers, else off.
  if (pairing) digitalWrite(PIN_LED, (millis() / 250) & 1);
  else         digitalWrite(PIN_LED, edgeCount > 0);

  // Refresh the debug status ~1/s for the app.
  static uint32_t lastStat = 0;
  if (millis() - lastStat > 1000) { lastStat = millis(); pushStatus(); }

  delay(10);
}
