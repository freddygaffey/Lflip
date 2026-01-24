#include <Arduino.h>
#include <WiFi.h>
#include <vector>
#include <LittleFS.h>
#include <ArduinoJson.h>

// littls fs files
// passwords.json (this is a file that has the ssid and passwords of home wifis)

WiFiServer server(80);

bool start_ap();
std::vector<String> get_ssid_scan();
void add_wifi_network(const char* ssid, const char* pwd);
void print_file(const char * path);

bool start_ap(){
  const char *ssid = "SSID";
  const char *password = "password";
  Serial.println();
  Serial.println("Configuring access point...");

  if (!WiFi.softAP(ssid, password)) {
    log_e("Soft AP creation failed.");
    while (1);
    Serial.println("ap failed");
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


void setup() {
  Serial.begin(115200);
    if (!LittleFS.begin()) {
    Serial.println("LittleFS mount failed");
    return;
  }
  start_ap();
  get_ssid_scan();
  // add_wifi_network("home","u_will_never_guess_this");
  print_file("/passwords.json");
}


void loop() {
  // put your main code here, to run repeatedly:
}
