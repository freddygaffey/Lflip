"""
trip_remoteness - classify each trip by its *real* geographic remoteness, using
the GPS coordinates rather than the speed heuristic.

For every trip with GPS data we take the route centroid (mean of its points) and
ask `geo.classify_remoteness` how far that is from the nearest major Australian
city, mapping the distance to a remoteness band (Major city -> Very remote). See
tools/geo.py for the method and its limitations - it approximates the ABS
Remoteness Structure and is labelled approximate.

Trips without GPS can't be placed, so they're counted separately as "unknown".

This is the geography counterpart to `trip_speed` (which only looks at pace).

REQUIRES: trips
"""

from __future__ import annotations

from . import geo

NAME = "trip_remoteness"
DESCRIPTION = (
    "Classifies the learner's trips by real geographic remoteness (major city, "
    "regional, remote, ...) from their GPS coordinates. Useful for seeing "
    "whether they have driven outside the city / in regional or remote areas."
)
REQUIRES = ("trips",)

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks where (geographically) they have "
            "driven, or whether they have experience outside the city / in "
            "regional or remote areas. Takes no arguments."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}


def _trip_centroid(trip):
    """Mean lat/lon of a trip's GPS points, or None if it has no GPS."""
    pts = [p for p in trip.gps if p is not None]
    if not pts:
        return None
    return (sum(p.lat for p in pts) / len(pts), sum(p.lon for p in pts) / len(pts))


def run(ctx) -> dict:
    buckets: dict[str, dict] = {}
    per_trip = []

    for t in ctx.trips:
        centroid = _trip_centroid(t)
        if centroid is None:
            category = "unknown (no GPS)"
            detail = None
        else:
            detail = geo.classify_remoteness(centroid[0], centroid[1])
            category = detail["category"]

        b = buckets.setdefault(category, {"trips": 0, "hours": 0.0, "distance_km": 0.0})
        b["trips"] += 1
        b["hours"] += t.duration_hours
        b["distance_km"] += t.distance_km or 0.0

        per_trip.append({
            "trip_id": t.id,
            "category": category,
            "nearest_city": detail["nearest_city"] if detail else None,
            "distance_from_city_km": detail["distance_km"] if detail else None,
        })

    for b in buckets.values():
        b["hours"] = round(b["hours"], 2)
        b["distance_km"] = round(b["distance_km"], 1)

    # order the categories by how remote they are (using the band order in geo)
    order = [label for _, label in geo.REMOTENESS_BANDS]
    categories_reached = [c for c in order if c in buckets]
    most_remote = categories_reached[-1] if categories_reached else None

    return {
        "total_trips": len(ctx.trips),
        "by_category": buckets,
        "categories_reached": categories_reached,
        "most_remote_reached": most_remote,
        "per_trip": per_trip,
        "method": "GPS route centroid vs nearest major city; approximate (see geo)",
    }


def format_for_ai(result: dict) -> str:
    if not result["total_trips"]:
        return "No trips logged, so geographic remoteness cannot be assessed."
    lines = [f"Trip remoteness breakdown ({result['total_trips']} trips, approximate from GPS):"]
    for cat, b in result["by_category"].items():
        lines.append(f"- {cat}: {b['trips']} trips, {b['hours']} h, {b['distance_km']} km")
    if result["most_remote_reached"]:
        lines.append(f"Most remote area driven in: {result['most_remote_reached']}.")
    return "\n".join(lines)
