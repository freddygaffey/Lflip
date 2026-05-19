// GPIO test sketch for ESP32-C3 SuperMini.
// Hosts a Wi-Fi AP + tiny web page with one toggle.
// Toggle drives every safe GPIO HIGH (3.3V) or LOW (0V) simultaneously,
// so any pin can be probed against GND or 3V3.
//
// Strapping pins (GPIO2, GPIO8, GPIO9) are excluded — driving them at boot
// can brick the boot sequence. USB pins (18/19) and flash pins are also out.

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>

static const char* AP_SSID = "ESP32-GPIO-Test";
static const char* AP_PASS = "testtest";  // >=8 chars required by WPA2

// Safe, broken-out GPIOs on the ESP32-C3 SuperMini.
// Excluded: 2, 8, 9 (strapping), 11-17 (flash), 18/19 (USB).
static const int kPins[] = {0, 1, 3, 4, 5, 6, 7, 10, 20, 21};
static const size_t kPinCount = sizeof(kPins) / sizeof(kPins[0]);

static bool gState = false;
static WebServer server(80);

static void applyState() {
  for (size_t i = 0; i < kPinCount; ++i) {
    digitalWrite(kPins[i], gState ? HIGH : LOW);
  }
}

static String buildPage() {
  String pins;
  for (size_t i = 0; i < kPinCount; ++i) {
    if (i) pins += ", ";
    pins += String(kPins[i]);
  }
  String html;
  html.reserve(1200);
  html += F("<!doctype html><html><head><meta charset='utf-8'>"
            "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            "<title>ESP32-C3 GPIO Test</title>"
            "<style>"
            "body{font-family:system-ui;background:#111;color:#eee;"
            "display:flex;flex-direction:column;align-items:center;"
            "justify-content:center;min-height:100vh;margin:0;padding:1rem}"
            "h1{margin:0 0 1rem}"
            ".state{font-size:3rem;font-weight:700;margin:1rem 0}"
            ".on{color:#4ade80}.off{color:#f87171}"
            "button{font-size:1.5rem;padding:1rem 2rem;border:0;"
            "border-radius:.75rem;background:#2563eb;color:#fff;cursor:pointer}"
            "button:active{background:#1d4ed8}"
            ".pins{margin-top:2rem;opacity:.7;font-size:.9rem;text-align:center}"
            "</style></head><body>"
            "<h1>ESP32-C3 GPIO Test</h1>"
            "<div class='state ");
  html += gState ? F("on'>HIGH (3.3V)") : F("off'>LOW (0V)");
  html += F("</div>"
            "<form method='POST' action='/toggle'>"
            "<button type='submit'>Toggle</button></form>"
            "<div class='pins'>Driving pins: ");
  html += pins;
  html += F("</div></body></html>");
  return html;
}

static void handleRoot()   { server.send(200, "text/html", buildPage()); }
static void handleToggle() {
  gState = !gState;
  applyState();
  server.sendHeader("Location", "/");
  server.send(303);
}
static void handleOn()  { gState = true;  applyState(); server.send(200, "text/plain", "HIGH"); }
static void handleOff() { gState = false; applyState(); server.send(200, "text/plain", "LOW"); }

void setup() {
  Serial.begin(115200);
  delay(200);

  for (size_t i = 0; i < kPinCount; ++i) {
    pinMode(kPins[i], OUTPUT);
    digitalWrite(kPins[i], LOW);
  }

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  IPAddress ip = WiFi.softAPIP();
  Serial.printf("AP up: SSID=%s PASS=%s IP=%s\n",
                AP_SSID, AP_PASS, ip.toString().c_str());

  server.on("/", HTTP_GET, handleRoot);
  server.on("/toggle", HTTP_POST, handleToggle);
  server.on("/on",  HTTP_GET, handleOn);
  server.on("/off", HTTP_GET, handleOff);
  server.begin();
}

void loop() {
  server.handleClient();
}
