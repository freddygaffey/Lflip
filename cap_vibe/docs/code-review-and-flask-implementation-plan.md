# Code Review & Flask Backend Implementation Plan

---

## Part 1: Code Review

### 1.1 What's Correct

| Component | Status | Notes |
|-----------|--------|-------|
| **api.mock.js** | Good | Distinct user IDs for parent/learner demo, parent_links, pairing_tokens, createPairingToken, completePairing, getLinkedLearners, getTrips filtering by linked learners, syncTrip/saveLocalTrip setting learnerId |
| **PairWithParent** | Good | Role guard, QR generation (qrcode), manual code display, generate new code |
| **ScanToPair** | Good | Native BarcodeScanner, WebQrScanner on web, manual entry, role guard |
| **WebQrScanner** | Good | jsQR + getUserMedia, fallback to 'user' facingMode, stream cleanup |
| **Settings** | Good | Pairing links (Add learner / Pair with parent) by role |
| **App routes** | Good | /pair, /scan-pair |
| **api.real.js** | Good | Has createPairingToken, completePairing, getLinkedLearners stubs (throws / empty) |

### 1.2 Issue to Fix: getLogbookSummary

**Problem:** `getLogbookSummary()` uses `this.trips` without filtering by user. For a **parent**, it returns totals for **all** trips in the system, not just linked learners' trips.

**Impact:** When a parent views TripHistory or Dashboard with LogbookPieChart, the summary (total hours, day/night) will be wrong if there are trips from unlinked learners.

**Fix:** In `api.mock.js`, filter `completed` trips the same way `getTrips` does before aggregating:
- Parent: filter by linked learners
- Learner: filter by own learnerId

---

### 1.3 Mock vs Real API Gaps

| Area | Mock | Real API (to implement) |
|------|------|-------------------------|
| Supervisors | Global (no user filter) | Per user (user_id) |
| Cars | Global (no user filter) | Per user (user_id) |
| getLogbookSummary | Not filtered for parent | Must filter by linked learners for parent |

---

## Part 2: Flask Backend Implementation Plan

### 2.1 Project Structure

```
cap_vibe/
├── 2_js/                 # React app (existing)
├── backend/              # NEW: Flask API
│   ├── app.py            # Flask app, routes
│   ├── config.py         # Config (DB path, JWT secret, etc.)
│   ├── models/           # SQLAlchemy models (optional) or raw SQL
│   │   └── ...
│   ├── db.py             # DB init, schema
│   ├── auth.py           # JWT helpers, require_auth decorator
│   ├── requirements.txt
│   └── run.py            # Entry point: python run.py
└── docs/
```

### 2.2 Implementation Order

| Step | Task | Est. |
|------|------|------|
| 1 | Scaffold Flask app, config, SQLite schema | 30 min |
| 2 | Auth: register, login, JWT, /api/auth/me | 45 min |
| 3 | Trips: POST (syncTrip), GET (list + single), PATCH approve | 60 min |
| 4 | Supervisors CRUD (per user) | 30 min |
| 5 | Cars CRUD (per user) | 30 min |
| 6 | Pairing: create, complete, linked | 30 min |
| 7 | Logbook summary (filtered for parent) | 20 min |
| 8 | Wire RealApiService in app, test | 45 min |

---

### 2.3 Step 1: Scaffold and Database

**Create `backend/requirements.txt`:**
```
flask>=3.0
flask-cors>=4.0
pyjwt>=2.8
bcrypt>=4.1
```

**Create `backend/config.py`:**
```python
import os
DATABASE = os.getenv('LPLATE_DB', 'lplate.db')
JWT_SECRET = os.getenv('JWT_SECRET', 'change-me-in-production')
JWT_EXPIRY_DAYS = 7
```

**Create `backend/db.py`:**
- Use `sqlite3` (or SQLAlchemy if preferred)
- Run schema from `docs/api-and-database-design.md` Section 4
- Add `init_db()` called on app startup
- Provide `get_db()` for connection

**Fix schema order:** Create tables in dependency order: users → supervisors → cars → trips → parent_links → pairing_tokens. The existing SQLite schema in docs has trips referencing supervisors; ensure supervisors and cars are created before trips.

