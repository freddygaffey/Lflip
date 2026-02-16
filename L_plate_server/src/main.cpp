#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <time.h>
#include <ESPAsyncWebServer.h>
#include <ESPmDNS.h> 

#include "wifi_manager.h"
#include "logging.h"
#include "odo.h"
#include "sd_card.h"
#include "super_vising_driver.h"

// littls fs files
// passwords.json (this is a file that has the ssid and passwords of home wifis)
// odo.txt int odo
// SD.jason

void print_file(const char * path);
AsyncWebServer server(80);

void setup() {
  Serial.begin(115200);
  Serial.println("serial works");
  delay(3000);

    if (!LittleFS.begin(true)) {
    Serial.println("LittleFS mount failed");
    return;
  }

  init_odo();
  init_sd_card();

  WiFi.mode(WIFI_AP_STA);
  delay(100);

  server.on("/add_wifi",HTTP_GET,[](AsyncWebServerRequest *request){
    Serial.println("GET /add_wifi");
    request->send(LittleFS,"/add_wifi.html","text/html");
  });
  server.on("/",HTTP_GET,[](AsyncWebServerRequest *request){
    Serial.println("GET /");
    request->send(LittleFS,"/index.html","text/html");
  });
  server.on("/api/wifi/add",HTTP_GET,[](AsyncWebServerRequest *request) {
    Serial.println("GET /");
    if (request->hasParam("ssid") && request->hasParam("pwd")) {
      String ssid = request->getParam("ssid")->value();
      String pwd = request->getParam("pwd")->value();
      add_wifi_net(ssid,pwd);
      request->send(200, "application/json", "{\"success\":true}");
    }
    else {
      request->send(400, "application/json", "{\"success\":false}");
    }
  });
  server.on("/api/svd/get",HTTP_POST,[](AsyncWebServerRequest *request) {
    Serial.println("GET /api/svd/get");
    String json;
    serializeJson(get_all_svd(),json);
    Serial.println(json);
    request->send(200, "application/json", json);
  });
  server.on("/api/svd/add",HTTP_POST,[](AsyncWebServerRequest *request) {
    Serial.println("GET /api/svd/add");
    if (request->hasParam("full_name") && request->hasParam("licence_no") && request->hasParam("nick_name")) {
      String full_name = request->getParam("full_name")->value();
      String licence_no = request->getParam("licence_no")->value();
      String nick_name = request->getParam("nick_name")->value();
      add_SVD(full_name, licence_no.toInt(), nick_name);
      request->send(200, "application/json", "{\"success\":true}");
    }
    else {
      request->send(400, "application/json", "{\"success\":false}");
    }
  });
  server.on("/api/svd/set",HTTP_POST,[](AsyncWebServerRequest *request) {
    Serial.println("GET /api/svd/set");
    if (request->hasParam("hash_id")) {
      String hash_id = request->getParam("hash_id")->value();
      set_SVD(hash_id);
      request->send(200, "application/json", "{\"success\":true}");
    }
    else {
      request->send(400, "application/json", "{\"success\":false}");
    }
  });
  server.on("/svd",HTTP_GET,[](AsyncWebServerRequest *request) {
    Serial.println("GET /svd");
    request->send(LittleFS, "/svd_manger.html", "text/html");
  });
  server.on("/api/stop",HTTP_POST,[](AsyncWebServerRequest *request){
    Serial.println("POST /api/stop");
    String weather;
    if (request->hasParam("weather")) {
      weather = request->getParam("weather")->value();
    }
    stop_logging(weather);
    request->send(200, "application/json", "{\"success\":true}");
  });
  server.on("/api/start",HTTP_POST,[](AsyncWebServerRequest *request){
    Serial.println("POST /api/start");
    if (request->hasParam("hash_id")) {
      String sdv_id = request->getParam("hash_id")->value();
      start_logging(sdv_id);
      request->send(200, "application/json", "{\"success\":true}");
    }
    else request->send(400, "application/json", "{\"success\":false}");
  });
  server.on("/api/state",HTTP_GET,[](AsyncWebServerRequest *request){
    String state = (current_state == LOGGING) ? "logging" : "waiting";
    String json = "{\"state\":\"" + state + "\"" +
                  ",\"start_time\":" + String((unsigned long)drive_start_time) +
                  ",\"start_odo\":" + String(drive_start_odo) +
                  ",\"current_odo\":" + String(get_odo()) + "}";
    request->send(200, "application/json", json);
  });
  server.on("/stop",HTTP_GET,[](AsyncWebServerRequest *request){
    request->send(LittleFS,"/stop.html","text/html");
  });
  server.on("/api/time/set",HTTP_POST, [](AsyncWebServerRequest *request){
    Serial.println("POST /api/time/set");
    if (request->hasParam("time")) {
        time_t t = (time_t)request->getParam("time")->value().toDouble();
        timeval tv = {t, 0};
        settimeofday(&tv, nullptr);
        request->send(200, "application/json", "{\"success\":true}");
        Serial.println("Time set to " + String(t));
    }
  });
  server.on("/api/odo/set",HTTP_POST, [](AsyncWebServerRequest *request){
    if (request->hasParam("odo")) {
      unsigned long input_m = request->getParam("odo")->value().toInt();
      unsigned long current = get_odo();
      unsigned long new_odo = (current / 1000000) * 1000000 + input_m;
      if (new_odo > current + 500000 && new_odo >= 1000000) {
        new_odo -= 1000000;
      } else if (new_odo + 500000 < current) {
        new_odo += 1000000;
      }
      set_odo(new_odo);
      save_odo();
      request->send(200, "application/json", "{\"success\":true}");
    } else {
      request->send(400, "application/json", "{\"success\":false}");
    }
  });
  server.on("/api/stop/cancel",HTTP_POST, [](AsyncWebServerRequest *request){
    if (current_state == LOGGING) {
      cancel_trip();
      request->send(200, "application/json", "{\"success\":true}");
    } else {
      request->send(400, "application/json", "{\"success\":false}");
    }
  });
  server.begin();
}

void loop() {
  callback();
  try_connect_to_wifi_or_ap();
  delay(10);
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
