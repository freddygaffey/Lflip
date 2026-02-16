#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>

// Public WiFi management functions

/**
 * Attempts to connect to saved WiFi networks or starts an AP if none found.
 * Call this in loop() - it's non-blocking.
 */
void try_connect_to_wifi_or_ap();

/**
 * Add a new WiFi network to saved credentials.
 * @param ssid Network name
 * @param pwd Network password
 */
void add_wifi_net(String ssid, String pwd);

/**
 * Check if currently connected to a WiFi network.
 * @return true if connected, false otherwise
 */
inline bool is_connected() {
    return (WiFi.status() == WL_CONNECTED);
}

/**
 * Get the device hostname.
 * Generates one from chip ID if not set.
 * @return hostname string (e.g., "LPlate-a1b2c3")
 */
String get_host_name();

/**
 * Set a custom hostname for the device.
 * @param hostname New hostname to save
 * @return true if successful, false if file write failed
 */
bool set_host_name(String hostname);

#endif // WIFI_MANAGER_H