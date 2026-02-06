#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <time.h>

#include "wifi_manager.h"
#include "logging.h"
#include "odo.h"
#include "sd_card.h"

// littls fs files
// passwords.json (this is a file that has the ssid and passwords of home wifis)
// odo.txt int odo
// SD.jason

void print_file(const char * path);
String get_pram_from_url(String url, String key);
bool is_pram_bad(String pram, WiFiClient& client);

void setup() {
  Serial.begin(115200);
  Serial.println("serial works");
  delay(3000);

    if (!LittleFS.begin()) {
    Serial.println("LittleFS mount failed");
    return;
  }

  init_odo();
  init_sd_card();

  try_and_connect_to_wifi_or_make_ap();
}


void loop() {
  callback();

}  

String get_pram_from_url(String url, String key) {
  int start = url.indexOf(key + "=");
  if (start == -1) return "";
  
  start += key.length() + 1;
  int end = url.indexOf("&", start);
  String pram;
  if (end == -1) pram = url.substring(start);
  else pram = url.substring(start, end);
  return pram;
}

bool is_pram_bad(String pram, WiFiClient& client){
  if (pram.isEmpty()){
    Serial.println("some pramater is wrong in the url that was sent");
    client.println("HTTP/1.1 400 Bad Request");
    client.println("Content-Type: text/plain");
    client.println();
    client.println("Malformed request: missing parameters");
    client.println("some pramater is wrong in the url that was sent");
    client.stop();
    return true;
  }
  return false;
}

void print_file(const char * path){
    Serial.printf("Reading file: %s\r\n", path);

    File file = LittleFS.open(path);
    if(!file || file.isDirectory()){
        Serial.println("- failed to open file");
        return;
    }

    while(file.available()){
        Serial.write(file.read());
    }
    file.close();
}
