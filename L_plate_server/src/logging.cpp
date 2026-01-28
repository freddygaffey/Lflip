#include <Arduino.h>
#include "logging.h"
#include "odo.h"
#include "gps.h"

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

void update_odo();

void start_loging(long start_time, String SD_name) {
  Serial.println("logging function called");
  // write_start time 
  // write sd 
  current_state = LOGGING;
}
bool sync_data() {
    current_state = WAITING;
    return false;
}

void callback() { 
    update_odo();
    if (current_state == SYNCING) {
        sync_data();
    }
    if (current_state == LOGGING) {
        if (millis() - logging_rates.gps < time_of_last_gps_log) {
            time_of_last_gps_log = millis();
            // write_gps_db(get_gps_poss()) 
            Serial.println("loged gps");
        }
        if (millis() - logging_rates.acell < time_of_last_acell_log) {
            time_of_last_acell_log = millis();
            Serial.println("loged acell");
            // write_acell_db(get_current_acell()) 
        }
  }
  if (current_state == WAITING) {
    
  }
}

void update_odo() {
    update_ODO_with_speed(get_speed_mps());
}

void stop_logging(long end_time) {
  current_state = SYNCING; 
  // db_write_end_time(time_loging_stoped)
  Serial.println("logging stoped just wrote end time");
}
