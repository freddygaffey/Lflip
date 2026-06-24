"""
parser - the shared "passer" that turns raw backend web-request data into
clean, typed objects the tools can reason about.

The main server returns JSON over HTTP (sometimes as a real list/dict, sometimes
as a JSON string - the frontend has the same quirk). The job of this module is
to hide all of that messiness so a tool never has to think about:

  * JSON that arrives as a string vs already-decoded
  * millisecond epoch timestamps vs datetimes
  * missing / null fields
  * deriving useful values (trip duration, distance, average speed, ...)

Everything a tool needs is bundled into a single `Context` object built by
`build_context(...)`. A tool is then just `run(ctx) -> dict`.

Data shapes (matching backend/app.py):
  trip  : id, start_time(ms), end_time(ms), start_odo, end_odo, day_night,
          weather, car_id, sv_id, sv_name, sv_licence_no, gps[]
  gps   : time(ms), lat, lon, speed
  car   : id, nickname, plate, last_used(ms)
  sv    : id, full_name, licence_no, last_used(ms)
  state : state, total(hours), night(hours)   (+ optional date_of_birth)
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from datetime import datetime


# --------------------------------------------------------------------------- #
# low-level helpers
# --------------------------------------------------------------------------- #
def loads(raw):
    """Accept a JSON string, a list/dict, or None and always return a Python
    value (or None). Mirrors the `typeof res.data === 'string'` dance the
    frontend does."""
    if raw is None:
        return None
    if isinstance(raw, (list, dict)):
        return raw
    if isinstance(raw, str):
        raw = raw.strip()
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None
    return None


def first_name(name) -> str | None:
    """Reduce a supervisor's full name to just their first name. Supervising
    drivers are only ever exposed to the AI by first name (privacy: it's another
    person's data and the surname/licence number are withheld)."""
    if not name:
        return None
    parts = str(name).strip().split()
    return parts[0] if parts else None


def ms_to_dt(ms) -> datetime | None:
    """Convert a millisecond epoch (the backend's timestamp format) to a
    datetime, tolerating None / bad values."""
    if ms is None:
        return None
    try:
        return datetime.fromtimestamp(float(ms) / 1000.0)
    except (TypeError, ValueError, OSError):
        return None


def haversine_km(a: "GpsPoint", b: "GpsPoint") -> float:
    """Great-circle distance between two GPS points, in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dphi = math.radians(b.lat - a.lat)
    dlam = math.radians(b.lon - a.lon)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlam / 2) ** 2
    return 2 * r * math.asin(min(1.0, math.sqrt(h)))


# --------------------------------------------------------------------------- #
# typed data objects
# --------------------------------------------------------------------------- #
@dataclass
class GpsPoint:
    time: datetime | None
    lat: float
    lon: float
    speed: float | None = None


@dataclass
class Trip:
    id: int | None = None
    start: datetime | None = None
    end: datetime | None = None
    start_odo: float | None = None
    end_odo: float | None = None
    day_night: str | None = None
    weather: str | None = None
    car_id: int | None = None
    sv_id: int | None = None
    sv_name: str | None = None
    sv_licence_no: str | None = None
    gps: list[GpsPoint] = field(default_factory=list)

    @property
    def is_night(self) -> bool:
        return (self.day_night or "").lower() == "night"

    @property
    def duration_hours(self) -> float:
        """Trip length in hours, or 0 if the times are missing/invalid."""
        if not self.start or not self.end:
            return 0.0
        secs = (self.end - self.start).total_seconds()
        return max(0.0, secs / 3600.0)

    @property
    def distance_km(self) -> float | None:
        """Distance from the odometer readings (km), if both are present."""
        if self.start_odo is None or self.end_odo is None:
            return None
        return max(0.0, self.end_odo - self.start_odo)

    @property
    def avg_speed_kmh(self) -> float | None:
        """Average speed from odometer distance / duration. Preferred over the
        raw GPS speed field because the odometer unit (km) is unambiguous."""
        dist = self.distance_km
        dur = self.duration_hours
        if dist is None or dur <= 0:
            return None
        return dist / dur

    @property
    def gps_span_km(self) -> float | None:
        """Diagonal of the GPS bounding box - a rough proxy for how far the
        trip ranged from its starting area."""
        pts = [p for p in self.gps if p is not None]
        if len(pts) < 2:
            return None
        lats = [p.lat for p in pts]
        lons = [p.lon for p in pts]
        corner_a = GpsPoint(None, min(lats), min(lons))
        corner_b = GpsPoint(None, max(lats), max(lons))
        return haversine_km(corner_a, corner_b)


@dataclass
class Car:
    id: int | None = None
    nickname: str | None = None
    plate: str | None = None
    last_used: datetime | None = None


@dataclass
class Supervisor:
    id: int | None = None
    full_name: str | None = None
    licence_no: str | None = None
    last_used: datetime | None = None


@dataclass
class LicenceState:
    state: str | None = None
    total_hours_required: float | None = None
    night_hours_required: float | None = None
    date_of_birth: datetime | None = None  # optional, if the backend supplies it

    @property
    def age_years(self) -> int | None:
        if not self.date_of_birth:
            return None
        today = datetime.now()
        years = today.year - self.date_of_birth.year
        if (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day):
            years -= 1
        return years


@dataclass
class Context:
    """Everything the tools might need, already parsed. A tool reads only the
    fields it cares about (see each tool's REQUIRES)."""
    trips: list[Trip] = field(default_factory=list)
    cars: list[Car] = field(default_factory=list)
    supervisors: list[Supervisor] = field(default_factory=list)
    licence: LicenceState | None = None


# --------------------------------------------------------------------------- #
# parsing entry points
# --------------------------------------------------------------------------- #
def parse_gps(raw) -> list[GpsPoint]:
    """Parse a raw GPS-point array (each {time, lat, lon, speed}) into GpsPoints,
    skipping any malformed entries. Used both inline when a trip carries its own
    gps[] and when the AI server fetches gps separately per trip."""
    data = loads(raw) or []
    if not isinstance(data, list):
        return []
    points: list[GpsPoint] = []
    for g in data:
        if not isinstance(g, dict):
            continue
        try:
            points.append(GpsPoint(
                time=ms_to_dt(g.get("time")),
                lat=float(g.get("lat")),
                lon=float(g.get("lon")),
                speed=g.get("speed"),
            ))
        except (TypeError, ValueError):
            continue
    return points


def parse_trips(raw) -> list[Trip]:
    data = loads(raw) or []
    if not isinstance(data, list):
        return []
    trips: list[Trip] = []
    for t in data:
        if not isinstance(t, dict):
            continue
        gps = parse_gps(t.get("gps"))
        trips.append(Trip(
            id=t.get("id"),
            start=ms_to_dt(t.get("start_time")),
            end=ms_to_dt(t.get("end_time")),
            start_odo=t.get("start_odo"),
            end_odo=t.get("end_odo"),
            day_night=t.get("day_night"),
            weather=t.get("weather"),
            car_id=t.get("car_id"),
            sv_id=t.get("sv_id"),
            sv_name=t.get("sv_name"),
            sv_licence_no=t.get("sv_licence_no"),
            gps=gps,
        ))
    return trips


def parse_cars(raw) -> list[Car]:
    data = loads(raw) or []
    if not isinstance(data, list):
        return []
    return [
        Car(
            id=c.get("id"),
            nickname=c.get("nickname"),
            plate=c.get("plate"),
            last_used=ms_to_dt(c.get("last_used")),
        )
        for c in data if isinstance(c, dict)
    ]


def parse_supervisors(raw) -> list[Supervisor]:
    data = loads(raw) or []
    if not isinstance(data, list):
        return []
    return [
        Supervisor(
            id=s.get("id"),
            full_name=s.get("full_name"),
            licence_no=s.get("licence_no"),
            last_used=ms_to_dt(s.get("last_used")),
        )
        for s in data if isinstance(s, dict)
    ]


def parse_state(raw) -> LicenceState | None:
    data = loads(raw)
    if not isinstance(data, dict) or "state" not in data:
        return None
    return LicenceState(
        state=data.get("state"),
        total_hours_required=data.get("total"),
        night_hours_required=data.get("night"),
        date_of_birth=ms_to_dt(data.get("date_of_birth")),
    )


def build_context(trips_raw=None, cars_raw=None, svs_raw=None, state_raw=None) -> Context:
    """Build a Context from whatever raw backend responses are available.
    Any argument may be omitted (e.g. the user hasn't granted access to it)."""
    return Context(
        trips=parse_trips(trips_raw),
        cars=parse_cars(cars_raw),
        supervisors=parse_supervisors(svs_raw),
        licence=parse_state(state_raw),
    )
