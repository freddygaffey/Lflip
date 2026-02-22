import sqlite3
from flask import g
from config import DATABASE

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id              TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('learner', 'parent')),
    licence_number  TEXT,
    state           TEXT DEFAULT 'ACT',
    created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS supervisors (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    licence_number  TEXT,
    relationship    TEXT NOT NULL CHECK (relationship IN ('Parent', 'Instructor', 'Friend', 'Other')),
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cars (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    number_plate    TEXT,
    last_odometer   REAL,
    esp32_device_id TEXT,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS parent_links (
    id              TEXT PRIMARY KEY,
    parent_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at      INTEGER NOT NULL,
    UNIQUE (parent_id, learner_id),
    CHECK (parent_id != learner_id)
);

CREATE TABLE IF NOT EXISTS pairing_tokens (
    token           TEXT PRIMARY KEY,
    learner_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS trips (
    id              TEXT PRIMARY KEY,
    user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supervisor_id   TEXT REFERENCES supervisors(id) ON DELETE SET NULL,
    supervisor_name TEXT,
    car_id          TEXT REFERENCES cars(id) ON DELETE SET NULL,
    car_name        TEXT,
    learner_name    TEXT,
    cloud_id        TEXT,
    start_time      INTEGER NOT NULL,
    end_time        INTEGER,
    start_odometer  REAL,
    end_odometer    REAL,
    start_lat       REAL,
    start_lng       REAL,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'active', 'stopped', 'complete')),
    sync_status     TEXT NOT NULL DEFAULT 'unsynced'
                        CHECK (sync_status IN ('unsynced', 'syncing', 'synced', 'error')),
    approval_state  TEXT NOT NULL DEFAULT 'pending'
                        CHECK (approval_state IN ('pending', 'approved', 'rejected')),
    approved_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
    approved_at     INTEGER,
    weather         TEXT CHECK (weather IN ('sunny', 'overcast', 'rain', 'night')),
    gps_points      TEXT,
    accel_points    TEXT,
    accel_events    TEXT,
    distance_km     REAL,
    odo_distance_km REAL,
    day_minutes     REAL,
    night_minutes   REAL,
    max_speed_kmh   REAL,
    avg_speed_kmh   REAL,
    odo_source      TEXT CHECK (odo_source IN ('esp32', 'manual')),
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_role              ON users(role);
CREATE INDEX IF NOT EXISTS idx_supervisors_user_id     ON supervisors(user_id);
CREATE INDEX IF NOT EXISTS idx_cars_user_id            ON cars(user_id);
CREATE INDEX IF NOT EXISTS idx_cars_esp32_device_id    ON cars(esp32_device_id) WHERE esp32_device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parent_links_parent_id  ON parent_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_learner_id ON parent_links(learner_id);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_learner  ON pairing_tokens(learner_id);
CREATE INDEX IF NOT EXISTS idx_pairing_tokens_expires  ON pairing_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_trips_user_id           ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_trips_approval_state    ON trips(approval_state);
CREATE INDEX IF NOT EXISTS idx_trips_created_at        ON trips(created_at);
CREATE INDEX IF NOT EXISTS idx_trips_supervisor_id     ON trips(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_trips_user_status       ON trips(user_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_user_approval     ON trips(user_id, approval_state);
CREATE INDEX IF NOT EXISTS idx_trips_user_created      ON trips(user_id, created_at);
"""


def get_db():
    """Return a request-scoped SQLite connection stored on Flask's g object."""
    if '_database' not in g:
        g._database = sqlite3.connect(DATABASE)
        g._database.row_factory = sqlite3.Row
        g._database.execute('PRAGMA foreign_keys = ON')
    return g._database


def close_db(exception=None):
    db = g.pop('_database', None)
    if db is not None:
        db.close()


def init_db():
    """Create tables and indexes if they don't exist."""
    conn = sqlite3.connect(DATABASE)
    conn.executescript(SCHEMA)
    _migrate(conn)
    conn.close()


def _migrate(conn):
    """Add columns that may be missing in older databases."""
    cursor = conn.execute("PRAGMA table_info(users)")
    columns = {row[1] for row in cursor.fetchall()}
    if 'state' not in columns:
        conn.execute("ALTER TABLE users ADD COLUMN state TEXT DEFAULT 'ACT'")
        conn.commit()
