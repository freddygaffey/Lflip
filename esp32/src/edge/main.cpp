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
#include <ESP32Servo.h>
#include "protocol.h"
#include "battery.h"

constexpr int PIN_BUTTON    = D1;   // re-pair / reset button to GND
constexpr int PIN_LED       = D2;   // status LED (blinks while pairing)
constexpr int PIN_SERVO_PWR = D9;   // MOSFET gate: HIGH = servo powered, LOW = off
constexpr int PIN_SERVO_PWM = D10;  // servo control signal (PWM)

// Servo travel. Tune the two angles to your mechanical stops.
constexpr int SERVO_DOWN_DEG  = 0;     // plate down / closed
constexpr int SERVO_UP_DEG    = 90;    // plate up / open
constexpr uint32_t SERVO_TRAVEL_MS = 5000;  // TEST: hold power 5s (real value ~600)

Servo plateServo;

// ── PWM_TEST (servo jog/calibration) ─────────────────────────────────────────
// Set to 1 to power the servo and JOG it from the serial monitor so you can find
// the safe end-points (just before it grinds against a stop). Keys:
//   +  / -   nudge ±25us      ]  / [   nudge ±100us
// Note the us value where the plate is fully UP and fully DOWN, tell those to me,
// and I'll bake them in. Set back to 0 after calibrating.
#define PWM_TEST 1
int testUs = 1500;   // current jog position (start centred)

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

// Move the plate: power the servo (MOSFET on), drive it to the angle, wait,
// then cut power. The plate rests on a mechanical stop so it holds with no draw.
// The PWM line is forced LOW before cutting power so it can't backfeed the
// unpowered servo through its signal pin.
static void movePlate(PlateState s) {
  const int angle = (s == PlateState::UP) ? SERVO_UP_DEG : SERVO_DOWN_DEG;
  Serial.printf("  -> moving plate to %u (%d deg)\n", (unsigned)s, angle);

  digitalWrite(PIN_SERVO_PWR, HIGH);              // power the servo
  delay(20);                                      // let the rail settle
  plateServo.attach(PIN_SERVO_PWM, 500, 2400);    // start PWM
  plateServo.write(angle);
  delay(SERVO_TRAVEL_MS);                          // wait for the arm to arrive

  plateServo.detach();                            // stop PWM
  pinMode(PIN_SERVO_PWM, OUTPUT);
  digitalWrite(PIN_SERVO_PWM, LOW);               // no signal-line backfeed
  digitalWrite(PIN_SERVO_PWR, LOW);               // cut power; mechanical rest holds

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
  pinMode(PIN_SERVO_PWR, OUTPUT);
  digitalWrite(PIN_SERVO_PWR, LOW);          // servo unpowered at boot
  pinMode(PIN_SERVO_PWM, OUTPUT);
  digitalWrite(PIN_SERVO_PWM, LOW);          // idle the signal line (no backfeed)
#if PWM_TEST
  digitalWrite(PIN_SERVO_PWR, HIGH);              // MOSFET always ON
  plateServo.attach(PIN_SERVO_PWM, 500, 2500);    // PWM on D9
  Serial.println("PWM_TEST sweep: D10 sweeps 500<->2500us, MOSFET always ON");
#endif
  loadConfig();
  initEspNow();
}

// Bench testing without a physical button: type a letter in the serial monitor.
//   p = re-pair (forget master)   r = factory reset   s = status
void handleSerial() {
  if (!Serial.available()) return;
  switch (Serial.read()) {
    case 'p':
      if (paired && esp_now_is_peer_exist(masterMac)) esp_now_del_peer(masterMac);
      paired = false;
      Serial.println("re-pairing requested");
      break;
    case 'r': factoryReset(); break;
    case 's': Serial.printf("status: paired=%d, myState=%u\n", paired, (unsigned)myState); break;
  }
}

void loop() {
  // Low-battery guard (every 5s): cut the servo and park in deep sleep before
  // the cell is over-discharged. Runs in ALL modes incl. PWM_TEST, so a board
  // left running on battery can't flatten the cell. Needs the A0 divider; with
  // none wired it reads ~0 and does nothing. See lib/power/battery.h.
  static uint32_t lastBattChk = 0;
  if (millis() - lastBattChk > 5000) {
    lastBattChk = millis();
    if (batt::isLow()) {
      digitalWrite(PIN_SERVO_PWR, LOW);           // cut servo power
      plateServo.detach();
      pinMode(PIN_SERVO_PWM, OUTPUT);
      digitalWrite(PIN_SERVO_PWM, LOW);
      digitalWrite(PIN_LED, LOW);
      batt::parkForever();
    }
  }

#if PWM_TEST
  // MOSFET stays ON (set HIGH in setup). Smooth 180deg sweep 500<->2500us.
  uint32_t phase = millis() % 6000;
  int us = (phase < 3000) ? 500 + phase * 2000 / 3000
                          : 2500 - (phase - 3000) * 2000 / 3000;
  plateServo.writeMicroseconds(us);
  delay(5);   // finer updates = smoother sweep
  return;
#endif

  handleSerial();
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
