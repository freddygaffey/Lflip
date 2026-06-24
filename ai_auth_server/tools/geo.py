"""
geo - geographic helpers for the tools, currently the real geographic
remoteness calculation used by trip_remoteness.

"Real" remoteness (unlike the speed heuristic in trip_speed) is based on actual
GPS coordinates. We approximate the ABS Remoteness Structure idea - how far a
location is from major population/service centres - by measuring the great-circle
distance from a point to the nearest major Australian city and mapping that
distance to a remoteness band.

This is an approximation: the official ABS ARIA+ index uses road distance to
several categories of service centre, which needs a licensed dataset. Distance
to the nearest major city by air is a reasonable, self-contained stand-in and
the output labels it as approximate.
"""

from __future__ import annotations

import math

# major Australian population/service centres (name, lat, lon).
# capitals plus the larger regional cities so the nearest-city distance is
# sensible for regional drivers, not just capital-city ones.
CITIES: list[tuple[str, float, float]] = [
    ("Sydney", -33.8688, 151.2093),
    ("Melbourne", -37.8136, 144.9631),
    ("Brisbane", -27.4698, 153.0251),
    ("Perth", -31.9523, 115.8613),
    ("Adelaide", -34.9285, 138.6007),
    ("Canberra", -35.2809, 149.1300),
    ("Hobart", -42.8821, 147.3272),
    ("Darwin", -12.4634, 130.8456),
    ("Gold Coast", -28.0167, 153.4000),
    ("Newcastle", -32.9283, 151.7817),
    ("Wollongong", -34.4278, 150.8931),
    ("Geelong", -38.1499, 144.3617),
    ("Townsville", -19.2590, 146.8169),
    ("Cairns", -16.9186, 145.7781),
    ("Toowoomba", -27.5598, 151.9507),
    ("Ballarat", -37.5622, 143.8503),
    ("Bendigo", -36.7570, 144.2794),
    ("Albury", -36.0737, 146.9135),
    ("Launceston", -41.4332, 147.1441),
    ("Bunbury", -33.3271, 115.6414),
    ("Alice Springs", -23.6980, 133.8807),
]

# (max distance in km from nearest major city, label). first match wins.
REMOTENESS_BANDS: list[tuple[float, str]] = [
    (25.0, "Major city"),
    (100.0, "Inner regional"),
    (250.0, "Outer regional"),
    (500.0, "Remote"),
    (float("inf"), "Very remote"),
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lon points, in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlam / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


def nearest_city(lat: float, lon: float) -> tuple[str, float]:
    """Return (city_name, distance_km) for the closest major city."""
    best_name, best_dist = "", float("inf")
    for name, clat, clon in CITIES:
        d = haversine_km(lat, lon, clat, clon)
        if d < best_dist:
            best_name, best_dist = name, d
    return best_name, best_dist


def band_for_distance(distance_km: float) -> str:
    for max_km, label in REMOTENESS_BANDS:
        if distance_km <= max_km:
            return label
    return "Very remote"


def classify_remoteness(lat: float, lon: float) -> dict:
    """Classify a single point's remoteness.

    Returns: {"category", "nearest_city", "distance_km"} (all approximate)."""
    name, dist = nearest_city(lat, lon)
    return {
        "category": band_for_distance(dist),
        "nearest_city": name,
        "distance_km": round(dist, 1),
    }
