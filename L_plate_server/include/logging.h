#include <Arduino.h>

enum State {
    LOGGING,
    WAITING
};

extern State current_state;
extern time_t drive_start_time;
extern unsigned long drive_start_odo;
extern long odo;

void start_logging(String SD_ID);
void stop_logging(String weather);
bool sync_data();
void cancel_trip();
void callback();