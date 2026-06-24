"""
supervisor_usage - break down driving practice per supervising driver
("parent usage").

Each trip records who supervised it. Trips link to a saved supervisor by sv_id,
but older/ad-hoc trips may only carry a free-text sv_name, so we group by id
when we can and fall back to the name otherwise.

Reports trips / hours supervised per person, the day-vs-night split they
supervised, and who has done the most.

REQUIRES: log, supervisors
"""

from __future__ import annotations

from .parser import first_name

NAME = "supervisor_usage"
DESCRIPTION = (
    "Summarises how many hours each supervising driver (e.g. a parent) has "
    "overseen, including their day/night split and who supervises most."
)
REQUIRES = ("log", "supervisors")

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks who has supervised them, or how "
            "many hours they have done with a parent or particular supervisor. "
            "Takes no arguments."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}


def _key_and_name(trip, svs_by_id):
    """Return a stable grouping key and a display name for a trip's supervisor.
    Supervisors are exposed to the AI by first name only (their surname and
    licence number are withheld - it's another person's data)."""
    sv = svs_by_id.get(trip.sv_id)
    if sv is not None:
        return f"id:{sv.id}", (first_name(sv.full_name) or f"supervisor {sv.id}")
    if trip.sv_name:
        return f"name:{trip.sv_name.strip().lower()}", (first_name(trip.sv_name) or "Unknown supervisor")
    return "unknown", "Unknown supervisor"


def run(ctx) -> dict:
    svs_by_id = {s.id: s for s in ctx.supervisors}
    groups: dict = {}

    for t in ctx.trips:
        key, name = _key_and_name(t, svs_by_id)
        g = groups.setdefault(key, {
            "name": name,
            "trips": 0,
            "hours": 0.0,
            "day_hours": 0.0,
            "night_hours": 0.0,
        })
        g["trips"] += 1
        g["hours"] += t.duration_hours
        if t.is_night:
            g["night_hours"] += t.duration_hours
        else:
            g["day_hours"] += t.duration_hours

    supervisors = []
    for g in groups.values():
        for k in ("hours", "day_hours", "night_hours"):
            g[k] = round(g[k], 2)
        supervisors.append(g)
    supervisors.sort(key=lambda s: s["hours"], reverse=True)

    return {
        "total_saved_supervisors": len(ctx.supervisors),
        "supervisors": supervisors,
        "most_active": supervisors[0]["name"] if supervisors else None,
    }


def format_for_ai(result: dict) -> str:
    if not result["supervisors"]:
        return "No supervised trips to report."
    lines = ["Hours by supervising driver:"]
    for s in result["supervisors"]:
        lines.append(
            f"- {s['name']}: {s['trips']} trips, {s['hours']} h "
            f"(day {s['day_hours']} h / night {s['night_hours']} h)"
        )
    if result.get("most_active"):
        lines.append(f"Most active supervisor: {result['most_active']}.")
    return "\n".join(lines)
