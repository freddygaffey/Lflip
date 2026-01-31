#include <Arduino.h>
#include "logging.h"
#include "odo.h"
#include "gps.h"
#include "sd_card.h"
#include "acell.h" 

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
  make_log_file(get_odo(),SD_name);
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
        if (millis() - logging_rates.gps  >= time_of_last_gps_log) {
            time_of_last_gps_log = millis();
            // write_gps_db(get_gps_poss()) 
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
    
  }
}

void update_odo() {
    update_ODO_with_speed(get_speed_mps());
}

void stop_logging(String weather) {
  current_state = SYNCING; 
  end_trip(get_odo(),weather);
  Serial.println("logging stoped just wrote end time");
}
