#include "gps.h"
#include <Arduino.h>

// Mock GPS: simulates driving around Canberra
// Starts near Civic and drifts slowly
double mock_lat = -35.2809;  // Canberra CBD
double mock_lon = 149.1300;
float mock_speed = 0;

float get_speed_mps() {
    // TODO: actually implement when get hardware
    // Simulate speed: varies between 0-16 m/s (0-60 km/h)
    mock_speed += (random(-100, 100) / 100.0);
    if (mock_speed < 0) mock_speed = 0;
    if (mock_speed > 16) mock_speed = 16;
    return mock_speed;
}

GpsCords get_poss() {
    // TODO: actually implement when get hardware
    // Move position based on mock speed
    mock_lat += (random(-10, 10) / 100000.0);
    mock_lon += (random(-10, 10) / 100000.0);
    return GpsCords(mock_lat, mock_lon);
}
