#include <Preferences.h>
#include <Arduino.h>
#include "odo.h"

Preferences prefs;
unsigned long odo;  // meters
float time_last_saved_write = 0;
float time_last_saved_speed = 0;
float write_rate = 10000;  // ms

void init_odo() {
  prefs.begin("Lplate_app", false);
  odo = prefs.getULong("odo", 0);
}

unsigned long get_odo() {
  return odo;
}

float get_odo_km() {
  return odo / 1000.0f;
}

void set_odo(unsigned long odo_new) {
  odo = odo_new;
  if (time_last_saved_write + write_rate <= millis()) {
    prefs.putULong("odo", odo);
    time_last_saved_write = millis();
  }
}

void set_odo_km(float odo_km) {
  set_odo((unsigned long)(odo_km * 1000));
}

unsigned long update_ODO_with_speed(float speed_mps) {
  if (time_last_saved_speed == 0) {
    time_last_saved_speed = millis();
    return odo;
  }
  float t = (millis() - time_last_saved_speed) / 1000.0f;
  float d = t * speed_mps;
  unsigned long _odo = (unsigned long)d + get_odo();
  set_odo(_odo);
  time_last_saved_speed = millis();
  return _odo;
}
