#include <Arduino.h>
#include "logging.h"
#include "odo.h"
#include "sd_card.h"
#include "obd2_ble.h"

#define ODO_UPDATE_INTERVAL_MS 1000
#define ODO_LOG_INTERVAL_MS   10000

State current_state = WAITING;
unsigned long last_odo_update_ms = 0;
unsigned long last_odo_log_ms = 0;

void start_loging(double start_time, String SD_name) {
  (void)start_time;
  current_state = LOGGING;
  make_log_file(get_odo_km(), SD_name);
  last_odo_update_ms = millis();
  last_odo_log_ms = millis();

  // Try to connect to OBD2 dongle (blocks up to ~10s if scanning)
  if (!is_obd2_connected()) {
    connect_to_obd2();
  }
}

void stop_logging(String weather) {
  current_state = SYNCING;
  end_trip(get_odo_km(), weather);
  Serial.println("Logging stopped");
}

void logging_callback() {
  if (current_state == SYNCING) {
    current_state = WAITING;
    return;
  }

  if (current_state != LOGGING) return;

  unsigned long now = millis();

  // Update odo from OBD2 speed
  if (now - last_odo_update_ms >= ODO_UPDATE_INTERVAL_MS) {
    last_odo_update_ms = now;
    float speed_kmh = read_vehicle_speed_kmh();
    float speed_mps = speed_kmh / 3.6f;
    update_ODO_with_speed(speed_mps);
  }

  // Log odo sample to SD periodically
  if (now - last_odo_log_ms >= ODO_LOG_INTERVAL_MS) {
    last_odo_log_ms = now;
    log_odo_sample(get_odo_km());
  }
}
