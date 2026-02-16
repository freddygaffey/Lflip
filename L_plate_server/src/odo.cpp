#include <Preferences.h>
#include <Arduino.h>

// #include "logging.h"

struct Ave_speed
{
    int count_updates = 0;
    float sum_of_speeds = 0;
    float odo_at_update = 0;
    float time_at_update = 0;
    void up_date_speed(float speed_ms) {
        count_updates ++;
        sum_of_speeds += speed_ms;
    } 
    float get_ave_speed() {
        if (count_updates == 0) return 0.0;
        return sum_of_speeds / count_updates;}
};

Ave_speed aveSpeed;

Preferences prefs;
unsigned long odo; // meters
unsigned long time_last_saved_write = 0;
unsigned long time_last_updated_speed = millis();
unsigned long write_rate = 100000; // ms TODO: make this bigger 

void init_odo() {
  prefs.begin("Lplate_app", false);
  odo = prefs.getULong("odo", 0);
}

unsigned long get_odo() { 
    return odo;
}

void save_odo() {
    prefs.putULong("odo", odo);
    time_last_saved_write = millis();

    aveSpeed = Ave_speed();
}

void set_odo(unsigned long odo_new) { 
    odo = odo_new;
    if (time_last_saved_write + write_rate <= millis()) {
        prefs.putULong("odo", odo);
        time_last_saved_write = millis();
    }
}

unsigned long update_ODO_with_speed(float speed_mps) {
    // s = d / t
    // d = s * t
    if (aveSpeed.odo_at_update == 0) {
        aveSpeed.odo_at_update = get_odo();
        aveSpeed.time_at_update = millis();
    }
    aveSpeed.up_date_speed(speed_mps);
    float s = aveSpeed.get_ave_speed();
    float t = (millis() - aveSpeed.time_at_update)/1000.0;
    unsigned long new_int = aveSpeed.odo_at_update + s*t;
    set_odo(new_int);
    return new_int;
}