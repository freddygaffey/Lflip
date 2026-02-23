#ifndef LOGGING_H
#define LOGGING_H

#include <Arduino.h>

enum State {
  LOGGING,
  SYNCING,
  WAITING
};

extern State current_state;

void start_loging(double start_time, String SD_name);
void stop_logging(String weather);
void logging_callback();

#endif
