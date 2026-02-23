#ifndef ODO_H
#define ODO_H

#include <Arduino.h>

void init_odo();
unsigned long get_odo();           // meters
float get_odo_km();                 // km (for BLE/API)
void set_odo(unsigned long odo_m);
void set_odo_km(float odo_km);
unsigned long update_ODO_with_speed(float speed_mps);

#endif
