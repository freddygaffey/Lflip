#ifndef SD_CARD_H
#define SD_CARD_H

#include <Arduino.h>
#include <SD.h>
#include "gps.h"
#include "acell.h"

bool init_sd_card();
File make_log_file(float odo_m, String sd_name);
void end_trip(unsigned long end_odo, String weather);
File _get_log_file();
void log_acell(Acell acell);
void log_gps(GpsCords gps_cord, float gps_speed_ms);
void delete_current_log();
void _check_buff_and_write_to_file();

#endif