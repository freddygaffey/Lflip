// MASTER firmware — ESP32-C3 in the OBD port. Always powered.
//
// Jobs:
//   1. BLE server the phone connects to; phone writes 0/1 -> desired plate state.
//   2. ESP-NOW: paired edges poll us (encrypted) and we reply with the state.
//   3. Pairing: a button puts us in pairing mode; unpaired edges broadcast a
//      request, we record their MAC, hand them the system encryption key (LMK),
//      and save everything to flash so it survives power-off.
//
// Pairing handshake follows the well-known ESP-NOW auto-pairing pattern
// (see github.com/tomorrow56/ESPNowAutoPairing); encryption + NVS added on top.
#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include <esp_random.h>
#include <Preferences.h>
#include <NimBLEDevice.h>
#include "protocol.h"

// ── Pins (XIAO ESP32-C3) ──────────────────────────────────────────────────
constexpr int PIN_BUTTON = D1;   // pairing button to GND (uses internal pull-up)
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
uint8_t      lmk[KEY_LEN];
bool         hasLmk = false;
String       gUid;          // unique per-master id, advertised in the BLE name

// Per-edge runtime stats (for the debug panel; not persisted).
uint32_t     edgeLastSeen[MAX_EDGES] = {0};   // millis() of last POLL, 0 = never
uint16_t     edgeBattMv[MAX_EDGES]   = {0};   // last reported battery mV
uint8_t      edgeCur[MAX_EDGES]      = {0};    // last reported plate state

volatile PlateState desiredState = PlateState::DOWN;   // set by the phone
bool      pairing = false;
uint32_t  pairingStart = 0;

// ── small helpers ──────────────────────────────────────────────────────────
static bool macEq(const uint8_t* a, const uint8_t* b) { return memcmp(a, b, 6) == 0; }

static int findEdge(const uint8_t* mac) {
  for (int i = 0; i < edgeCount; i++) if (macEq(edgeMac[i], mac)) return i;
  return -1;
}

static void addEncryptedPeer(const uint8_t* mac) {
  if (esp_now_is_peer_exist(mac)) esp_now_del_peer(mac);
  esp_now_peer_info_t p = {};
  memcpy(p.peer_addr, mac, 6);
  memcpy(p.lmk, lmk, KEY_LEN);
  p.channel = ESPNOW_CHANNEL;
  p.encrypt = true;
  esp_now_add_peer(&p);
}

// ── persistence ─────────────────────────────────────────────────────────────
static void saveConfig() {
  prefs.begin("lplate", false);
  prefs.putUChar("n", edgeCount);
  prefs.putBytes("lmk", lmk, KEY_LEN);
  prefs.putBool("haslmk", hasLmk);
  for (int i = 0; i < edgeCount; i++) {
    char k[4]; snprintf(k, sizeof(k), "e%d", i);
    prefs.putBytes(k, edgeMac[i], 6);
  }
  prefs.end();
}

static void loadConfig() {
  prefs.begin("lplate", true);
  edgeCount = prefs.getUChar("n", 0);
  hasLmk    = prefs.getBool("haslmk", false);
  prefs.getBytes("lmk", lmk, KEY_LEN);
  if (edgeCount > MAX_EDGES) edgeCount = 0;
  for (int i = 0; i < edgeCount; i++) {
    char k[4]; snprintf(k, sizeof(k), "e%d", i);
    prefs.getBytes(k, edgeMac[i], 6);
  }
  prefs.end();
  Serial.printf("loaded %u edge(s), lmk=%s\n", edgeCount, hasLmk ? "yes" : "no");
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

// Reply to a paired edge's poll with the current desired state (encrypted).
static void sendCmd(const uint8_t* mac) {
  CmdMsg cmd = {};
  cmd.version = PROTO_VERSION;
  cmd.type    = MsgType::CMD;
  cmd.desired = desiredState;
  esp_now_send(mac, (uint8_t*)&cmd, sizeof(cmd));
}

// Pair a new edge: record it, then hand over the LMK in a plaintext ack.
static void pairEdge(const uint8_t* mac) {
  if (!hasLmk) {                              // first ever pairing: make the key
    esp_fill_random(lmk, KEY_LEN);
    hasLmk = true;
    Serial.println("generated new system LMK");
  }
  if (findEdge(mac) < 0) {                    // remember this MAC
    if (edgeCount >= MAX_EDGES) { Serial.println("edge list full"); return; }
    memcpy(edgeMac[edgeCount++], mac, 6);
    saveConfig();
    Serial.printf("paired new edge #%u\n", edgeCount - 1);
  }

  // Send the LMK to the edge over a TEMPORARY unencrypted unicast peer...
  if (esp_now_is_peer_exist(mac)) esp_now_del_peer(mac);
  esp_now_peer_info_t tmp = {};
  memcpy(tmp.peer_addr, mac, 6);
  tmp.channel = ESPNOW_CHANNEL;
  tmp.encrypt = false;
  esp_now_add_peer(&tmp);

  PairAckMsg ack = {};
  ack.version = PROTO_VERSION;
  ack.type    = MsgType::PAIR_ACK;
  memcpy(ack.lmk, lmk, KEY_LEN);
  esp_now_send(mac, (uint8_t*)&ack, sizeof(ack));
  delay(20);

  // ...then swap that edge over to an ENCRYPTED peer for all future traffic.
  addEncryptedPeer(mac);
}

void onEspNowRecv(const uint8_t* mac, const uint8_t* data, int len) {
  if (len < 2) return;
  uint8_t  ver  = data[0];
  MsgType  type = (MsgType)data[1];
  if (ver != PROTO_VERSION) return;

  if (type == MsgType::PAIR_REQ) {
    if (!pairing) return;                       // ignore unless we're listening
    Serial.printf("PAIR_REQ from %02X:%02X:%02X:%02X:%02X:%02X\n",
                  mac[0],mac[1],mac[2],mac[3],mac[4],mac[5]);
    pairEdge(mac);
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
  Serial.println("PAIRING MODE on (60s)");
}

void initEspNow() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) { Serial.println("ESP-NOW init FAILED"); return; }
  esp_now_set_pmk(ESPNOW_PMK);
  esp_now_register_recv_cb(onEspNowRecv);
  for (int i = 0; i < edgeCount; i++) addEncryptedPeer(edgeMac[i]);  // re-arm saved
  Serial.printf("ESP-NOW up, my MAC %s\n", WiFi.macAddress().c_str());
}

