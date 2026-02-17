#include <Arduino.h>
#include "logging.h"
#include "odo.h"
#include "gps.h"
#include "sd_card.h"
#include "acell.h" 
#include "wifi_manager.h"

struct Logging_rates
{
    // mills dealy between logs
    float gps = 1000;
    float acell = 250;
};

Logging_rates logging_rates;

State current_state = WAITING;

unsigned long  time_of_last_gps_log = millis();
unsigned long  time_of_last_acell_log = millis();

unsigned long time_logging_stoped = 0;
time_t drive_start_time = 0;
unsigned long drive_start_odo = 0;

int no_left_to_sync = 0;

void update_odo();

void start_logging(String SD_ID) {
  Serial.println("logging function called");
  current_state = LOGGING;
  drive_start_time = time(nullptr);
  drive_start_odo = get_odo();
  make_log_file(get_odo(),SD_ID);
}
bool sync_data() {
    if (!is_connected()) return false;
    if (no_left_to_sync >= 0) {
        // Serial.println("make it sync i have sunc if you wrote the funciton");
    }

    return false;
}

void callback() { 
    update_odo();
    sync_data();
    if (current_state == LOGGING) {
        if (millis() - logging_rates.gps  >= time_of_last_gps_log) {
            time_of_last_gps_log = millis();
            Serial.println("loged gps");
            log_gps(get_poss(), get_speed_mps());
        }
        if (millis() - logging_rates.acell >= time_of_last_acell_log) {
            time_of_last_acell_log = millis();
            Serial.println("loged acell");
            log_acell(get_acell());
        }
    }
    if (current_state == WAITING) {
        if (is_connected()) sync_data();
    }
}

void update_odo() {
    static unsigned long last_odo_update = 0;
    if (millis() - last_odo_update < (unsigned long)logging_rates.gps) return;
    last_odo_update = millis();

    update_ODO_with_position(get_poss(), get_speed_mps());
    Serial.println("ODO: " + String(get_odo()) + "m");
}

void stop_logging(String weather="NA") {
  if (current_state != LOGGING) return;
  current_state = WAITING; 
  end_trip(get_odo(),weather);
  Serial.println("logging stoped just wrote end time");
  if (is_connected()) sync_data();
  drive_start_time = 0;
  drive_start_odo = 0;
  if (no_left_to_sync >= 0) no_left_to_sync ++;
}

void cancel_trip(){
    if (current_state != LOGGING) return;
    current_state = WAITING;
    delete_current_log();
    drive_start_time = 0;
    drive_start_odo = 0;
    Serial.println("trip cancelled");
}

