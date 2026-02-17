#include <Preferences.h>
#include <Arduino.h>
#include "gps.h"

// #include "logging.h"

void init_odo();
unsigned long get_odo();
void set_odo(unsigned long odo_new);
void save_odo();
unsigned long update_ODO_with_position(GpsCords current_pos, float speed_mps);