// ── BLE ──────────────────────────────────────────────────────────────────────
NimBLECharacteristic* statChar = nullptr;   // status JSON, pushed to the app

// Plate state write: 0 = down, 1 = up.
class PlateCharCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) override {
    std::string v = c->getValue();
    if (v.empty()) return;
    desiredState = ((uint8_t)v[0] == 0) ? PlateState::DOWN : PlateState::UP;
    Serial.printf("BLE write -> desired=%u\n", (unsigned)desiredState);
  }
};

// Debug command write (single opcode byte):
//   1 = enter pairing mode   2 = factory reset   3 = stop pairing
class CmdCharCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* c) override {
    std::string v = c->getValue();
    if (v.empty()) return;
    switch ((uint8_t)v[0]) {
      case 1: enterPairing(); break;
      case 2: factoryReset(); break;                 // restarts the device
      case 3: pairing = false; Serial.println("PAIRING MODE off (app)"); break;
      default: Serial.printf("unknown cmd %u\n", (unsigned)v[0]);
    }
  }
};

// Build the status JSON the debug panel reads (paired edges, ages, battery...).
static String buildStatus() {
  String s = "{\"uid\":\"" + gUid + "\",\"up\":" + String(millis() / 1000)
           + ",\"edges\":" + String(edgeCount)
           + ",\"desired\":" + String((unsigned)desiredState)
           + ",\"pairing\":" + (pairing ? "true" : "false")
           + ",\"e\":[";
  for (int i = 0; i < edgeCount; i++) {
    if (i) s += ",";
    char mac[18];
    snprintf(mac, sizeof(mac), "%02X:%02X:%02X:%02X:%02X:%02X",
             edgeMac[i][0], edgeMac[i][1], edgeMac[i][2],
             edgeMac[i][3], edgeMac[i][4], edgeMac[i][5]);
    long age = edgeLastSeen[i] ? (long)(millis() - edgeLastSeen[i]) : -1;
    s += "{\"i\":" + String(i) + ",\"mac\":\"" + mac + "\",\"age\":" + String(age)
       + ",\"mv\":" + String(edgeBattMv[i]) + ",\"cur\":" + String(edgeCur[i]) + "}";
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
void ensureUid() {
  prefs.begin("lplate", false);
  gUid = prefs.getString("uid", "");
  if (gUid.length() == 0) {
    char buf[9];
    snprintf(buf, sizeof(buf), "%08X", (unsigned)esp_random());
    gUid = buf;
    prefs.putString("uid", gUid);
    Serial.printf("generated UID %s\n", gUid.c_str());
  }
  prefs.end();
}

void initBle() {
  String name = "LP-" + gUid;
  NimBLEDevice::init(name.c_str());
  NimBLEServer* server = NimBLEDevice::createServer();
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
}

// Bench testing without a physical button: type a letter in the serial monitor.
//   p = enter pairing   r = factory reset   s = status
void handleSerial() {
  if (!Serial.available()) return;
  switch (Serial.read()) {
    case 'p': enterPairing(); break;
    case 'r': factoryReset(); break;
    case 's': Serial.printf("status: %u edge(s) paired, desired=%u, pairing=%d\n",
                            edgeCount, (unsigned)desiredState, pairing); break;
  }
}

void loop() {
  handleSerial();
  switch (pollButton()) {
    case 1: enterPairing();   break;
    case 2: factoryReset();   break;
  }

  if (pairing && millis() - pairingStart > PAIR_WINDOW) {
    pairing = false;
    Serial.println("PAIRING MODE off (timeout)");
  }

  // LED: blink while pairing, otherwise solid-on if we have edges, else off.
  if (pairing)            digitalWrite(PIN_LED, (millis() / 250) & 1);
  else                    digitalWrite(PIN_LED, edgeCount > 0);

  // Refresh the debug status ~1/s for the app.
  static uint32_t lastStat = 0;
  if (millis() - lastStat > 1000) { lastStat = millis(); pushStatus(); }

  delay(10);
}
