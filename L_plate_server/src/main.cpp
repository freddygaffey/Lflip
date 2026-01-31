#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <time.h>
#include <ESPmDNS.h>

#include "wifi_manager.h"
#include "logging.h"
#include "odo.h"
#include "sd_card.h"

float odo_update_rate = 1000; // ms
int odo_last_updated = 0;

// littls fs files
// passwords.json (this is a file that has the ssid and passwords of home wifis)
// odo.txt int odo

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

  if (!connect_to_wifi()) {
    Serial.println("cant connect to wifi starting a ap called SSID");
    start_ap();
  }

  String hostname = get_host_name();
  MDNS.begin(hostname.c_str());
  Serial.println("Access at: http://" + hostname + ".local");
  MDNS.addService("http", "tcp", 80);
}

void loop() {
  callback();
  
  WiFiClient client = server.available();
  if (client) {
    while (client.connected() && !client.available()) { delay(1); }

    if (client.connected() && client.available()) {
      String str = client.readStringUntil('\n');
      int start = str.indexOf(' ') + 2;
      int end = str.indexOf(' ', start);
      str = str.substring(start,end);

      String name = str.substring(0,str.indexOf('?'));
      // possabile requests 
      // start /start?start_time=12345timeSinceEpoc&SD_ID=max_smith 
      // stop  /stop?end_time=2887&weather=sunny
      // sync  /sync 
      // odo_update /odo_update?odo=23412
      // add_wifi_network /add_wifi_network?ssid=top_seacreat_ssid&pwd=you_will_never_guess_this

      if (name == "start") {
        String start_time = get_pram_from_url(str,"start_time");
        if (is_pram_bad(start_time,client)) return;
        // set the for the esp32 
        timeval tv = {start_time.toDouble(), 0};  // seconds, microseconds
        settimeofday(&tv, nullptr);

        Serial.println("start time");
        Serial.println(start_time);
        
        String SD_ID = get_pram_from_url(str,"SD_ID");
        if (is_pram_bad(SD_ID,client)) return;
        Serial.println("start time");
        Serial.println(SD_ID);

        start_loging(start_time.toDouble(),SD_ID);
        client.println("HTTP/1.1 200 OK");
        client.println("Content-Type: text/plain");
        client.println();
        client.println("Logging started");
        client.stop();
      }
      else if (name == "stop")
      {
        String weather = get_pram_from_url(str,"weather");
        if (is_pram_bad(weather,client)) return;
        stop_logging(weather);
        Serial.println("ran the stop_logging function");
        client.println("HTTP/1.1 200 OK");
        client.println("Content-Type: text/plain");
        client.println();
        client.println("Logging stoped");
        client.stop();
      }
      else if (name == "sync")
      {
        Serial.println("hit sync shold make some actual code to do syncing");
      }
      else if (name == "odo_update")
      {
        String s_odo = get_pram_from_url(str,"odo");
        if (is_pram_bad(s_odo,client)) return;
        odo = strtoul(s_odo.c_str() ,NULL,10);
        odo *= 1000;// to m from km
        set_odo(odo);
        Serial.print("the new odo is ");
        Serial.println(get_odo());
      }
      else if (name == "add_wifi")
      {
      // add_wifi_network /add_wifi?ssid=top_seacreat_ssid&pwd=you_will_never_guess_this
        String ssid = get_pram_from_url(str,"ssid");
        if (is_pram_bad(ssid,client)) return;
        String pwd = get_pram_from_url(str,"pwd");
        if (is_pram_bad(pwd,client)) return;
        
        add_wifi_network(ssid, pwd);
        Serial.println("printing pwd");
        for (String i: get_all_pwd()) {
          Serial.println(i);
        }
        Serial.println("printing ssid");
        for (String i: get_all_ssid()) {
          Serial.println(i);
        }
      }
      else {
        Serial.println("missed the if statments");
        // client.println("HTTP/1.1 302 Found");
        // client.println("Location: https://disharmoniously-unatoned-gabrielle.ngrok-free.dev");

        client.println("HTTP/1.1 200 OK");
        client.println("OK");
        client.println();
        client.stop(); 
        // Serial.println("ran the redirect");
      }
    }
  }
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
