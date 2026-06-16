"""
tools - AI-friendly helpers that turn raw backend data into usable, summarised
insight for the assistant.

Pipeline
--------
    backend HTTP responses  ->  parser.build_context(...)  ->  Context
    Context                 ->  a tool's run(ctx)          ->  dict result
    dict result             ->  a tool's format_for_ai()   ->  short text

Every tool module exposes the same small interface:

    NAME          str            unique id
    DESCRIPTION   str            one-line description (good for function-calling)
    REQUIRES      tuple[str]     data categories it needs: any of
                                 "trips", "cars", "supervisors", "licence"
    run(ctx)      -> dict        structured result
    format_for_ai(result) -> str compact, model-readable summary

The REQUIRES categories line up with the per-user AiPreference flags in the
main backend (allow_trips, allow_cars, allow_supervisors, allow_licence), so a
tool can be skipped when the user hasn't granted access to the data it needs.
"""

from __future__ import annotations

from . import parser
from . import (
    trip_speed,
    trip_remoteness,
    driving_variance,
    weather_variance,
    route_diversity,
    day_night_comparison,
    car_usage,
    supervisor_usage,
    saved_roster,
    user_licence,
)

# registry: name -> module
TOOLS = {
    m.NAME: m
    for m in (
        trip_speed,
        trip_remoteness,
        driving_variance,
        weather_variance,
        route_diversity,
        day_night_comparison,
        car_usage,
        supervisor_usage,
        saved_roster,
        user_licence,
    )
}

# map a REQUIRES category to the matching AiPreference flag name
PREF_FOR_CATEGORY = {
    "trips": "allow_trips",
    "cars": "allow_cars",
    "supervisors": "allow_supervisors",
    "licence": "allow_licence",
}


def list_tools() -> list[dict]:
    """Metadata for every tool, including its model-facing schema."""
    return [
        {
            "name": m.NAME,
            "description": m.DESCRIPTION,
            "requires": list(m.REQUIRES),
            "schema": m.SCHEMA,
        }
        for m in TOOLS.values()
    ]


def allowed_tools(prefs: dict) -> list[str]:
    """Names of tools whose required data categories are all permitted by the
    given AiPreference dict (e.g. {"allow_trips": True, ...})."""
    names = []
    for name, m in TOOLS.items():
        if all(prefs.get(PREF_FOR_CATEGORY[c], False) for c in m.REQUIRES):
            names.append(name)
    return names


def tool_schemas(names=None) -> list[dict]:
    """The function-calling schemas for the chosen tools - pass straight to the
    model's `tools` parameter. Defaults to every tool."""
    names = names if names is not None else list(TOOLS)
    return [TOOLS[n].SCHEMA for n in names]


def allowed_schemas(prefs: dict) -> list[dict]:
    """Schemas for only the tools the user has consented to (via AiPreference).
    This is how tools get turned on and off for the model."""
    return tool_schemas(allowed_tools(prefs))


def run_tool(name: str, ctx) -> dict:
    """Run a single tool by name and return its structured result."""
    if name not in TOOLS:
        raise KeyError(f"unknown tool: {name}")
    return TOOLS[name].run(ctx)


def run_all(ctx, names=None) -> dict:
    """Run several tools and return {name: {"result": ..., "summary": ...}}.
    Defaults to every registered tool."""
    names = names if names is not None else list(TOOLS)
    out = {}
    for name in names:
        m = TOOLS[name]
        result = m.run(ctx)
        out[name] = {"result": result, "summary": m.format_for_ai(result)}
    return out


def summarise_for_ai(ctx, names=None) -> str:
    """One block of text combining the chosen tools' summaries - drop straight
    into a system/context message for the model."""
    names = names if names is not None else list(TOOLS)
    blocks = [TOOLS[n].format_for_ai(TOOLS[n].run(ctx)) for n in names]
    return "\n\n".join(b for b in blocks if b)
