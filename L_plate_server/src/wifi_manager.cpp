#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>
#include <SD.h>
#include <ESPmDNS.h>
#include <ESP32Ping.h>


// littls fs files
// passwords.json (this is a file that has the ssid and passwords of home wifis)
// odo.txt int odo

///// Private functions ////
static String _getHostName();
static std::vector<String> _get_all_ssid();
static std::vector<String> _get_all_pwd();
static String _get_pwd_for_ssid(String ssid);

//// Private variables ///
static int last_scan_time = 0;
static bool check_ssids = false;

void add_wifi_net(String ssid, String pwd) {
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

std::vector<String> _get_all_ssid() {
  JsonDocument doc;
  File file = LittleFS.open("/passwords.json", "r");
  if (!file) {
    Serial.println("little fs passwords is blank making a new one");
    file = LittleFS.open("/passwords.json", "w");
    file.close();
    file = LittleFS.open("/passwords.json", "r");
  }
  deserializeJson(doc,file);
  
  JsonArray arr = doc["networks"];
  std::vector<String> ssids;

  for ( JsonObject net : arr) {
    ssids.push_back(net["ssid"].as<String>());
  }      

  file.close();
  return ssids;
}

std::vector<String> _get_all_pwd() {
  JsonDocument doc;
  File file = LittleFS.open("/passwords.json", "r");
  if (!file) {
    Serial.println("little fs passwords is blank making a new one");
    file = LittleFS.open("/passwords.json", "w");
    file.close();
    File file = LittleFS.open("/passwords.json", "r");
  }
  deserializeJson(doc,file);
  
  JsonArray arr = doc["networks"];
  std::vector<String> ssids;

  for ( JsonObject net : arr) {
    ssids.push_back(net["pwd"].as<String>());
  }      

  file.close();
  return ssids;
}

String _get_pwd_for_ssid(String ssid) {
    std::vector<String> ssids = _get_all_ssid();
    std::vector<String> pwds = _get_all_pwd();
    int j = 0;
    for(String i : ssids) {
        if (i == ssid) return pwds[j];
        j ++;
    }
    Serial.println("no password found for the ssid");
    return "";
}

bool set_host_name(String hostname){
  File file = SD.open("/hostname.txt",FILE_WRITE);
  if (!file) return false;
  file.println(hostname);
  file.close();
  Serial.println("Hostname saved: " + hostname);
  return true;
}

String get_host_name(){
  if (!SD.exists("/hostname.txt")) {
    // Generate unique hostname from ESP32 chip ID
    Serial.println("made a new hostname");
    uint64_t chipid = ESP.getEfuseMac();
    String hostname = "LPlate-" + String((uint32_t)chipid, HEX);
    if(!set_host_name(hostname)) Serial.println("setting the host name is wrong");  // Save it
    Serial.println(hostname);
    return hostname;
  }
  File file = SD.open("/hostname.txt",FILE_READ);
  String name = file.readStringUntil('\n');
  name.trim();
  file.close();
  return name;
}
void try_connect_to_wifi_or_ap() {
    static bool mdns_started = false;  // ✓ Track if mDNS started

    // Start mDNS once WiFi is active (either connected or AP running)
    if (!mdns_started && (WiFi.status() == WL_CONNECTED || WiFi.softAPIP() != IPAddress(0,0,0,0))) {
        String hostname = get_host_name();
        if (MDNS.begin(hostname.c_str())) {
            Serial.println("mDNS started: http://" + hostname + ".local");
            MDNS.addService("http", "tcp", 80);
            mdns_started = true;
        }
    }

    if (WiFi.status() == WL_CONNECTED) return;
    
    int n = WiFi.scanComplete();
    const int SCAN_INTERVAL = 10000;
    
    // Phase 1: Start scan every 50 seconds
    if (millis() >= SCAN_INTERVAL + last_scan_time) {
        Serial.println("doing a wifi scan");
        if (n != WIFI_SCAN_RUNNING) {
            WiFi.scanNetworks(true);
            check_ssids = true;
        }
        last_scan_time = millis();
        return;
    }
    
    // Phase 2: Process scan results after 5 seconds
    n = WiFi.scanComplete();
    if (millis() >= last_scan_time + 5000 && check_ssids && n >= 0) {  // ✓ Check n >= 0
        check_ssids = false;
        
        std::vector<String> all_saved_ssids = _get_all_ssid();
        bool found = false;
        
        for (int i = 0; i < n; i++){
            String str = WiFi.SSID(i);
            for (String j : all_saved_ssids){
                if (j == str) {
                    Serial.println("Found saved network: " + j);
                    WiFi.begin(j.c_str(), _get_pwd_for_ssid(j).c_str());
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
        
        WiFi.scanDelete();
        
        // Only start AP if no saved networks found
        if (!found) {
            // Check if AP already running
            if (WiFi.softAPIP() == IPAddress(0,0,0,0)) {
                String pwd = "password";
                String hostName = get_host_name();
                
                if (WiFi.softAP(hostName.c_str(), pwd.c_str())) {
                    Serial.println("\n=== AP Mode Active ===");
                    Serial.println("SSID: " + hostName);
                    Serial.println("Password: " + pwd);
                    Serial.println("IP: " + WiFi.softAPIP().toString());
                    Serial.println("======================\n");
                } else {
                    Serial.println("AP creation failed");
                }
            }
        }
    }
}

//////////////////////////////////////////////////////////
// bool connected_to_internet = false;


// String get_host_name();

// bool start_ap(){
//   WiFi.disconnect();
//   WiFi.mode(WIFI_AP_STA);
//   delay(100);
//   const char *ssid = "SSID";
//   const char *password = "password";
//   Serial.println();
//   Serial.println("Configuring access point...");

//   int start_time = millis();
//   while (start_time + 10000 > millis())
//   {
//     if (!WiFi.softAP(ssid, password)) {
//       log_e("Soft AP creation failed.");
//     }
//     else {
//       break;
//     }
//     delay(1000);
//   }
  
//   IPAddress myIP = WiFi.softAPIP();
//   Serial.print("AP IP address: ");
//   Serial.println(myIP);
//   // server.begin();

//   // Serial.println("Server started");
//   return true;
// }

// std::vector<String> get_ssid_scan() {
//   WiFi.mode(WIFI_STA);
//   // WiFi.scanNetworks will return the number of networks found.
//   int n = WiFi.scanNetworks();
//   std::vector<String> networks;
//   for (int i = 0; i < n; ++i) {
//     networks.push_back( WiFi.SSID(i).c_str());
//     // Serial.printf(WiFi.SSID(i).c_str());
//     // Serial.printf("\n");
//   }
//   return networks;
  
// }

// void add_wifi_network(String ssid, String pwd) {
//   JsonDocument doc; //make doc static size
//   File file = LittleFS.open("/passwords.json", "r");
//   if (file) {
//     deserializeJson(doc, file);
//     file.close();
//   }
//   if (!doc["networks"].is<JsonArray>()){
//     doc["networks"].to<JsonArray>();
//   }
//   JsonArray networks = doc["networks"];

//   JsonObject net = networks.add<JsonObject>();
//   net["ssid"] = ssid;
//   net["pwd"] = pwd;

//   file = LittleFS.open("/passwords.json","w");
//   serializeJson(doc,file);
//   file.close();
// }

// std::vector<String> get_all_pwd() {
//   JsonDocument doc;
//   File file = LittleFS.open("/passwords.json", "r");
//   deserializeJson(doc,file);
  
//   JsonArray arr = doc["networks"];
//   std::vector<String> pwd;

//   for ( JsonObject net : arr) {
//     pwd.push_back(net["pwd"].as<String>());
//   }      

//   file.close();
//   return pwd;
// }

// std::vector<String> get_all_ssid() {
//   JsonDocument doc;
//   File file = LittleFS.open("/passwords.json", "r");
//   if (!file) {
//     Serial.println("little fs passwords is blank making a new one");
//     file = LittleFS.open("/passwords.json", "w");
//     file.close();
//     File file = LittleFS.open("/passwords.json", "r");
//   }
//   deserializeJson(doc,file);
  
//   JsonArray arr = doc["networks"];
//   std::vector<String> ssids;

//   for ( JsonObject net : arr) {
//     ssids.push_back(net["ssid"].as<String>());
//   }      

//   file.close();
//   return ssids;
// }

// bool connect_to_wifi() {
//   WiFi.mode(WIFI_STA);
//   String hostname = get_host_name();
//   WiFi.setHostname(hostname.c_str());

//   std::vector<String> scan_ssid = get_ssid_scan();
//   std::vector<String> saved_ssid = get_all_ssid();
//   String final_ssid;
//   String pwd;

//   for (String i : scan_ssid) {
//     for (String j : saved_ssid)
//       if (i == j) {
//         final_ssid = i;
//         int make_sure_no_same_ssid = 0;
//         for (int p = 0; p < saved_ssid.size(); p++) {
//           if (saved_ssid[p] == final_ssid) {
//             pwd = get_all_pwd()[p]; 
//           }
//         }
//       WiFi.begin(final_ssid.c_str(), pwd.c_str());
//       for (int attempt = 0; attempt < 30; attempt++){
//         if (WiFi.status() == WL_CONNECTED) {
//           Serial.println("connected to "+ final_ssid);
//           Serial.println("your localIP is");
//           Serial.println(WiFi.localIP());

//           // server.begin();
//           // Serial.println("the server has started");
//           return 1;}
//         else{ delay(500);} }
//       }
//   }
//   return 0;
// }
  

// bool set_host_name(String hostname){
//   File file = SD.open("/hostname.txt",FILE_WRITE);
//   if (!file) return false;
//   file.println(hostname);
//   file.close();
//   Serial.println("Hostname saved: " + hostname);
//   return true;
// }
// String get_host_name(){
//   if (!SD.exists("/hostname.txt")) {
//     // Generate unique hostname from ESP32 chip ID
//     Serial.println("made a new hostname");
//     uint64_t chipid = ESP.getEfuseMac();
//     String hostname = "LPlate-" + String((uint32_t)chipid, HEX);
//     if(!set_host_name(hostname)) Serial.println("setting the host name is wrong");  // Save it
//     Serial.println(hostname);
//     return hostname;
//   }
//   File file = SD.open("/hostname.txt",FILE_READ);
//   String name = file.readStringUntil('\n');
//   name.trim();
//   file.close();
//   return name;
// }
// bool is_connected_to_internet(){
//   // if (Ping.ping("www.google.com") || Ping.ping("www.bing.com")){
//   //     Serial.println("just pinged google or bing you are connected to wifi");
//   //     return true;
//   //   }
//   Serial.print("make the is connected to intenat function actual work");
//   return false;
// }
// bool try_and_connect_to_wifi_or_make_ap() {
//   if (!connect_to_wifi()) {
//     Serial.println("cant connect to wifi starting a ap called SSID");
//     start_ap();
//   }
  
//   String hostname = get_host_name();
//   MDNS.begin(hostname.c_str());
//   Serial.println("Access at: http://" + hostname + ".local");
//   MDNS.addService("http", "tcp", 80);
//   return is_connected_to_internet();
// }
// void try_connect_to_wifi_or_ap() {
//     WiFi.mode(WIFI_AP_STA); 
//     int scan_rate = 50000;
//     int n = WiFi.scanComplete();
//     if (WiFi.status() == WL_CONNECTED) return;
    
//     if (millis() >= scan_rate + last_scan_time) {
//         Serial.println("doing a wifi scan");
//         if (n != -1) {
//             WiFi.scanNetworks(true);
//             check_ssids = true;
//         }
//         last_scan_time = millis();
//         return;
//     }
    
//     n = WiFi.scanComplete();
//     if (millis() >= last_scan_time + 5000 and check_ssids) {
//         check_ssids = false;
//         std::vector<String> all_saved_ssids = _get_all_ssid();
//         for (int i = 0; i < n;i++){
//             String str = WiFi.SSID(i);
//             for (String j:all_saved_ssids){
//                 if (j == str) {
//                     WiFi.begin(j.c_str(), _get_pwd_for_ssid(j).c_str());
//                     WiFi.scanDelete();
//                     if (WiFi.status() == WL_CONNECTED) return;
//                     else {ap_on = false;}
//                 }
//             }
//         }
//         // TODO : make secure
//         String pwd = "password"; // this is the ap password
//         String hostName = get_host_name();
//         if (WiFi.status() != WL_CONNECTED) {
//             if (!WiFi.softAP(hostName.c_str(), pwd)) {
//                 Serial.println("AP creation failed");
//             }
//             else {
//                 IPAddress myIP = WiFi.softAPIP();
//                 Serial.println("\n=== AP Mode Active ===");
//                 Serial.println("SSID: " + hostName);
//                 Serial.println("Password: " + String(pwd));
//                 Serial.println("IP: " + myIP.toString());
//                 Serial.println("======================\n");
//         }
//         }
//     }
// } 

