// MASTER firmware — ESP32-C3 in the OBD port. Always powered.
//
// Jobs:
//   1. BLE server the phone connects to; phone writes 0/1 -> desired plate state.
//   2. ESP-NOW: paired edges poll us and we reply with the state.
//   3. Pairing: a button puts us in pairing mode; unpaired edges broadcast a
//      request, we record their MAC, reply to confirm, and save it to flash so
//      it survives power-off.
//
// Pairing handshake follows the well-known ESP-NOW auto-pairing pattern
// (see github.com/tomorrow56/ESPNowAutoPairing); NVS persistence added on top.
#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include <esp_random.h>
#include <Preferences.h>
#include <NimBLEDevice.h>
#include "protocol.h"

// ── Pins (XIAO ESP32-C3) ──────────────────────────────────────────────────
// Use the board's onboard BOOT button (GPIO9) — no external wiring needed.
// It idles HIGH (internal pull-up) and reads LOW while pressed, same as any
// button-to-GND. The onboard RESET button is hardwired to the chip's reset
// line and just reboots; firmware can't read it, so it has no role here.
constexpr int PIN_BUTTON = 9;    // onboard BOOT button (GPIO9), active-low
constexpr int PIN_LED    = D2;   // status LED (blinks while pairing)

// ── BLE identifiers (the phone app must use these exact UUIDs) ─────────────
static const char* SVC_UUID  = "a1b2c3d4-0001-4000-8000-000000000001";
static const char* CHAR_UUID = "a1b2c3d4-0002-4000-8000-000000000002";  // plate 0/1
static const char* CMD_UUID  = "a1b2c3d4-0003-4000-8000-000000000003";  // debug cmd
static const char* STAT_UUID = "a1b2c3d4-0004-4000-8000-000000000004";  // status JSON

// ── Persistent + runtime config ───────────────────────────────────────────
constexpr uint8_t MAX_EDGES   = 4;
constexpr uint32_t PAIR_WINDOW = 60000;   // pairing auto-exits after 60 s

Preferences  prefs;
uint8_t      edgeMac[MAX_EDGES][6];
uint8_t      edgeCount = 0;
String       gUid;          // unique per-master id, advertised in the BLE name

// Per-edge runtime stats (for the debug panel; not persisted).
uint32_t     edgeLastSeen[MAX_EDGES] = {0};   // millis() of last POLL, 0 = never
uint16_t     edgeBattMv[MAX_EDGES]   = {0};   // last reported battery mV
uint8_t      edgeCur[MAX_EDGES]      = {0};    // last reported plate state

volatile PlateState desiredState = PlateState::CENTER;   // set by the phone (boot = off)
volatile bool       phoneConnected = false;              // a phone is on the BLE link now
volatile uint32_t   desiredSince = 0;                 // millis() when it last changed
bool      pairing = false;
uint32_t  pairingStart = 0;

// Flip verdict thresholds (for the app's trip-start screen):
constexpr uint32_t EDGE_STALE_MS    = 8000;   // no POLL for this long = edge gone
constexpr uint32_t FLIP_TIMEOUT_MS  = 10000;  // not confirmed by now = flip failed

// Discovery: edges we've HEARD in pairing mode but not yet paired. The app reads
// this list, the user picks which to pair. (Filled from PAIR_REQ broadcasts.)
constexpr uint8_t  MAX_CAND = 6;
uint8_t   candMac[MAX_CAND][6];
uint32_t  candSeen[MAX_CAND] = {0};   // millis() last heard
uint8_t   candCount = 0;

// Self-test of a freshly paired edge: did it poll us back (link works)?
constexpr uint32_t TEST_TIMEOUT_MS = 6000;
int         testEdge   = -1;          // edge index under test, -1 = none
uint32_t    testStart  = 0;
const char* testResult = "none";      // "none" | "testing" | "pass" | "fail"

// ── small helpers ──────────────────────────────────────────────────────────
static bool macEq(const uint8_t* a, const uint8_t* b) { return memcmp(a, b, 6) == 0; }

static int findEdge(const uint8_t* mac) {
  for (int i = 0; i < edgeCount; i++) if (macEq(edgeMac[i], mac)) return i;
  return -1;
}

