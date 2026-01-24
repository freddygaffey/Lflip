#include <WiFi.h>
#include <NetworkClient.h>
#include <WiFiAP.h>


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

void setup() {
  Serial.begin(115200);
  start_ap();
}



void loop() {
  // put your main code here, to run repeatedly:
}
