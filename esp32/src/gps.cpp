#include "gps.h"
#include <Arduino.h>

float get_speed_mps() { 
    // TODO: actualy implment when get hardwhere
    return random();
}

GpsCords get_poss() {
    // TODO: actualy implment when get hardwhere
    GpsCords var = GpsCords(random(),random());
    return var;
}
