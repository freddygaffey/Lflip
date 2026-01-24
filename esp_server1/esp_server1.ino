#include <WiFi.h>
#include <NetworkClient.h>
#include <WiFiAP.h>
#include <vector>


NetworkServer server(80);

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
  WiFi.STA.begin();
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
void setup() {
  Serial.begin(115200);
  start_ap();
  get_ssid_scan();

  // std::vector<String> networks = get_ssid();
  // for (int i = 0; i < networks.size(); ++i) {
  //   Serial.println(networks[i]);
  // }
}


void loop() {
  // put your main code here, to run repeatedly:
}
