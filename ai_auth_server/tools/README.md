# AI tools

AI-friendly helpers that turn raw data from the main backend's web requests
into small, summarised insights the assistant can actually reason about.

Each tool is a single module that documents itself in-text (module docstring at
the top of the file).

## Pipeline

```
backend HTTP responses  ──►  parser.build_context(...)  ──►  Context
Context                 ──►  tool.run(ctx)              ──►  dict result
dict result             ──►  tool.format_for_ai(result) ──►  short text for the model
```

The `parser` (the "passer") hides all the messy bits: JSON that arrives as a
string vs decoded, millisecond timestamps, missing fields, and derived values
like trip duration / distance / average speed.

## Uniform tool interface

Every tool module exposes:

| symbol | type | meaning |
|---|---|---|
| `NAME` | `str` | unique id |
| `DESCRIPTION` | `str` | one-line description |
| `REQUIRES` | `tuple[str]` | data categories needed: `trips`, `cars`, `supervisors`, `licence` |
| `SCHEMA` | `dict` | function-calling spec to hand to the model (incl. when-to-use guidance) |
| `run(ctx)` | `(Context) -> dict` | structured result |
| `format_for_ai(result)` | `(dict) -> str` | compact, model-readable summary |

Each tool owns its own `SCHEMA` (OpenAI / Ollama function-calling format). These
tools take **no arguments** - they always run against the signed-in learner's
own data - so the model only decides *whether* to call a tool, and the server
runs it server-side via `run_tool(name, ctx)`.

### Turning tools on and off

`REQUIRES` categories line up with the per-user `AiPreference` flags in the main
backend (`allow_trips`, `allow_cars`, `allow_supervisors`, `allow_licence`):

* `allowed_tools(prefs)` → names of tools the user has consented to
* `allowed_schemas(prefs)` → just those tools' `SCHEMA`s, ready for the model

A tool is offered to the model only if **all** of its `REQUIRES` categories are
enabled, so flipping a toggle in Settings turns the matching tools on/off.

## The tools

| module | does |
|---|---|
| `trip_speed.py` | classifies trips by average speed (low/stop-start, medium, high/open-road) |
| `trip_remoteness.py` | classifies trips by **real** geographic remoteness from GPS coords (uses `geo.py`) |
| `driving_variance.py` | how varied practice is (time of day, weekday, weather, night ratio, trip length) |
| `weather_variance.py` | per-weather breakdown (trips/hours/distance/speed) and wet-weather experience + dry-vs-wet slow-down |
| `route_diversity.py` | how spread out routes are from GPS (distinct driving areas, repeat ratio, typical range) |
| `day_night_comparison.py` | day vs night hours, plus progress toward the night requirement |
| `car_usage.py` | trips / hours / distance per saved car, and the primary car |
| `supervisor_usage.py` | hours supervised per person (e.g. parent), with day/night split |
| `user_licence.py` | state, stage, age, hour requirements and overall progress |

`parser.py` and `geo.py` are shared helpers, not tools: `parser` builds the
`Context`, and `geo` holds the geographic remoteness calculation (nearest major
city → remoteness band) used by `trip_remoteness`.

## Usage

```python
import tools
from tools import parser

# raw_* are whatever came back from the backend (str or decoded JSON)
ctx = parser.build_context(
    trips_raw=raw_trips,
    cars_raw=raw_cars,
    svs_raw=raw_svs,
    state_raw=raw_state,
)

# --- function-calling style: let the model choose a tool ---
schemas = tools.allowed_schemas(user_prefs)   # pass as the model's `tools=`
# ...model replies with a tool call for e.g. "day_night_comparison"...
result = tools.run_tool("day_night_comparison", ctx)

# --- or just inject a summary as context (no function-calling needed) ---
names = tools.allowed_tools(user_prefs)
context_text = tools.summarise_for_ai(ctx, names)
```
