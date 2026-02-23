#include <Arduino.h>
#include <time.h>

#include "ble_server.h"
#include "logging.h"
#include "odo.h"
#include "sd_card.h"
#include "obd2_ble.h"

void setup() {
  Serial.begin(115200);
  Serial.println("L-Plate ESP32 starting...");
  delay(500);

  init_odo();
  init_sd_card();
  init_ble_server();
  init_obd2_ble();
}

void loop() {
  logging_callback();

  if (current_state == LOGGING) {
    obd2_tick();
  }

  ble_server_tick();

  delay(10);
}
