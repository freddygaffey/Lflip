"""
driving_variance - measure how *varied* the learner's driving practice is.

A good logbook isn't just lots of hours, it's hours spread across different
conditions: different times of day, days of the week, weather, day vs night,
and a range of trip lengths. This tool turns the raw trips into a few simple
"spread" numbers an examiner (or the AI) can comment on.

Metrics produced:
  * distinct_start_hours   - how many different hours-of-day they have driven in
  * distinct_weekdays      - how many different days of the week
  * weather_types          - the set of weather conditions experienced
  * night_ratio            - fraction of trips done at night
  * duration_spread        - shortest / average / longest trip (hours)
  * variety_score          - 0-100 rough roll-up of the above

REQUIRES: trips
"""

from __future__ import annotations

import statistics

NAME = "driving_variance"
DESCRIPTION = (
    "Summarises how varied the learner's practice is across times of day, days "
    "of the week, weather and trip length. Helps identify gaps (e.g. only ever "
    "drives on dry weekday afternoons)."
)
REQUIRES = ("trips",)

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks how varied their practice is, or "
            "whether they have gaps in their experience (e.g. only driving at "
            "certain times or in certain weather). Takes no arguments."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}


def run(ctx) -> dict:
    trips = [t for t in ctx.trips if t.start]
    if not trips:
        return {"total_trips": 0, "variety_score": 0}

    start_hours = {t.start.hour for t in trips}
    weekdays = {t.start.weekday() for t in trips}
    weather_types = sorted({(t.weather or "").strip().lower() for t in trips if t.weather})
    night_count = sum(1 for t in ctx.trips if t.is_night)
    durations = [t.duration_hours for t in ctx.trips if t.duration_hours > 0]

    duration_spread = None
    if durations:
        duration_spread = {
            "shortest_h": round(min(durations), 2),
            "average_h": round(statistics.mean(durations), 2),
            "longest_h": round(max(durations), 2),
        }

    # rough 0-100 roll-up: reward breadth of hours, weekdays, weather and a
    # healthy night ratio. each component is capped so no single one dominates.
    score = 0
    score += min(len(start_hours), 12) / 12 * 35   # time-of-day breadth
    score += min(len(weekdays), 7) / 7 * 25        # weekday breadth
    score += min(len(weather_types), 4) / 4 * 20   # weather breadth
    night_ratio = night_count / len(ctx.trips) if ctx.trips else 0
    score += min(night_ratio / 0.2, 1.0) * 20      # aim for ~20% night

    return {
        "total_trips": len(ctx.trips),
        "distinct_start_hours": len(start_hours),
        "distinct_weekdays": len(weekdays),
        "weather_types": weather_types,
        "night_ratio": round(night_ratio, 2),
        "duration_spread": duration_spread,
        "variety_score": round(score),
    }


def format_for_ai(result: dict) -> str:
    if not result.get("total_trips"):
        return "No trips logged, so practice variety cannot be assessed."
    ds = result.get("duration_spread") or {}
    return (
        f"Practice variety (score {result['variety_score']}/100 across "
        f"{result['total_trips']} trips):\n"
        f"- driven in {result['distinct_start_hours']} different hours of the day\n"
        f"- across {result['distinct_weekdays']} of 7 weekdays\n"
        f"- weather experienced: {', '.join(result['weather_types']) or 'none recorded'}\n"
        f"- night driving: {int(result['night_ratio'] * 100)}% of trips\n"
        f"- trip length: {ds.get('shortest_h', '?')}-{ds.get('longest_h', '?')} h "
        f"(avg {ds.get('average_h', '?')} h)"
    )
