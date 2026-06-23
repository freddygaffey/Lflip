"""
route_diversity - measure how *spread out* the learner's routes are, rather than
just how remote they reach.

trip_remoteness answers "how far from a city did you get?". This tool answers a
different question: "are you driving the same patch of road over and over, or
covering genuinely different areas?". It groups each GPS-tracked trip by its
route centroid into distinct driving "areas" (greedy clustering within a
distance threshold), then reports how many distinct areas there are, how
repeated the most-driven area is, and how far the typical trip ranges.

A learner who only ever loops the same few streets has low route diversity even
if they have lots of hours - a gap an examiner (or the AI) can flag.

REQUIRES: log, gps
"""

from __future__ import annotations

import statistics

from . import geo

NAME = "route_diversity"
DESCRIPTION = (
    "Analyses how varied the learner's routes are from their GPS data - how many "
    "distinct driving areas they cover, how much they repeat the same area, and "
    "how far a typical trip ranges - to spot 'same few streets over and over' "
    "practice."
)
REQUIRES = ("log", "gps")

# trips whose centroids are within this many km of each other are treated as the
# same driving "area". ~5 km roughly groups a suburb/town together.
AREA_RADIUS_KM = 5.0

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks whether they drive varied routes "
            "or keep repeating the same area/streets, or how spread out their "
            "driving is. Takes no arguments."
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
    centroids = []          # (lat, lon) per GPS trip
    spans = []              # gps_span_km per GPS trip that has one
    no_gps = 0

    for t in ctx.trips:
        c = _trip_centroid(t)
        if c is None:
            no_gps += 1
            continue
        centroids.append(c)
        span = t.gps_span_km
        if span is not None:
            spans.append(span)

    # greedy clustering: each centroid joins the first existing area within the
    # radius, otherwise it starts a new area. order-dependent but good enough for
    # a rough diversity read.
    areas: list[dict] = []
    for lat, lon in centroids:
        for a in areas:
            if geo.haversine_km(lat, lon, a["lat"], a["lon"]) <= AREA_RADIUS_KM:
                a["trips"] += 1
                break
        else:
            label = geo.classify_remoteness(lat, lon)
            areas.append({
                "lat": lat,
                "lon": lon,
                "trips": 1,
                "nearest_city": label["nearest_city"],
            })

    gps_trips = len(centroids)
    distinct_areas = len(areas)
    busiest = max(areas, key=lambda a: a["trips"], default=None)
    repeat_ratio = round(busiest["trips"] / gps_trips, 2) if busiest else None

    span_spread = None
    if spans:
        span_spread = {
            "shortest_km": round(min(spans), 1),
            "average_km": round(statistics.mean(spans), 1),
            "longest_km": round(max(spans), 1),
        }

    # rough 0-100 roll-up: reward many distinct areas relative to trips and a
    # decent typical range, penalise piling every trip into one area.
    score = 0
    if gps_trips:
        # area breadth: 1 area -> 0, approaching #trips distinct -> full marks.
        score += min((distinct_areas - 1) / max(gps_trips - 1, 1), 1.0) * 60
        # spread: aim for a typical range of ~10 km across an area.
        avg_span = span_spread["average_km"] if span_spread else 0
        score += min(avg_span / 10.0, 1.0) * 40

    return {
        "total_trips": len(ctx.trips),
        "gps_trips": gps_trips,
        "trips_without_gps": no_gps,
        "distinct_areas": distinct_areas,
        "busiest_area": (
            {"nearest_city": busiest["nearest_city"], "trips": busiest["trips"]}
            if busiest else None
        ),
        "repeat_ratio": repeat_ratio,
        "span_spread_km": span_spread,
        "area_radius_km": AREA_RADIUS_KM,
        "diversity_score": round(score),
    }


def format_for_ai(result: dict) -> str:
    if not result.get("total_trips"):
        return "No trips logged, so route diversity cannot be assessed."
    if not result["gps_trips"]:
        return (
            "No trips have GPS data, so route diversity cannot be assessed "
            f"({result['trips_without_gps']} trips without GPS)."
        )

    lines = [
        f"Route diversity (score {result['diversity_score']}/100 from "
        f"{result['gps_trips']} GPS trips):",
        f"- {result['distinct_areas']} distinct driving areas "
        f"(grouped within {result['area_radius_km']} km)",
    ]
    if result["busiest_area"]:
        ba = result["busiest_area"]
        lines.append(
            f"- most-driven area is near {ba['nearest_city']}: {ba['trips']} trips "
            f"({int(result['repeat_ratio'] * 100)}% of GPS trips)"
        )
    ss = result.get("span_spread_km")
    if ss:
        lines.append(
            f"- typical trip ranges {ss['average_km']} km "
            f"(from {ss['shortest_km']} to {ss['longest_km']} km)"
        )
    if result["trips_without_gps"]:
        lines.append(
            f"- {result['trips_without_gps']} trips had no GPS and were excluded"
        )
    return "\n".join(lines)