---

### 2.4 Step 2: Auth

**Endpoints:**
- `POST /api/auth/register` — Body: `{ email, password, name, role?, licenceNumber? }`. Hash password (bcrypt), insert user, return JWT.
- `POST /api/auth/login` — Body: `{ email, password }`. Verify password, return JWT + user.
- `GET /api/auth/me` — Bearer token required. Decode JWT, return `{ userId, name, role, email }`.

**JWT payload:** `{ sub: userId, role, exp, iat }`.

**Auth decorator:** `@require_auth` extracts user from JWT, attaches to `g.user`, returns 401 if invalid.

---

### 2.5 Step 3: Trips

**Access rules:**
- **Learner:** Own trips only (`trip.user_id == g.user.id`)
- **Parent:** Trips where `trip.user_id IN (linked learner ids)`

**Endpoints:**
- `POST /api/trips` — Body: full trip object. Set `user_id = g.user.id` (learner). Upsert by id.
- `GET /api/trips` — Query: supervisorId, dateFrom, dateTo, nightOnly, dayOnly. Apply access rule.
- `GET /api/trips/:id` — Single trip; enforce access.
- `PATCH /api/trips/:id/approve` — Parent only; trip must belong to linked learner. Set approval_state, approved_by, approved_at.

**Field mapping:** App sends `learnerId`/`learnerName`; DB uses `user_id`. Map on read/write.

---

### 2.6 Step 4–5: Supervisors and Cars

**Both:** Filter by `user_id == g.user.id` for all operations. Parents typically don't manage supervisors/cars; learners do. If parent calls these, return empty or 403 — or allow if you want parents to manage shared data (simpler: restrict to learners).

---

### 2.7 Step 6: Pairing

- `POST /api/pair/create` — Learner only. Insert pairing_tokens row, return `{ token, expiresAt }`.
- `POST /api/pair/complete` — Parent only. Validate token, insert parent_links, delete token, return `{ success, learnerName }`.
- `GET /api/pair/linked` — Parent only. Return `[{ learnerId, learnerName }]` from parent_links + users.

---

### 2.8 Step 7: Logbook Summary

- `GET /api/logbook/summary` — Use same trip filtering as GET /api/trips (learner: own; parent: linked learners). Aggregate day_minutes, night_minutes, count. Return `{ totalHours, dayHours, nightHours, tripCount, targetHours, nightTargetHours, lastTripDate }`.

---

### 2.9 Step 8: Wire RealApiService

- Implement each method in `api.real.js` to call the Flask endpoints.
- Store token after login/register; send `Authorization: Bearer <token>`.
- Set `USE_MOCK = false` in config.js.
- Set `API_BASE_URL` to backend URL (e.g. `http://localhost:5000`).
- Enable CORS in Flask for the app origin.

---

### 2.10 CORS and Deployment

**Flask CORS:**
```python
from flask_cors import CORS
CORS(app, origins=['http://localhost:3000', 'http://localhost:5173'])
```

**Run backend:** `cd backend && python run.py` (or `flask run`). Default port 5000.

---

## Part 3: Database Schema Reference

**Canonical schema:** `docs/api-and-database-design.md` Section 4 — SQLite schema (updated)

The schema includes:
- `PRAGMA foreign_keys = ON`
- ON DELETE CASCADE/SET NULL on foreign keys
- `parent_links` CHECK (parent_id != learner_id)
- `trips` with car_name, learner_name, cloud_id, start_lat/lng, odo_distance_km, version
- Composite indexes for common query patterns (user_id + status, user_id + approval_state, etc.)

---

## Part 4: Checklist

**Code fix (mock):**
- [ ] getLogbookSummary: filter completed trips by user role and linked learners before aggregating

**Flask implementation:**
- [ ] Scaffold: app.py, config, db.py, requirements.txt
- [ ] Auth: register, login, me, JWT
- [ ] Trips: sync, list, get, approve
- [ ] Supervisors CRUD
- [ ] Cars CRUD
- [ ] Pairing: create, complete, linked
- [ ] Logbook summary
- [ ] api.real.js implementations
- [ ] CORS, USE_MOCK = false, test end-to-end
