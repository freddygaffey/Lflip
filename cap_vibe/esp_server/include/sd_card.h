#ifndef SD_CARD_H
#define SD_CARD_H

#include <Arduino.h>
#include <SD.h>

bool init_sd_card();
File make_log_file(float odo_km, String sd_name);
void end_trip(float end_odo_km, String weather);
void log_odo_sample(float odo_km);

#endif
