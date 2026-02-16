#pragma once

#include <Arduino.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <time.h>

void add_SVD(String SVD_full_name, int licence_no, String nick_name);
JsonDocument get_all_svd();
void set_SVD(String hash_id);