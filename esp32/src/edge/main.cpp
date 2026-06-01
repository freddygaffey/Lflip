// EDGE firmware — plate controller. Battery powered. Identical on every edge.
//
//   * Unpaired (fresh out of the box): broadcast PAIR_REQ until a master answers
//     with the system key (LMK), then save master MAC + LMK to flash.
//   * Paired: poll the master (encrypted) for the desired plate state and act.
//   * Button: tap = re-pair (forget master); hold 5 s = factory reset.
//
// (Servo + deep sleep come in a later phase; for now it logs the move.)
#include <Arduino.h>
#include <WiFi.h>
#include <esp_wifi.h>
#include <esp_now.h>
#include <Preferences.h>
#include "protocol.h"

constexpr int PIN_BUTTON = D1;   // re-pair / reset button to GND
constexpr int PIN_LED    = D2;   // status LED (blinks while pairing)

static const uint8_t BCAST[6] = { 0xFF,0xFF,0xFF,0xFF,0xFF,0xFF };
constexpr uint32_t POLL_EVERY = 3000;   // ms between polls (30000 later)
constexpr uint32_t REQ_EVERY  = 700;    // ms between pair requests

Preferences prefs;
bool       paired = false;
uint8_t    masterMac[6];
uint8_t    lmk[KEY_LEN];
PlateState myState = PlateState::DOWN;

// filled by the recv callback, acted on in loop()
volatile bool       gotCmd  = false;
volatile PlateState cmdWant = PlateState::DOWN;
volatile bool       gotAck  = false;
uint8_t             ackMaster[6];
uint8_t             ackLmk[KEY_LEN];

// ── persistence ─────────────────────────────────────────────────────────────
static void saveConfig() {
  prefs.begin("lplate", false);
  prefs.putBool("paired", paired);
  prefs.putBytes("mmac", masterMac, 6);
  prefs.putBytes("lmk", lmk, KEY_LEN);
  prefs.end();
}

static void loadConfig() {
  prefs.begin("lplate", true);
  paired = prefs.getBool("paired", false);
  prefs.getBytes("mmac", masterMac, 6);
  prefs.getBytes("lmk", lmk, KEY_LEN);
  prefs.end();
  Serial.printf("paired=%s\n", paired ? "yes" : "no");
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

static void addMasterEncrypted() {
  if (esp_now_is_peer_exist(masterMac)) esp_now_del_peer(masterMac);
  esp_now_peer_info_t p = {};
  memcpy(p.peer_addr, masterMac, 6);
  memcpy(p.lmk, lmk, KEY_LEN);
  p.channel = ESPNOW_CHANNEL;
  p.encrypt = true;
  esp_now_add_peer(&p);
}

void onEspNowRecv(const uint8_t* mac, const uint8_t* data, int len) {
  if (len < 2) return;
  if (data[0] != PROTO_VERSION) return;
  MsgType type = (MsgType)data[1];

  if (type == MsgType::PAIR_ACK && !paired) {
    PairAckMsg ack; memcpy(&ack, data, sizeof(ack));
    memcpy(ackMaster, mac, 6);
    memcpy(ackLmk, ack.lmk, KEY_LEN);
    gotAck = true;                              // finish the work in loop()
  } else if (type == MsgType::CMD && paired) {
    if (memcmp(mac, masterMac, 6) != 0) return; // only our master
    CmdMsg cmd; memcpy(&cmd, data, sizeof(cmd));
    cmdWant = cmd.desired;
    gotCmd  = true;
  }
}

void initEspNow() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  esp_wifi_set_channel(ESPNOW_CHANNEL, WIFI_SECOND_CHAN_NONE);
  if (esp_now_init() != ESP_OK) { Serial.println("ESP-NOW init FAILED"); return; }
  esp_now_set_pmk(ESPNOW_PMK);
  esp_now_register_recv_cb(onEspNowRecv);
  addBroadcastPeer();
  if (paired) addMasterEncrypted();
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
  poll.battMv  = 0;                 // real reading in a later phase
  poll.current = myState;
  esp_now_send(masterMac, (uint8_t*)&poll, sizeof(poll));
}

// move the plate (placeholder until the servo/MOSFET phase)
static void movePlate(PlateState s) {
  Serial.printf("  -> moving plate to %u\n", (unsigned)s);
  myState = s;
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
  loadConfig();
  initEspNow();
}

void loop() {
  switch (pollButton()) {
    case 1:                                     // re-pair: forget our master
      if (paired && esp_now_is_peer_exist(masterMac)) esp_now_del_peer(masterMac);
      paired = false;
      Serial.println("re-pairing requested");
      break;
    case 2:
      factoryReset();
      break;
  }

  if (!paired) {
    // ── pairing mode ──
    digitalWrite(PIN_LED, (millis() / 250) & 1);   // blink
    sendPairReq();

    uint32_t start = millis();
    while (!gotAck && millis() - start < REQ_EVERY) { delay(5); }

    if (gotAck) {
      memcpy(masterMac, ackMaster, 6);
      memcpy(lmk, ackLmk, KEY_LEN);
      addMasterEncrypted();
      paired = true;
      gotAck = false;
      saveConfig();
      Serial.printf("PAIRED to %02X:%02X:%02X:%02X:%02X:%02X\n",
                    masterMac[0],masterMac[1],masterMac[2],
                    masterMac[3],masterMac[4],masterMac[5]);
      digitalWrite(PIN_LED, HIGH);
    }
    return;
  }

  // ── normal mode ──
  gotCmd = false;
  sendPoll();
  Serial.printf("POLL sent (current=%u)\n", (unsigned)myState);

  uint32_t start = millis();
  while (!gotCmd && millis() - start < 500) { delay(5); }

  if (gotCmd) {
    Serial.printf("CMD reply: desired=%u (we are %u)\n",
                  (unsigned)cmdWant, (unsigned)myState);
    if (cmdWant != myState) movePlate(cmdWant);
  } else {
    Serial.println("no reply (master out of range?)");
  }

  delay(POLL_EVERY);
}
