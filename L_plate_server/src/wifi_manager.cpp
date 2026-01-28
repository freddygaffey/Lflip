#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>

// littls fs files
// passwords.json (this is a file that has the ssid and passwords of home wifis)
// odo.txt int odo


WiFiServer server(80);

bool start_ap(){
  WiFi.disconnect();
  WiFi.mode(WIFI_AP_STA);
  delay(100);
  const char *ssid = "SSID";
  const char *password = "password";
  Serial.println();
  Serial.println("Configuring access point...");

  int start_time = millis();
  while (start_time + 10000 > millis())
  {
    if (!WiFi.softAP(ssid, password)) {
      log_e("Soft AP creation failed.");
    }
    else {
      break;
    }
    delay(1000);
  }
  
  IPAddress myIP = WiFi.softAPIP();
  Serial.print("AP IP address: ");
  Serial.println(myIP);
  server.begin();

  Serial.println("Server started");
  return true;
}

std::vector<String> get_ssid_scan() {
  WiFi.mode(WIFI_STA);
  // WiFi.scanNetworks will return the number of networks found.
  int n = WiFi.scanNetworks();
  std::vector<String> networks;
  for (int i = 0; i < n; ++i) {
    networks.push_back( WiFi.SSID(i).c_str());
    // Serial.printf(WiFi.SSID(i).c_str());
    // Serial.printf("\n");
  }
  return networks;
  
}

void add_wifi_network(const char* ssid, const char* pwd) {
  JsonDocument doc; //make doc static size
  File file = LittleFS.open("/passwords.json", "r");
  if (file) {
    deserializeJson(doc, file);
    file.close();
  }
  if (!doc["networks"].is<JsonArray>()){
    doc["networks"].to<JsonArray>();
  }
  JsonArray networks = doc["networks"];

  JsonObject net = networks.add<JsonObject>();
  net["ssid"] = ssid;
  net["pwd"] = pwd;

  file = LittleFS.open("/passwords.json","w");
  serializeJson(doc,file);
  file.close();
}

std::vector<String> get_all_pwd() {
  JsonDocument doc;
  File file = LittleFS.open("/passwords.json", "r");
  deserializeJson(doc,file);
  
  JsonArray arr = doc["networks"];
  std::vector<String> pwd;

  for ( JsonObject net : arr) {
    pwd.push_back(net["pwd"].as<String>());
  }      

  file.close();
  return pwd;
}

std::vector<String> get_all_ssid() {
  JsonDocument doc;
  File file = LittleFS.open("/passwords.json", "r");
  deserializeJson(doc,file);
  
  JsonArray arr = doc["networks"];
  std::vector<String> ssids;

  for ( JsonObject net : arr) {
    ssids.push_back(net["ssid"].as<String>());
  }      

  file.close();
  return ssids;
}

bool connect_to_wifi() {
  WiFi.mode(WIFI_STA);
  std::vector<String> scan_ssid = get_ssid_scan();
  std::vector<String> saved_ssid = get_all_ssid();
  String final_ssid;
  String pwd;

  for (String i : scan_ssid) {
    for (String j : saved_ssid)
      if (i == j) {
        final_ssid = i;
        int make_sure_no_same_ssid = 0;
        for (int p = 0; p < saved_ssid.size(); p++) {
          if (saved_ssid[p] == final_ssid) {
            pwd = get_all_pwd()[p]; 
          }
        }
      WiFi.begin(final_ssid.c_str(), pwd.c_str());
      for (int attempt = 0; attempt < 30; attempt++){
        if (WiFi.status() == WL_CONNECTED) {return 1;}
        else{ delay(500);} }
      }
  }
  return 0;
}
  