// Remember an edge we heard during discovery (or refresh its last-heard time).
static void addCandidate(const uint8_t* mac) {
  for (int i = 0; i < candCount; i++)
    if (macEq(candMac[i], mac)) { candSeen[i] = millis(); return; }   // already listed
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

// ── persistence ─────────────────────────────────────────────────────────────
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
  prefs.end();
  Serial.printf("loaded %u edge(s)\n", edgeCount);
}

static void factoryReset() {
  Serial.println("FACTORY RESET — clearing all pairings");
  prefs.begin("lplate", false);
  prefs.clear();
  prefs.end();
  delay(200);
  ESP.restart();
}

// ── ESP-NOW ─────────────────────────────────────────────────────────────────

// Reply to a paired edge's poll with the current desired state.
constexpr uint16_t FAST_POLL_MS = 300;
constexpr uint16_t IDLE_POLL_MS = 3000;

static void sendCmd(const uint8_t* mac) {
  CmdMsg cmd = {};
  cmd.version      = PROTO_VERSION;
  cmd.type         = MsgType::CMD;
  cmd.desired      = desiredState;
  cmd.next_poll_ms = phoneConnected ? FAST_POLL_MS : IDLE_POLL_MS;
  esp_now_send(mac, (uint8_t*)&cmd, sizeof(cmd));
}

// Pair a new edge: record its MAC, add it as a peer, then send the ack.
static void pairEdge(const uint8_t* mac) {
  if (findEdge(mac) < 0) {                    // remember this MAC
    if (edgeCount >= MAX_EDGES) { Serial.println("edge list full"); return; }
    memcpy(edgeMac[edgeCount++], mac, 6);
    saveConfig();
    Serial.printf("paired new edge #%u\n", edgeCount - 1);
  }

  // Add the edge as a peer so we can unicast to it, then send the ack that
  // confirms the pairing.
  addPeer(mac);

  PairAckMsg ack = {};
  ack.version = PROTO_VERSION;
  ack.type    = MsgType::PAIR_ACK;
  esp_now_send(mac, (uint8_t*)&ack, sizeof(ack));
}

// Start the self-test for a just-paired edge: we now wait for it to poll us
// (which proves the ESP-NOW link works). The verdict is set in updateSelfTest().
static void startSelfTest(const uint8_t* mac) {
  testEdge   = findEdge(mac);
  testStart  = millis();
  testResult = "testing";
  Serial.printf("self-test: waiting for edge #%d to report in\n", testEdge);
}

// The app picked a discovered MAC to pair. Only pair something we actually heard.
static void pairSelected(const uint8_t* mac) {
  bool known = false;
  for (int i = 0; i < candCount; i++) if (macEq(candMac[i], mac)) known = true;
  if (!known) { Serial.println("pair request for unknown MAC — ignoring"); return; }
  pairEdge(mac);
  startSelfTest(mac);
}

// Called every loop: resolve a running self-test to pass (edge polled in) or
// fail (timed out with no poll).
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

void onEspNowRecv(const uint8_t* mac, const uint8_t* data, int len) {
  if (len < 2) return;
  uint8_t  ver  = data[0];
  MsgType  type = (MsgType)data[1];
  if (ver != PROTO_VERSION) return;

  if (type == MsgType::PAIR_REQ) {
    if (!pairing) return;                       // ignore unless we're discovering
    Serial.printf("PAIR_REQ from %02X:%02X:%02X:%02X:%02X:%02X\n",
                  mac[0],mac[1],mac[2],mac[3],mac[4],mac[5]);
    addCandidate(mac);                          // list it too (app can still show it)
    // Auto-pair: while the 60 s window is open, adopt any unpaired plate that asks.
    bool isNew = findEdge(mac) < 0;
    if (!isNew || edgeCount < MAX_EDGES) {
      pairEdge(mac);
      if (isNew && findEdge(mac) >= 0) startSelfTest(mac);
    }
  } else if (type == MsgType::POLL) {
    int idx = findEdge(mac);
    if (idx < 0) return;                         // only answer known edges
    PollMsg poll; memcpy(&poll, data, sizeof(poll));
    edgeLastSeen[idx] = millis();                // record for the debug panel
    edgeBattMv[idx]   = poll.battMv;
    edgeCur[idx]      = (uint8_t)poll.current;
    Serial.printf("POLL  batt=%umV current=%u -> reply desired=%u\n",
                  poll.battMv, (unsigned)poll.current, (unsigned)desiredState);
    sendCmd(mac);
  }
}

