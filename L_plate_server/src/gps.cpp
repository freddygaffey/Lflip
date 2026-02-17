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
    // Move position proportional to mock_speed (more realistic than pure random)
    double meters_per_degree = 111000.0;
    double step = mock_speed / meters_per_degree / 10.0; // ~10ms loop step
    mock_lat += step;
    mock_lon += step;
    GpsCords c(mock_lat, mock_lon);
    c.hdop = 1.2;   // mock a good fix
    c.valid = true;
    return c;
}
