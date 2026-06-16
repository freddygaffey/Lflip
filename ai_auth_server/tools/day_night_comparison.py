"""
day_night_comparison - compare daytime vs night-time driving.

Most jurisdictions require a minimum number of *night* hours inside the total,
so the day/night split is one of the most important things a learner tracks.
This tool totals each side and, if the licence requirements are known, reports
progress toward the night requirement.

REQUIRES: trips   (licence is used if available, for the night requirement)
"""

from __future__ import annotations

NAME = "day_night_comparison"
DESCRIPTION = (
    "Compares the learner's day vs night driving (hours, trip counts, average "
    "trip length, distance) and, if licence requirements are known, how close "
    "they are to the required night hours."
)
REQUIRES = ("trips",)

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks about their day vs night driving "
            "or how close they are to their required night hours. Takes no arguments."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}


def _side(trips) -> dict:
    hours = sum(t.duration_hours for t in trips)
    distance = sum((t.distance_km or 0.0) for t in trips)
    count = len(trips)
    return {
        "trips": count,
        "hours": round(hours, 2),
        "distance_km": round(distance, 1),
        "avg_trip_h": round(hours / count, 2) if count else 0.0,
    }


def run(ctx) -> dict:
    day_trips = [t for t in ctx.trips if not t.is_night]
    night_trips = [t for t in ctx.trips if t.is_night]
    day = _side(day_trips)
    night = _side(night_trips)

    out = {
        "day": day,
        "night": night,
        "total_hours": round(day["hours"] + night["hours"], 2),
        "night_share_pct": (
            round(night["hours"] / (day["hours"] + night["hours"]) * 100)
            if (day["hours"] + night["hours"]) else 0
        ),
    }

    # progress toward the night requirement, if we know it
    lic = ctx.licence
    if lic and lic.night_hours_required:
        remaining = max(0.0, lic.night_hours_required - night["hours"])
        out["night_requirement"] = {
            "required_h": lic.night_hours_required,
            "done_h": night["hours"],
            "remaining_h": round(remaining, 2),
            "met": remaining <= 0,
        }
    return out


def format_for_ai(result: dict) -> str:
    d, n = result["day"], result["night"]
    lines = [
        "Day vs night driving:",
        f"- day:   {d['trips']} trips, {d['hours']} h, {d['distance_km']} km",
        f"- night: {n['trips']} trips, {n['hours']} h, {n['distance_km']} km",
        f"- night is {result['night_share_pct']}% of {result['total_hours']} total hours",
    ]
    req = result.get("night_requirement")
    if req:
        if req["met"]:
            lines.append(f"- night requirement MET ({req['done_h']}/{req['required_h']} h)")
        else:
            lines.append(
                f"- night requirement: {req['done_h']}/{req['required_h']} h "
                f"({req['remaining_h']} h still needed)"
            )
    return "\n".join(lines)
