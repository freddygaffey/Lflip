#include <acell.h>
#include <Arduino.h>

Acell get_acell() {
    Acell var = Acell(random(),random(),random());
    return var;
}