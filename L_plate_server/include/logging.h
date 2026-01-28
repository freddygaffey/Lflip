#include <Arduino.h>

enum State {
    LOGGING,
    SYNCING,
    WAITING
};

extern State current_state;
extern long odo;

void start_loging(long start_time, String SD_name);
void stop_logging(long end_time);
bool sync_data();
void callback();