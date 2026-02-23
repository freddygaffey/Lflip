#ifndef OBD2_BLE_H
#define OBD2_BLE_H

#include <Arduino.h>

void init_obd2_ble();
bool connect_to_obd2(const char* deviceName = nullptr);
void obd2_tick();
float read_vehicle_speed_kmh();
float get_integrated_trip_km();
bool is_obd2_connected();

#endif
