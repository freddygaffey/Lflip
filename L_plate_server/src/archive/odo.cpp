// #include <Preferences.h>
// #include <Arduino.h>

// // #include "logging.h"

// Preferences prefs;
// unsigned long odo; // meters
// unsigned long time_last_saved_write = 0;
// unsigned long time_last_saved_speed = 0;
// unsigned long write_rate = 10000; // ms

// void init_odo() {
//   prefs.begin("Lplate_app", false);
//   odo = prefs.getULong("odo", 0);
// }

// unsigned long get_odo() { 
//     return odo;
// }

// void save_odo() {
//     prefs.putULong("odo", odo);
//     time_last_saved_write = millis();
// }

// void set_odo(unsigned long odo_new) { 
//     odo = odo_new;
//     if (time_last_saved_write + write_rate <= millis()) {
//         prefs.putULong("odo", odo);
//         time_last_saved_write = millis();
//     }
// }

// unsigned long update_ODO_with_speed(float speed_mps) {
//     // s = d / t
//     // d = s * t
//     // if (time_last_saved_speed == 0)
//     // {
//     //     time_last_saved_speed = speed_mps;
//     // }
//     float t = millis() - time_last_saved_speed;
//     t /= 1000; // to convert to sec
//     float d = t * (time_last_saved_speed * speed_mps)*0.5;
//     unsigned long _odo = d + get_odo();
//     set_odo(_odo);
//     time_last_saved_speed = speed_mps;
//     return _odo;
// }