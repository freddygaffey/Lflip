#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <Preferences.h>

#include "wifi_manager.h"
#include "logging.h"
#include "odo.h"

float odo_update_rate = 1000; // ms
int odo_last_updated = 0;

// littls fs files
// passwords.json (this is a file that has the ssid and passwords of home wifis)
// odo.txt int odo
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
      // start /start?start_time=1234567&SD_ID=max_smith 
      // stop  /stop?end_time=2887
      // sync  /sync 
      // odo_update /odo_update?odo=23412
      // add_wifi_network /add_wifi_network?ssid=top_seacreat_ssid&pwd=you_will_never_guess_this

      Serial.println("about to start the if statments");
      if (name == "start") { 
        String start_time = get_pram_from_url(str,"start_time");
        Serial.println(start_time);
        String SD_ID = get_pram_from_url(str,"SD_ID");
        Serial.println(SD_ID);
        start_loging(start_time.toDouble(),SD_ID);
      }
      else if (name == "stop")
      {
        String end_time = get_pram_from_url(str,"end_time");
        stop_logging(end_time.toDouble());
        Serial.print("stoped at");
        Serial.print(end_time);
        Serial.println(" ran the stop_logging function");
      }
      else if (name == "sync")
      {
        /* code */
      }
      else if (name == "odo_update")
      {
        String s_odo = get_pram_from_url(str,"odo");
        odo = strtoul(s_odo.c_str() ,NULL,10);
        odo *= 1000;// to m from km
        set_odo(odo);
        Serial.print("the new odo is ");
        Serial.println(get_odo());


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