static void enterPairing() {
  pairing = true;
  pairingStart = millis();
  candCount = 0;                 // fresh discovery — forget any old candidates
  Serial.println("DISCOVERY MODE on (60s) — listening for edges");
}

// BOOT-button action: disconnect every paired edge, wipe our pairing list, and
// reopen discovery so the now-freed edges (and any others) can be re-adopted.
// Order matters: we must tell the edges BEFORE we drop them as peers, because
// esp_now_send() needs the peer to still exist.
static void unpairAllAndRepair() {
  Serial.printf("BOOT: disconnecting %u edge(s), wiping pairings, re-pairing\n", edgeCount);

  // 1. Tell the children to disconnect. Unicast can drop, and we're about to
  //    forget them, so there's no retry — send a few times to make it stick.
  UnpairMsg msg = {};
  msg.version = PROTO_VERSION;
  msg.type    = MsgType::UNPAIR;
  for (int rep = 0; rep < 3; rep++) {
    for (int i = 0; i < edgeCount; i++)
      esp_now_send(edgeMac[i], (uint8_t*)&msg, sizeof(msg));
    delay(50);
  }

  // 2. Forget them locally: drop the ESP-NOW peers and clear the saved list.
  //    (UID is left intact, so the BLE name stays the same and the phone keeps
  //    working — this only forgets edges. A 5 s hold does the full reset.)
  for (int i = 0; i < edgeCount; i++)
    if (esp_now_is_peer_exist(edgeMac[i])) esp_now_del_peer(edgeMac[i]);
  edgeCount = 0;
  saveConfig();                  // persist the now-empty edge list

  // Clear the runtime stats/self-test so the debug panel isn't showing ghosts.
  for (int i = 0; i < MAX_EDGES; i++) { edgeLastSeen[i] = 0; edgeBattMv[i] = 0; edgeCur[i] = 0; }
  testEdge = -1; testResult = "none";

  // 3. Reopen discovery so the freshly-disconnected edges can re-pair.
  enterPairing();
}

void initEspNow() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) { Serial.println("ESP-NOW init FAILED"); return; }
  esp_now_register_recv_cb(onEspNowRecv);
  for (int i = 0; i < edgeCount; i++) addPeer(edgeMac[i]);  // re-add saved edges
  Serial.printf("ESP-NOW up, my MAC %s\n", WiFi.macAddress().c_str());
}

// ── BLE ──────────────────────────────────────────────────────────────────────
NimBLECharacteristic* statChar = nullptr;   // status JSON, pushed to the app

// Plate state write: 0 = L, 1 = CENTER (off), 2 = P.
class PlateCharCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) override {
    std::string v = c->getValue();
    if (v.empty()) return;
    uint8_t b = (uint8_t)v[0];
    if (b > 2) return;                                   // ignore out-of-range
    PlateState want = (PlateState)b;
    if (want != desiredState) desiredSince = millis();   // start the flip clock
    desiredState = want;
    Serial.printf("BLE write -> desired=%u\n", (unsigned)desiredState);
  }
};

// Command write from the app. First byte = opcode:
//   1 = enter discovery   2 = factory reset   3 = stop discovery
//   4 = pair this edge — followed by its 6-byte MAC (so the write is 7 bytes)
class CmdCharCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) override {
    std::string v = c->getValue();
    if (v.empty()) return;

    // opcode 4 carries a MAC: [0x04][6 MAC bytes]
    if ((uint8_t)v[0] == 4 && v.size() >= 7) {
      pairSelected((const uint8_t*)v.data() + 1);
      return;
    }

    // opcode 5 = servo calibration relay to one edge:
    //   [0x05][edgeIdx][action][us_lo][us_hi]   (us little-endian)
    // We just forward it to that edge as a SERVO_CAL message.
    if ((uint8_t)v[0] == 5 && v.size() >= 5) {
      uint8_t idx = (uint8_t)v[1];
      if (idx >= edgeCount) { Serial.printf("cal: bad edge idx %u\n", idx); return; }
      ServoCalMsg m = {};
      m.version = PROTO_VERSION;
      m.type    = MsgType::SERVO_CAL;
      m.action  = (uint8_t)v[2];
      m.us      = (uint16_t)((uint8_t)v[3] | ((uint8_t)v[4] << 8));
      esp_now_send(edgeMac[idx], (uint8_t*)&m, sizeof(m));
      Serial.printf("cal relay -> edge %u action=%u us=%u\n", idx, m.action, (unsigned)m.us);
      return;
    }

