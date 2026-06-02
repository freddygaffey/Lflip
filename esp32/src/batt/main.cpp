// BATTERY TEST — bench only.
//
// Purpose: prove the board actually powers up off the battery when there's no
// light/indicator to tell you. The LED blinks a steady heartbeat: if it blinks,
// the ESP32 is running, so the battery is delivering power. It also prints the
// measured battery voltage (needs the A0 divider — see lib/power/battery.h) and
// uses the SAME low-voltage cutoff as the edge firmware, so a forgotten board on
// the bench parks itself in deep sleep before the cell is over-discharged.
//
// Flash:   pio run -e batt -t upload --upload-port /dev/cu.usbmodemXXXX
// Run on battery (no USB): just watch the LED — blinking = battery is good.
#include <Arduino.h>
#include "battery.h"

constexpr int PIN_LED = D2;     // status LED (same pin the edge uses)

void setup() {
  Serial.begin(115200);
  delay(300);
  pinMode(PIN_LED, OUTPUT);
  Serial.println("\nBATTERY TEST — LED blinking = board is powered.");
}

void loop() {
  // Same low-voltage cutoff as the edge: park before the cell is damaged.
  if (batt::isLow()) {
    digitalWrite(PIN_LED, LOW);
    batt::parkForever();
  }

  // Heartbeat: 100ms on, 900ms off. Visible blink = the chip is running.
  digitalWrite(PIN_LED, HIGH);
  delay(100);
  digitalWrite(PIN_LED, LOW);
  delay(900);

  // Report battery voltage (only meaningful if a divider is wired to A0).
  Serial.printf("battery = %.2fV\n", batt::volts());
}
