#include <Preferences.h>
#include <Arduino.h>
#include "gps.h"

// #include "logging.h"

Preferences prefs;
unsigned long odo; // meters
unsigned long time_last_saved_write = 0;
unsigned long time_last_updated_speed = millis();
unsigned long write_rate = 100000; // ms TODO: make this bigger

// --- ODO drift-filtering constants ---
static const float SPEED_THRESHOLD_MPS = 0.55f;  // ~2 km/h: below this = stationary
static const float HDOP_THRESHOLD      = 2.0f;   // above this = poor GPS fix, skip
static const float MIN_DISTANCE_M      = 0.5f;   // discard sub-0.5 m jitter

static GpsCords last_position;
static bool     has_last_position = false;

void init_odo() {
  prefs.begin("Lplate_app", false);
  odo = prefs.getULong("odo", 0);
}

unsigned long get_odo() {
    return odo;
}

void save_odo() {
    prefs.putULong("odo", odo);
    time_last_saved_write = millis();
    // reset last_position so manual calibration takes effect immediately
    has_last_position = false;
}

void set_odo(unsigned long odo_new) {
    odo = odo_new;
    if (time_last_saved_write + write_rate <= millis()) {
        prefs.putULong("odo", odo);
        time_last_saved_write = millis();
    }
}

unsigned long update_ODO_with_position(GpsCords current_pos, float speed_mps) {
    // FILTER 1: speed threshold — discard GPS noise when stationary
    if (speed_mps < SPEED_THRESHOLD_MPS) {
        // Keep last_position current so there's no jump when we start moving
        last_position     = current_pos;
        has_last_position = true;
        return odo;
    }

    // FILTER 2: HDOP — discard poor-quality satellite fixes
    if (current_pos.hdop > HDOP_THRESHOLD || !current_pos.valid) {
        return odo;
    }

    // FILTER 3: need a reference point before computing distance
    if (!has_last_position) {
        last_position     = current_pos;
        has_last_position = true;
        return odo;
    }

    // Haversine distance — distanceto() returns km, convert to metres
    float dist_m = last_position.distanceto(current_pos) * 1000.0f;

    // FILTER 4: minimum distance — discard sub-metre position jitter
    if (dist_m < MIN_DISTANCE_M) {
        return odo;
    }

    odo += (unsigned long)dist_m;
    last_position = current_pos;

    // Throttled NVS write
    if (millis() - time_last_saved_write >= write_rate) {
        prefs.putULong("odo", odo);
        time_last_saved_write = millis();
    }

    return odo;
}
