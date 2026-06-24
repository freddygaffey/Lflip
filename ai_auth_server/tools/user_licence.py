"""
user_licence - summarise the learner's licence context: their state, the licence
stage, the hour requirements for that state, their age (if date of birth is
known) and overall progress toward the total/night requirements.

This is the "who is this learner and what do they need" tool - it gives the AI
the rules that apply to *this* user so its advice is state-correct rather than
generic.

REQUIRES: identity   (trips are used if available, to compute progress)
"""

from __future__ import annotations

NAME = "user_licence"
DESCRIPTION = (
    "Reports the learner's state, licence stage, the logged-hours requirements "
    "for that state, their age if known, and progress toward the total and "
    "night hour requirements."
)
REQUIRES = ("identity",)

# model-facing function-calling spec; takes no arguments.
SCHEMA = {
    "type": "function",
    "function": {
        "name": NAME,
        "description": (
            DESCRIPTION
            + " Call this when the learner asks about their licence requirements, "
            "which state's rules apply, their age/eligibility, or their overall "
            "progress. Takes no arguments."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}


def run(ctx) -> dict:
    lic = ctx.licence
    if lic is None:
        return {"has_licence_info": False}

    total_done = round(sum(t.duration_hours for t in ctx.trips), 2)
    night_done = round(sum(t.duration_hours for t in ctx.trips if t.is_night), 2)

    out = {
        "has_licence_info": True,
        "state": (lic.state or "").upper() or None,
        "licence_stage": "Learner",  # this app is for learner logbooks
        "age_years": lic.age_years,
        "requirements": {
            "total_hours": lic.total_hours_required,
            "night_hours": lic.night_hours_required,
        },
        "progress": {
            "total_done_h": total_done,
            "night_done_h": night_done,
        },
    }

    if lic.total_hours_required:
        out["progress"]["total_remaining_h"] = round(max(0.0, lic.total_hours_required - total_done), 2)
    if lic.night_hours_required:
        out["progress"]["night_remaining_h"] = round(max(0.0, lic.night_hours_required - night_done), 2)
    return out


def format_for_ai(result: dict) -> str:
    if not result.get("has_licence_info"):
        return "No licence information on file for this learner."
    req = result["requirements"]
    prog = result["progress"]
    lines = [
        f"Learner licence ({result.get('state') or 'state unknown'}):",
        f"- stage: {result['licence_stage']}"
        + (f", age {result['age_years']}" if result.get("age_years") is not None else ""),
    ]
    if req.get("total_hours"):
        lines.append(
            f"- total hours: {prog['total_done_h']}/{req['total_hours']} h "
            f"({prog.get('total_remaining_h', '?')} h to go)"
        )
    if req.get("night_hours"):
        lines.append(
            f"- night hours: {prog['night_done_h']}/{req['night_hours']} h "
            f"({prog.get('night_remaining_h', '?')} h to go)"
        )
    return "\n".join(lines)
