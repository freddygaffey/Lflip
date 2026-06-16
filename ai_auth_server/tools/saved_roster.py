"""
saved_roster - list every saved car and supervising driver, including ones the
learner has never used yet.

Unlike car_usage / supervisor_usage (which are driven by the trips and so only
mention vehicles/people that actually appear in a trip), this tool starts from
the saved cars and supervisors and reports each one's usage - which is allowed
to be zero. That makes it the right tool for "what cars / supervisors do I have
saved?" or "which of my supervisors haven't I driven with yet?".

REQUIRES: trips, cars, supervisors
"""

from __future__ import annotations

NAME = "saved_roster"
DESCRIPTION = (
    "Lists every saved car and supervising driver the learner has on file, "
    "with each one's trip/hour usage (which may be zero), so unused cars and "
    "supervisors are still shown."
)
REQUIRES = ("trips", "cars", "supervisors")

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks what cars or supervisors they "
            "have saved, or which ones they haven't used / driven with yet. "
            "Takes no arguments."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}


def run(ctx) -> dict:
    # seed every saved car/supervisor with zero usage, then add trips on top so
    # unused entries survive with usage == 0.
    cars = {
        c.id: {
            "car_id": c.id,
            "nickname": c.nickname,
            "plate": c.plate,
            "trips": 0,
            "hours": 0.0,
            "distance_km": 0.0,
        }
        for c in ctx.cars
    }
    supervisors = {
        s.id: {
            "sv_id": s.id,
            "name": s.full_name or f"supervisor {s.id}",
            "licence_no": s.licence_no,
            "trips": 0,
            "hours": 0.0,
        }
        for s in ctx.supervisors
    }

    for t in ctx.trips:
        c = cars.get(t.car_id)
        if c is not None:
            c["trips"] += 1
            c["hours"] += t.duration_hours
            c["distance_km"] += t.distance_km or 0.0
        s = supervisors.get(t.sv_id)
        if s is not None:
            s["trips"] += 1
            s["hours"] += t.duration_hours

    car_list = []
    for c in cars.values():
        c["hours"] = round(c["hours"], 2)
        c["distance_km"] = round(c["distance_km"], 1)
        car_list.append(c)
    # most-used first, but unused entries (trips == 0) still included.
    car_list.sort(key=lambda c: c["hours"], reverse=True)

    sv_list = []
    for s in supervisors.values():
        s["hours"] = round(s["hours"], 2)
        sv_list.append(s)
    sv_list.sort(key=lambda s: s["hours"], reverse=True)

    return {
        "total_cars": len(ctx.cars),
        "total_supervisors": len(ctx.supervisors),
        "cars": car_list,
        "supervisors": sv_list,
        "unused_cars": [c["nickname"] or f"car {c['car_id']}"
                        for c in car_list if c["trips"] == 0],
        "unused_supervisors": [s["name"] for s in sv_list if s["trips"] == 0],
    }


def format_for_ai(result: dict) -> str:
    if not result["cars"] and not result["supervisors"]:
        return "No saved cars or supervisors to report."
    lines = []

    lines.append(f"Saved cars ({result['total_cars']}):")
    for c in result["cars"]:
        name = c["nickname"] or f"car {c['car_id']}"
        used = (f"{c['trips']} trips, {c['hours']} h, {c['distance_km']} km"
                if c["trips"] else "not used yet")
        lines.append(f"- {name}: {used}")

    lines.append(f"Saved supervisors ({result['total_supervisors']}):")
    for s in result["supervisors"]:
        used = (f"{s['trips']} trips, {s['hours']} h"
                if s["trips"] else "not driven with yet")
        lines.append(f"- {s['name']}: {used}")

    if result["unused_cars"]:
        lines.append("Unused cars: " + ", ".join(result["unused_cars"]) + ".")
    if result["unused_supervisors"]:
        lines.append("Unused supervisors: " + ", ".join(result["unused_supervisors"]) + ".")
    return "\n".join(lines)
