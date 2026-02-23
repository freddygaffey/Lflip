#include <Arduino.h>
#include <NimBLEDevice.h>
#include "obd2_ble.h"

#define OBD2_SERVICE_UUID     "FFE0"
#define OBD2_CHAR_UUID        "FFE1"
#define OBD2_DEFAULT_NAME     "OBDII"
#define OBD2_SCAN_TIMEOUT_MS  10000
#define OBD2_POLL_INTERVAL_MS 500

static NimBLEClient* pClient = nullptr;
static NimBLERemoteCharacteristic* pObdChar = nullptr;
static bool connected = false;
static unsigned long last_poll_ms = 0;
static float last_speed_kmh = 0;
static float integrated_trip_km = 0;
static unsigned long last_integration_ms = 0;
static String obd2_device_name = OBD2_DEFAULT_NAME;

static int parse_speed_response(const char* resp) {
  // ELM327 response: "41 0D XX" or "410DXX" - XX is speed in km/h
  const char* p = strstr(resp, "41");
  if (!p) p = strstr(resp, "0D");
  if (!p) return -1;

  char hex[4] = {0};
  int idx = 0;
  for (; *p && idx < 4; p++) {
    if ((*p >= '0' && *p <= '9') || (*p >= 'A' && *p <= 'F') || (*p >= 'a' && *p <= 'f')) {
      hex[idx++] = *p;
    }
  }
  if (idx >= 2) {
    hex[2] = hex[3] = 0;
    return (int)strtol(hex, nullptr, 16);
  }
  return -1;
}

void init_obd2_ble() {
  // NimBLE is already initialized by ble_server
  Serial.println("OBD2 BLE client ready");
}

bool connect_to_obd2(const char* deviceName) {
  if (deviceName) obd2_device_name = deviceName;

  NimBLEScan* pScan = NimBLEDevice::getScan();
  pScan->setActiveScan(true);
  pScan->setInterval(100);
  pScan->setWindow(99);

  NimBLEScanResults results = pScan->start(OBD2_SCAN_TIMEOUT_MS / 1000, false);
  NimBLEAdvertisedDevice* device = nullptr;

  for (int i = 0; i < results.getCount(); i++) {
    NimBLEAdvertisedDevice* adv = results.getDevice(i);
    String name = adv->getName().c_str();
    if (name.indexOf(obd2_device_name) >= 0 || name.indexOf("OBD") >= 0 || name.indexOf("Veepeak") >= 0) {
      device = adv;
      break;
    }
  }

  if (!device) {
    Serial.println("OBD2 device not found");
    return false;
  }

  pClient = NimBLEDevice::createClient();
  if (!pClient->connect(device)) {
    Serial.println("OBD2 connect failed");
    return false;
  }

  NimBLERemoteService* pSvc = pClient->getService(OBD2_SERVICE_UUID);
  if (!pSvc) {
    pSvc = pClient->getService(NimBLEUUID((uint16_t)0xFFE0));
  }
  if (!pSvc) {
    Serial.println("OBD2 service not found");
    pClient->disconnect();
    return false;
  }

  pObdChar = pSvc->getCharacteristic(OBD2_CHAR_UUID);
  if (!pObdChar) {
    pObdChar = pSvc->getCharacteristic(NimBLEUUID((uint16_t)0xFFE1));
  }
  if (!pObdChar) {
    Serial.println("OBD2 char not found");
    pClient->disconnect();
    return false;
  }

  connected = true;
  integrated_trip_km = 0;
  last_integration_ms = millis();
  Serial.printf("OBD2 connected: %s\n", device->getName().c_str());
  return true;
}

void obd2_tick() {
  if (!connected || !pObdChar) return;

  if (millis() - last_poll_ms < OBD2_POLL_INTERVAL_MS) return;
  last_poll_ms = millis();

  if (!pObdChar->canWrite()) return;

  // Send vehicle speed PID: 010D
  pObdChar->writeValue("010D\r", 5);

  delay(80);

  if (pObdChar->canRead()) {
    std::string val = pObdChar->readValue();
    int speed = parse_speed_response(val.c_str());
    if (speed >= 0 && speed <= 255) {
      last_speed_kmh = (float)speed;

      unsigned long now = millis();
      float dt_h = (now - last_integration_ms) / 3600000.0f;
      integrated_trip_km += last_speed_kmh * dt_h;
      last_integration_ms = now;
    }
  }
}

float read_vehicle_speed_kmh() {
  return last_speed_kmh;
}

float get_integrated_trip_km() {
  return integrated_trip_km;
}

bool is_obd2_connected() {
  return connected && pClient && pClient->isConnected();
}
