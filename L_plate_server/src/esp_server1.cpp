#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>

#include "wifi_manager.h"

// littls fs files
// passwords.json (this is a file that has the ssid and passwords of home wifis)
// odo.txt int odo

unsigned long  time_of_last_gps_log = millis();
unsigned long  time_of_last_acell_log = millis();

int gps_log_rate = 1000; // ms
int acell_log_rate = 100; // ms
// the states
int syncing_state = 0;
int logging_state = 0;
int waiting_state = 0;

int need_sd = 0;

unsigned long time_logging_stoped = 0;


String get_pram_from_url(String url, String key);

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

String get_pram_from_url(String url, String key) {
  int start = url.indexOf(key + "=");
  if (start == -1) return "";
  
  start += key.length() + 1;
  int end = url.indexOf("&", start);
  
  if (end == -1) return url.substring(start);
  return url.substring(start, end);
}

void start_loging(long start_time, String SD_name) {
  Serial.println("logging function called");
  // write_start time 
  // write sd 
  logging_state = 1;
}

void do_loging() {
  if (logging_state && time_logging_stoped == 0)
  {
    if (millis() - gps_log_rate < time_of_last_gps_log) {
      time_of_last_gps_log = millis();
      // write_gps_db(get_gps_poss()) 
      Serial.println("loged gps");
    }
    if (millis() - acell_log_rate < time_of_last_acell_log) {
      time_of_last_acell_log = millis();
      Serial.println("loged acell");
      // write_acell_db(get_current_acell()) 
    }
  }
}

void stop_logging(long end_time) {
  logging_state = 0; 
  // db_write_end_time(time_loging_stoped)
  Serial.println("logging stoped just wrote end time");
}

void setup() {
  Serial.begin(115200);
  
    if (!LittleFS.begin()) {
    Serial.println("LittleFS mount failed");
    return;
  }

  // get_ssid_scan();
  // add_wifi_network("home","u_will_never_guess_this");
  // for (String str : get_ssid_scan()){
  //   Serial.println(str);
  // }
  // if (!connect_to_wifi()) {
  //   start_ap();
  // }
  start_ap();
  delay(1000);
}
void loop() {
  do_loging();
  
  // put your main code here, to run repeatedly:
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
      // start /start?start_time=1234567&SD_ID=max_smith 
      // stop  /stop?end_time=2887
      // sync  /sync 
      // odo_update /odo_update?odo=23412
      // add_wifi_network /add_wifi_network?ssid=top_seacreat_ssid&pwd=you_will_never_guess_this

      Serial.println("about to start the if statments");
      if (name == "start") { 
        logging_state = 1;
        String start_time = get_pram_from_url(str,"start_time");
        Serial.println(start_time);
        String SD_ID = get_pram_from_url(str,"SD_ID");
        Serial.println(SD_ID);
        start_loging(start_time.toDouble(),SD_ID);
      }
      else if (name == "stop")
      {
        String end_time = get_pram_from_url(str,"end_time");
        Serial.println(end_time);
        stop_logging(end_time.toDouble());
      }
      else if (name == "sync")
      {
        /* code */
      }
      else if (name == "odo_update")
      {
        /* code */
      }
      else if (name == "add_wifi_network")
      {
        /* code */
      }
      else {
        Serial.println("missed the if statments");
      }
      
    }
      

  client.println("HTTP/1.1 200 OK");
  client.println();
  client.println("OK");
  client.stop();
  }

}
