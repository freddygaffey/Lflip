"""
trip_speed - categorise each trip by its average speed.

Average speed = odometer distance / duration (km/h). The odometer unit (km) is
unambiguous, so this is a reliable signal for the *kind* of driving:

    average speed     speed band            typical of
    ---------------   -------------------   -----------------------------------
    < 35 km/h         low / stop-start      city streets, traffic, car parks
    35 - 70 km/h      medium                town and main roads
    > 70 km/h         high / open-road      highways and country roads

This says nothing about *where* the trip was - that's what `trip_remoteness`
does using real GPS coordinates. This tool is purely about speed/pace.

REQUIRES: trips
"""

from __future__ import annotations

NAME = "trip_speed"
DESCRIPTION = (
    "Categorises the learner's trips by average speed into low/stop-start, "
    "medium, and high/open-road bands. Useful for seeing whether they have "
    "practised slow stop-start driving as well as faster open-road driving."
)
REQUIRES = ("trips",)

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks about their driving speed/pace or "
            "whether they have done both slow stop-start and faster open-road "
            "driving. Takes no arguments."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}

LOW_MAX_KMH = 35.0
MEDIUM_MAX_KMH = 70.0


def _band(avg_speed_kmh):
    if avg_speed_kmh is None:
        return "unknown"
    if avg_speed_kmh < LOW_MAX_KMH:
        return "low / stop-start"
    if avg_speed_kmh < MEDIUM_MAX_KMH:
        return "medium"
    return "high / open-road"


def run(ctx) -> dict:
    buckets: dict[str, dict] = {}
    speeds = []
    per_trip = []
    for t in ctx.trips:
        band = _band(t.avg_speed_kmh)
        b = buckets.setdefault(band, {"trips": 0, "hours": 0.0, "distance_km": 0.0})
        b["trips"] += 1
        b["hours"] += t.duration_hours
        b["distance_km"] += t.distance_km or 0.0
        if t.avg_speed_kmh is not None:
            speeds.append(t.avg_speed_kmh)
        per_trip.append({
            "trip_id": t.id,
            "band": band,
            "avg_speed_kmh": round(t.avg_speed_kmh, 1) if t.avg_speed_kmh is not None else None,
        })

    for b in buckets.values():
        b["hours"] = round(b["hours"], 2)
        b["distance_km"] = round(b["distance_km"], 1)

    bands_seen = [b for b in buckets if b != "unknown"]
    return {
        "total_trips": len(ctx.trips),
        "by_band": buckets,
        "bands_seen": bands_seen,
        "overall_avg_speed_kmh": round(sum(speeds) / len(speeds), 1) if speeds else None,
        "variety_note": (
            "good range of speeds" if len(bands_seen) >= 3
            else "limited range - mostly one speed band"
        ),
        "per_trip": per_trip,
    }


def format_for_ai(result: dict) -> str:
    if not result["total_trips"]:
        return "No trips logged, so driving speed cannot be assessed."
    lines = [f"Trip speed breakdown ({result['total_trips']} trips):"]
    for band, b in result["by_band"].items():
        lines.append(f"- {band}: {b['trips']} trips, {b['hours']} h, {b['distance_km']} km")
    if result["overall_avg_speed_kmh"] is not None:
        lines.append(f"Overall average speed: {result['overall_avg_speed_kmh']} km/h.")
    lines.append(f"Speed bands practised: {', '.join(result['bands_seen']) or 'none'} ({result['variety_note']}).")
    return "\n".join(lines)
