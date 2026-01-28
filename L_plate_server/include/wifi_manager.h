#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>

extern WiFiServer server;

bool start_ap();
std::vector<String> get_ssid_scan();
void add_wifi_network(const char* ssid, const char* pwd);
std::vector<String> get_all_pwd();
std::vector<String> get_all_ssid();
bool connect_to_wifi();
