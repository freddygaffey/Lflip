#include <Preferences.h>
#include <Arduino.h>

// #include "logging.h"

void init_odo();
unsigned long get_odo();
void set_odo(unsigned long odo_new);
unsigned long update_ODO_with_speed(float speed_mps);
