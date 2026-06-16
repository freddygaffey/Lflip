"""
weather_variance - break the learner's driving down by *weather* and measure how
much their practice (and pace) changes with the conditions.

driving_variance already reports the *breadth* of weather experienced as one of
several variety metrics. This tool zooms in on weather alone: for each condition
it reports the trips/hours/distance done in it and the average speed, then flags
whether the learner has any meaningful wet-weather experience (rain, storms,
fog, snow, ...) and how their pace differs between dry and wet conditions.

That makes it the right tool for "have I driven enough in the rain?" or "do I
slow down in bad weather?" - questions driving_variance only answers coarsely.

REQUIRES: trips
"""

from __future__ import annotations

import statistics

NAME = "weather_variance"
DESCRIPTION = (
    "Breaks the learner's driving down by weather condition - trips, hours, "
    "distance and average speed per condition - and flags how much wet-weather "
    "(rain, storm, fog, snow) experience they have and whether they slow down "
    "in it."
)
REQUIRES = ("trips",)

# weather descriptions (lower-cased) containing any of these words count as
# "wet"/adverse conditions for the dry-vs-wet comparison.
WET_KEYWORDS = ("rain", "wet", "storm", "shower", "fog", "mist", "snow", "hail", "ice")

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks about driving in specific weather "
            "(e.g. rain or fog), whether they have enough wet-weather experience, "
            "or whether their speed changes with the conditions. Takes no "
            "arguments."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}


def _is_wet(weather: str) -> bool:
    return any(k in weather for k in WET_KEYWORDS)


def run(ctx) -> dict:
    if not ctx.trips:
        return {"total_trips": 0, "by_weather": {}, "wet_trips": 0}

    buckets: dict[str, dict] = {}
    unrecorded = 0
    dry_speeds: list[float] = []
    wet_speeds: list[float] = []
    wet_trips = 0

    for t in ctx.trips:
        weather = (t.weather or "").strip().lower()
        if not weather:
            unrecorded += 1
            label = "unrecorded"
        else:
            label = weather

        b = buckets.setdefault(
            label, {"trips": 0, "hours": 0.0, "distance_km": 0.0, "_speeds": []}
        )
        b["trips"] += 1
        b["hours"] += t.duration_hours
        b["distance_km"] += t.distance_km or 0.0
        if t.avg_speed_kmh is not None:
            b["_speeds"].append(t.avg_speed_kmh)

        if weather and _is_wet(weather):
            wet_trips += 1
            if t.avg_speed_kmh is not None:
                wet_speeds.append(t.avg_speed_kmh)
        elif weather:
            if t.avg_speed_kmh is not None:
                dry_speeds.append(t.avg_speed_kmh)

    for b in buckets.values():
        b["hours"] = round(b["hours"], 2)
        b["distance_km"] = round(b["distance_km"], 1)
        speeds = b.pop("_speeds")
        b["avg_speed_kmh"] = round(statistics.mean(speeds), 1) if speeds else None

    dry_avg = round(statistics.mean(dry_speeds), 1) if dry_speeds else None
    wet_avg = round(statistics.mean(wet_speeds), 1) if wet_speeds else None
    slowdown = None
    if dry_avg is not None and wet_avg is not None:
        slowdown = round(dry_avg - wet_avg, 1)

    # most-driven condition first; "unrecorded" is kept but sinks to the bottom.
    ordered = dict(
        sorted(
            buckets.items(),
            key=lambda kv: (kv[0] == "unrecorded", -kv[1]["hours"]),
        )
    )

    return {
        "total_trips": len(ctx.trips),
        "distinct_conditions": len([k for k in buckets if k != "unrecorded"]),
        "by_weather": ordered,
        "unrecorded_trips": unrecorded,
        "wet_trips": wet_trips,
        "wet_ratio": round(wet_trips / len(ctx.trips), 2),
        "dry_avg_speed_kmh": dry_avg,
        "wet_avg_speed_kmh": wet_avg,
        "wet_slowdown_kmh": slowdown,
    }


def format_for_ai(result: dict) -> str:
    if not result.get("total_trips"):
        return "No trips logged, so weather variance cannot be assessed."

    lines = [
        f"Weather breakdown ({result['total_trips']} trips, "
        f"{result['distinct_conditions']} recorded conditions):"
    ]
    for cond, b in result["by_weather"].items():
        speed = f", avg {b['avg_speed_kmh']} km/h" if b["avg_speed_kmh"] is not None else ""
        lines.append(
            f"- {cond}: {b['trips']} trips, {b['hours']} h, {b['distance_km']} km{speed}"
        )

    if result["wet_trips"]:
        lines.append(
            f"Wet/adverse-weather experience: {result['wet_trips']} trips "
            f"({int(result['wet_ratio'] * 100)}% of trips)."
        )
    else:
        lines.append("No wet/adverse-weather trips recorded yet.")

    if result["wet_slowdown_kmh"] is not None:
        if result["wet_slowdown_kmh"] > 0:
            lines.append(
                f"Drives ~{result['wet_slowdown_kmh']} km/h slower in the wet "
                f"({result['wet_avg_speed_kmh']} vs {result['dry_avg_speed_kmh']} km/h dry)."
            )
        else:
            lines.append(
                f"No slow-down in the wet ({result['wet_avg_speed_kmh']} vs "
                f"{result['dry_avg_speed_kmh']} km/h dry)."
            )

    if result["unrecorded_trips"]:
        lines.append(f"{result['unrecorded_trips']} trips had no weather recorded.")
    return "\n".join(lines)