    switch ((uint8_t)v[0]) {
      case 1: enterPairing(); break;
      case 2: factoryReset(); break;                 // restarts the device
      case 3: pairing = false; Serial.println("DISCOVERY MODE off (app)"); break;
      default: Serial.printf("unknown cmd %u\n", (unsigned)v[0]);
    }
  }
};

// Decide the flip verdict the app's trip-start screen shows. The plates all move
// together, so this is one answer for the whole system:
//   "nohw"    no edge is currently reachable (none paired, or all gone quiet)
//   "ok"      every reachable edge reports it has reached the desired state
//   "pending" still waiting, but inside the timeout
//   "failed"  timeout passed and at least one edge never confirmed
static const char* flipStatus() {
  bool anyLive = false, allConfirmed = true;
  for (int i = 0; i < edgeCount; i++) {
    bool live = edgeLastSeen[i] && (millis() - edgeLastSeen[i] < EDGE_STALE_MS);
    if (!live) continue;
    anyLive = true;
    if (edgeCur[i] != (uint8_t)desiredState) allConfirmed = false;
  }
  if (!anyLive)      return "nohw";
  if (allConfirmed)  return "ok";
  if (millis() - desiredSince < FLIP_TIMEOUT_MS) return "pending";
  return "failed";
}

// Build the status JSON the debug panel reads (paired edges, ages, battery...).
static String buildStatus() {
  String s = "{\"uid\":\"" + gUid + "\",\"up\":" + String(millis() / 1000)
           + ",\"edges\":" + String(edgeCount)
           + ",\"desired\":" + String((unsigned)desiredState)
           + ",\"pairing\":" + (pairing ? "true" : "false")
           + ",\"flip\":\"" + flipStatus() + "\""
           + ",\"test\":\"" + testResult + "\""
           + ",\"e\":[";
  for (int i = 0; i < edgeCount; i++) {            // paired edges
    if (i) s += ",";
    char mac[18];
    snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
             edgeMac[i][0], edgeMac[i][1], edgeMac[i][2],
             edgeMac[i][3], edgeMac[i][4], edgeMac[i][5]);
    long age = edgeLastSeen[i] ? (long)(millis() - edgeLastSeen[i]) : -1;
    s += "{\"i\":" + String(i) + ",\"mac\":\"" + mac + "\",\"age\":" + String(age)
       + ",\"mv\":" + String(edgeBattMv[i]) + ",\"cur\":" + String(edgeCur[i]) + "}";
  }
  s += "],\"cand\":[";                             // discovered, not-yet-paired edges
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

// Refresh the status characteristic and notify any subscribed app.
static void pushStatus() {
  if (!statChar) return;
  String s = buildStatus();
  statChar->setValue((uint8_t*)s.c_str(), s.length());
  statChar->notify();
}

// Make a unique id once, persist it, and reuse it forever. Its presence means
// this master is provisioned; wiping NVS (factory reset) regenerates a fresh one.
// Short, friendly device id: 5 unambiguous chars (no 0/O/1/I), e.g. "K7X2M".
static String makeUid() {
  static const char cs[] = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";  // 32 chars, no 0/O/1/I
  uint32_t r = esp_random();
  char buf[6];
  for (int i = 0; i < 5; i++) { buf[i] = cs[r & 31]; r >>= 5; }
  buf[5] = '\0';
  return String(buf);
}

void ensureUid() {
  prefs.begin("lplate", false);
  gUid = prefs.getString("uid", "");
  if (gUid.length() != 5) {                 // empty, or an old-format id — (re)generate
    gUid = makeUid();
    prefs.putString("uid", gUid);
    Serial.printf("generated UID %s\n", gUid.c_str());
  }
  prefs.end();
}

