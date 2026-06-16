"""
car_usage - break down driving practice per car.

Joins trips to the saved cars (by car_id) and totals trips / hours / distance
for each vehicle, flags the most-used ("primary") car, and lists any trips that
weren't linked to a saved car.

REQUIRES: trips, cars
"""

from __future__ import annotations

NAME = "car_usage"
DESCRIPTION = (
    "Summarises how much the learner has driven in each saved car (trips, "
    "hours, distance) and which vehicle is their main one."
)
REQUIRES = ("trips", "cars")

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks how much they have driven a "
            "particular car or which car they use most. Takes no arguments."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}


def run(ctx) -> dict:
    cars_by_id = {c.id: c for c in ctx.cars}
    usage: dict = {}
    unlinked = {"trips": 0, "hours": 0.0, "distance_km": 0.0}

    for t in ctx.trips:
        car = cars_by_id.get(t.car_id)
        if car is None:
            unlinked["trips"] += 1
            unlinked["hours"] += t.duration_hours
            unlinked["distance_km"] += t.distance_km or 0.0
            continue
        u = usage.setdefault(car.id, {
            "car_id": car.id,
            "nickname": car.nickname,
            "plate": car.plate,
            "trips": 0,
            "hours": 0.0,
            "distance_km": 0.0,
        })
        u["trips"] += 1
        u["hours"] += t.duration_hours
        u["distance_km"] += t.distance_km or 0.0

    cars = []
    for u in usage.values():
        u["hours"] = round(u["hours"], 2)
        u["distance_km"] = round(u["distance_km"], 1)
        cars.append(u)
    cars.sort(key=lambda c: c["hours"], reverse=True)

    unlinked["hours"] = round(unlinked["hours"], 2)
    unlinked["distance_km"] = round(unlinked["distance_km"], 1)

    return {
        "total_cars": len(ctx.cars),
        "cars": cars,
        "primary_car": cars[0]["nickname"] if cars else None,
        "unlinked_trips": unlinked if unlinked["trips"] else None,
    }


def format_for_ai(result: dict) -> str:
    if not result["cars"] and not result.get("unlinked_trips"):
        return "No car usage to report (no trips linked to saved cars)."
    lines = ["Driving by car:"]
    for c in result["cars"]:
        name = c["nickname"] or f"car {c['car_id']}"
        lines.append(f"- {name}: {c['trips']} trips, {c['hours']} h, {c['distance_km']} km")
    if result.get("primary_car"):
        lines.append(f"Main car: {result['primary_car']}.")
    if result.get("unlinked_trips"):
        u = result["unlinked_trips"]
        lines.append(f"{u['trips']} trips ({u['hours']} h) were not linked to a saved car.")
    return "\n".join(lines)
