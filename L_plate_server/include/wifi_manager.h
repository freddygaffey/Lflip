#pragma once

#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>

extern WiFiServer server;

bool start_ap();
std::vector<String> get_ssid_scan();
void add_wifi_network(String ssid, String pwd);
std::vector<String> get_all_pwd();
std::vector<String> get_all_ssid();
bool connect_to_wifi();
bool set_host_name(String hostname);
String get_host_name();
bool is_connected_to_internet();
bool try_and_connect_to_wifi_or_make_ap();

