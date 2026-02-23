#include <Arduino.h>
#include <ArduinoJson.h>
#include <NimBLEDevice.h>
#include "ble_server.h"
#include "logging.h"
#include "odo.h"
#include "sd_card.h"

#define DEVICE_NAME "L-Plate"
#define SERVICE_UUID "FF00"
#define CHAR_START_UUID   "FF01"
#define CHAR_STOP_UUID    "FF02"
#define CHAR_ODO_UUID     "FF03"
#define CHAR_UPDATE_ODO_UUID "FF04"

static NimBLEServer* pServer = nullptr;
static NimBLECharacteristic* pOdoChr = nullptr;

static float trip_start_odo_km = 0;

static void handle_start_write(NimBLECharacteristic* pChr) {
  std::string val = pChr->getValue();
  if (val.empty()) return;

  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, val.c_str());
  if (err) {
    Serial.printf("BLE Start: JSON parse error\n");
    return;
  }

  long startTime = doc["startTime"] | 0;
  const char* sdId = doc["sdId"] | doc["SD_ID"] | "default";
  float startOdometer = doc["startOdometer"] | doc["startOdo"] | 0.0f;

  if (startTime > 0) {
    timeval tv = { startTime / 1000, (startTime % 1000) * 1000 };
    settimeofday(&tv, nullptr);
  }

  if (startOdometer > 0) {
    set_odo_km(startOdometer);
  }
  trip_start_odo_km = get_odo_km();

  start_loging((double)startTime, String(sdId));
  Serial.printf("BLE Start: trip started, odo=%.2f km\n", trip_start_odo_km);
}

static void handle_stop_write(NimBLECharacteristic* pChr) {
  std::string val = pChr->getValue();
  String weather = "sunny";
  if (!val.empty()) {
    JsonDocument doc;
    if (deserializeJson(doc, val.c_str()) == DeserializationError::Ok) {
      const char* w = doc["weather"];
      if (w) weather = w;
    }
  }
  stop_logging(weather);
  Serial.printf("BLE Stop: trip stopped, weather=%s\n", weather.c_str());
}

static void handle_update_odo_write(NimBLECharacteristic* pChr) {
  std::string val = pChr->getValue();
  if (val.empty()) return;

  float odoKm = 0;
  JsonDocument doc;
  if (deserializeJson(doc, val.c_str()) == DeserializationError::Ok) {
    odoKm = doc["odo"] | doc["odometer"] | 0.0f;
  }
  if (odoKm <= 0) odoKm = atof(val.c_str());
  if (odoKm > 0) {
    set_odo_km(odoKm);
    Serial.printf("BLE Update Odo: %.2f km\n", odoKm);
  }
}

class StartChrCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
    handle_start_write(pChr);
  }
};

class StopChrCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
    handle_stop_write(pChr);
  }
};

class OdoChrCallbacks : public NimBLECharacteristicCallbacks {
  void onRead(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
    float startOdo = trip_start_odo_km > 0 ? trip_start_odo_km : get_odo_km();
    float endOdo = get_odo_km();

    JsonDocument doc;
    doc["startOdo"] = round(startOdo * 100) / 100.0;
    doc["endOdo"] = round(endOdo * 100) / 100.0;

    String out;
    serializeJson(doc, out);
    pChr->setValue(out.c_str());
  }
};

class UpdateOdoChrCallbacks : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChr, NimBLEConnInfo& connInfo) override {
    handle_update_odo_write(pChr);
  }
};

static StartChrCallbacks startCb;
static StopChrCallbacks stopCb;
static OdoChrCallbacks odoCb;
static UpdateOdoChrCallbacks updateOdoCb;

class ServerCallbacks : public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pSrv, NimBLEConnInfo& connInfo) override {
    Serial.printf("BLE client connected: %s\n", connInfo.getAddress().toString().c_str());
  }
  void onDisconnect(NimBLEServer* pSrv, NimBLEConnInfo& connInfo, int reason) override {
    Serial.printf("BLE client disconnected, reason=%d\n", reason);
    NimBLEDevice::startAdvertising();
  }
};

static ServerCallbacks serverCb;

void init_ble_server() {
  NimBLEDevice::init(DEVICE_NAME);
  pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(&serverCb);

  NimBLEService* pSvc = pServer->createService(SERVICE_UUID);

  NimBLECharacteristic* pStartChr = pSvc->createCharacteristic(
    CHAR_START_UUID,
    NIMBLE_PROPERTY::WRITE
  );
  pStartChr->setCallbacks(&startCb);

  NimBLECharacteristic* pStopChr = pSvc->createCharacteristic(
    CHAR_STOP_UUID,
    NIMBLE_PROPERTY::WRITE
  );
  pStopChr->setCallbacks(&stopCb);

  pOdoChr = pSvc->createCharacteristic(
    CHAR_ODO_UUID,
    NIMBLE_PROPERTY::READ
  );
  pOdoChr->setCallbacks(&odoCb);

  NimBLECharacteristic* pUpdateOdoChr = pSvc->createCharacteristic(
    CHAR_UPDATE_ODO_UUID,
    NIMBLE_PROPERTY::WRITE
  );
  pUpdateOdoChr->setCallbacks(&updateOdoCb);

  pSvc->start();

  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->start();

  Serial.println("BLE server advertising as " DEVICE_NAME);
}

void ble_server_tick() {
  // NimBLE handles callbacks in its own task; nothing to poll here
}
