#include <acell.h>
#include <Arduino.h>

Acell get_acell() {
    // TODO: actually implement when get hardware
    // Simulate accelerometer: mostly gravity on Z, small noise on X/Y
    float x = random(-50, 50) / 100.0;   // -0.5 to 0.5 g
    float y = random(-50, 50) / 100.0;   // -0.5 to 0.5 g
    float z = 9.8 + (random(-20, 20) / 100.0);  // ~9.8 g (gravity) with noise
    return Acell(x, y, z);
}