// BOOT-tap: unpair the plates AND take a new identity (drops phones), then reopen
// pairing. One button = clean re-pair. Plate ESP-NOW links key off the hardware
// MAC not the BLE name, so powered plates re-join during the new pairing window.
static void freshPairingReset() {
  Serial.println("FRESH PAIRING — unpair plates, new identity, reopen pairing");
  UnpairMsg msg = {};
  msg.version = PROTO_VERSION;
  msg.type    = MsgType::UNPAIR;
  for (int rep = 0; rep < 3; rep++) {          // unicast can drop; send a few times
    for (int i = 0; i < edgeCount; i++)
      esp_now_send(edgeMac[i], (uint8_t*)&msg, sizeof(msg));
    delay(50);
  }
  edgeCount = 0;
  saveConfig();                                // forget the plates locally
  prefs.begin("lplate", false);
  prefs.putString("uid", makeUid());           // new BLE identity (drops phones on restart)
  prefs.putBool("pairboot", true);             // setup() reopens pairing after the reboot
  prefs.end();
  delay(150);
  ESP.restart();
}

// Track whether a phone is connected (drives the edge's fast/slow poll cadence).
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

  // Debug command + status characteristics (used by the app's debug panel).
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

// ── button: returns 0 none, 1 short press, 2 long (5s) press ──────────────────
int pollButton() {
  static bool down = false; static uint32_t downAt = 0; static bool longFired = false;
  bool now = digitalRead(PIN_BUTTON) == LOW;
  uint32_t t = millis();
  if (now && !down)            { down = true; downAt = t; longFired = false; }
  else if (now && down)        { if (!longFired && t - downAt >= 5000) { longFired = true; return 2; } }
  else if (!now && down)       { down = false; if (!longFired && t - downAt >= 30) return 1; }
  return 0;
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.printf("\nMASTER online — protocol v%u\n", PROTO_VERSION);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  loadConfig();
  ensureUid();
  initEspNow();
  initBle();

  // If we just rebooted from a BOOT-tap fresh-pairing, reopen the 60s window now.
  prefs.begin("lplate", false);
  bool pairboot = prefs.getBool("pairboot", false);
  if (pairboot) prefs.putBool("pairboot", false);
  prefs.end();
  if (pairboot) enterPairing();
}

// Bench testing without a physical button or app: type a letter in the serial
// monitor.  p = discovery   u = disconnect-all + wipe + re-pair (BOOT-tap)
//           l = list discovered   0-5 = pair that candidate
//           r = factory reset   s = status
void handleSerial() {
  if (!Serial.available()) return;
  char ch = Serial.read();
  if (ch >= '0' && ch <= '5') {                  // pair candidate N (bench shortcut)
    int n = ch - '0';
    if (n < candCount) pairSelected(candMac[n]);
    else Serial.printf("no candidate #%d\n", n);
    return;
  }
  switch (ch) {
    case 'p': enterPairing(); break;
    case 'u': unpairAllAndRepair(); break;   // same as a BOOT-button tap
    case 'l':
      Serial.printf("%u candidate(s):\n", candCount);
      for (int i = 0; i < candCount; i++)
        Serial.printf("  #%d %02X:%02X:%02X:%02X:%02X:%02X\n", i,
                      candMac[i][0],candMac[i][1],candMac[i][2],
                      candMac[i][3],candMac[i][4],candMac[i][5]);
      break;
    case 'r': factoryReset(); break;
    case 's': Serial.printf("status: %u edge(s) paired, desired=%u, pairing=%d, test=%s\n",
                            edgeCount, (unsigned)desiredState, pairing, testResult); break;
  }
}

void loop() {
  handleSerial();
  switch (pollButton()) {
    case 1: freshPairingReset();   break;   // tap  : unpair + new identity, reopen pairing
    case 2: factoryReset();        break;   // hold : full reset (wipes UID too)
  }

  updateSelfTest();             // resolve a running self-test to pass/fail

  if (pairing && millis() - pairingStart > PAIR_WINDOW) {
    pairing = false;
    Serial.println("DISCOVERY MODE off (timeout)");
  }

  // LED: blink while pairing, otherwise solid-on if we have edges, else off.
  if (pairing)            digitalWrite(PIN_LED, (millis() / 250) & 1);
  else                    digitalWrite(PIN_LED, edgeCount > 0);

  // Refresh the debug status ~1/s for the app.
  static uint32_t lastStat = 0;
  if (millis() - lastStat > 1000) { lastStat = millis(); pushStatus(); }

  delay(10);
}
