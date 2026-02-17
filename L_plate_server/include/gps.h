#pragma once
#include <cmath>

struct GpsCords
{
    double lat = 0.0;    // latitude in degrees
    double lon = 0.0;    // longitude in degrees
    float hdop = 99.9;   // horizontal dilution of precision; 99.9 = no fix
    bool valid = false;  // true only when GPS has a valid fix

    GpsCords() {}

    GpsCords(double la, double lo) {
        lat = la;
        lon = lo;
    }

    // this function was written by chatGPT it is a simple utill
    // that finds the great circle distance between 2 points

    float distanceto(const GpsCords& gps2) {
        const double EARTH_RADIUS_KM = 6371.0;

        // convert degrees to radians
        double lat1 = lat * M_PI / 180.0;
        double lon1 = lon * M_PI / 180.0;
        double lat2 = gps2.lat * M_PI / 180.0;
        double lon2 = gps2.lon * M_PI / 180.0;

        double dLat = lat2 - lat1;
        double dLon = lon2 - lon1;

        // haversine formula
        double a = std::sin(dLat / 2) * std::sin(dLat / 2) +
                   std::cos(lat1) * std::cos(lat2) *
                   std::sin(dLon / 2) * std::sin(dLon / 2);

        double c = 2 * std::atan2(std::sqrt(a), std::sqrt(1 - a));

        double distanceKm = EARTH_RADIUS_KM * c;

        return static_cast<float>(distanceKm); // km (rounded down)
    }
};

float get_speed_mps();
GpsCords get_poss();

