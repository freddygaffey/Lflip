// PINSCAN — bench servo-finder. Drives a ~50 Hz servo signal on EVERY exposed
// XIAO ESP32-C3 pad at once (D0..D10), sweeping the pulse 1000<->2000us. Plug the
// servo's signal wire into ANY pad and it sweeps — use it to find a pad whose
// solder/trace is good when a specific pin won't move the servo. Bit-banged
// because the C3 has too few LEDC channels to attach 11 pins.
//   Flash:  ~/.platformio/penv/bin/pio run -e pinscan -t upload
#include <Arduino.h>

const int PINS[] = { D0, D1, D2, D3, D4, D5, D6, D7, D8, D9, D10 };
const int NPINS  = sizeof(PINS) / sizeof(PINS[0]);

constexpr int      MIN_US   = 1000;
constexpr int      MAX_US   = 2000;
constexpr int      STEP_US  = 10;
constexpr uint32_t FRAME_US = 20000;   // 50 Hz frame

int pulse = 1500;
int dir   = STEP_US;

void setup() {
  Serial.begin(115200);
  delay(300);
  for (int i = 0; i < NPINS; i++) { pinMode(PINS[i], OUTPUT); digitalWrite(PINS[i], LOW); }
  Serial.println("PINSCAN: sweeping a servo signal on D0..D10 at once.");
  Serial.println("Plug the servo SIGNAL wire into any pad; GND + V to the cell/5V.");
}

void loop() {
  for (int i = 0; i < NPINS; i++) digitalWrite(PINS[i], HIGH);
  delayMicroseconds(pulse);
  for (int i = 0; i < NPINS; i++) digitalWrite(PINS[i], LOW);

  uint32_t low = FRAME_US - pulse;       // idle the rest of the frame (pins LOW)
  delay(low / 1000);
  delayMicroseconds(low % 1000);

  pulse += dir;
  if (pulse >= MAX_US) { pulse = MAX_US; dir = -STEP_US; }
  if (pulse <= MIN_US) { pulse = MIN_US; dir =  STEP_US; }

  static uint32_t last = 0;
  if (millis() - last > 500) { last = millis(); Serial.printf("pulse=%dus\n", pulse); }
}
