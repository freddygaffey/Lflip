# L-Plate Tracker — Backend Usage Guide

How to run, configure, and use the Flask backend API.

---

## 1. Prerequisites

- **Python 3.10+** installed and on PATH
- The `backend/` folder inside `cap_vibe/`

---

## 2. Install Dependencies

```bash
cd cap_vibe/backend
pip install -r requirements.txt
```

This installs:

| Package | Purpose |
|---------|---------|
| flask | Web framework |
| flask-cors | Cross-origin requests (so the React app can call the API) |
| pyjwt | JSON Web Token auth |
| bcrypt | Password hashing |

---

## 3. Start the Server

```bash
cd cap_vibe/backend
python run.py
```

The API starts at **http://localhost:5000**. You'll see:

```
 * Running on http://127.0.0.1:5000
 * Running on http://<your-ip>:5000
```

The SQLite database (`lplate.db`) is created automatically on first run.

---

## 4. Connect the React App

In `2_js/src/config.js`, change two things:

```js
export const USE_MOCK = false;                        // was true
export const API_BASE_URL = 'http://localhost:5000';  // your backend URL
```

If testing on a phone/emulator, use your computer's local IP instead of `localhost` (e.g. `http://192.168.1.50:5000`).

---

## 5. Configuration

Environment variables (optional — defaults work for development):

| Variable | Default | Purpose |
|----------|---------|---------|
| `LPLATE_DB` | `lplate.db` | Path to SQLite database file |
| `JWT_SECRET` | `change-me-in-production` | Secret key for signing JWTs |

Example:

```bash
set JWT_SECRET=my-super-secret-key
python run.py
```

---

## 6. API Endpoints Reference

All endpoints return JSON. Authenticated endpoints require the header:

```
Authorization: Bearer <token>
```

The token is returned by login/register and is valid for 7 days.

### 6.1 Auth

| Method | Endpoint | Auth | Body | Returns |
|--------|----------|------|------|---------|
| POST | `/api/auth/register` | No | `{ email, password, name, role, licenceNumber? }` | `{ token, userId, name, role }` |
| POST | `/api/auth/login` | No | `{ email, password }` | `{ token, userId, name, role }` |
| GET | `/api/auth/me` | Yes | — | `{ userId, name, role, email, licenceNumber }` |

- `role` must be `"learner"` or `"parent"`
- Password must be at least 6 characters

**Example — Register a learner:**

```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "email": "alex@example.com",
  "password": "secret123",
  "name": "Alex",
  "role": "learner"
}
```

### 6.2 Pairing (QR Code Flow)

| Method | Endpoint | Auth | Body | Returns |
|--------|----------|------|------|---------|
| POST | `/api/pair/create` | Learner | — | `{ token, expiresAt }` |
| POST | `/api/pair/complete` | Parent | `{ token }` | `{ success, learnerName }` |
| GET | `/api/pair/linked` | Parent | — | `[{ id, name }]` |
| DELETE | `/api/pair/linked/:learnerId` | Parent | — | `{ success }` |

**Flow:**
1. Learner calls `POST /api/pair/create` → gets a pairing code (e.g. `PAIR-7K9M2X4P`)
2. Learner shows the code as a QR code
3. Parent scans it and calls `POST /api/pair/complete` with the code
4. Accounts are now linked — parent can see the learner's trips

Pairing codes expire after 15 minutes.

### 6.3 Trips

| Method | Endpoint | Auth | Body | Returns |
|--------|----------|------|------|---------|
| POST | `/api/trips` | Learner | Trip object | `{ id, cloudId }` |
| GET | `/api/trips` | Yes | Query params (see below) | `Trip[]` |
| GET | `/api/trips/:id` | Yes | — | `Trip` |
| PATCH | `/api/trips/:id` | Learner | Partial trip | `Trip` |
| DELETE | `/api/trips/:id` | Learner | — | `{ success }` |
| PATCH | `/api/trips/:id/approve` | Parent | `{ approved: true/false }` | `{ success }` |

**Access rules:**
- Learners only see/edit/delete their own trips
- Parents only see trips from linked learners
- Only parents can approve/reject trips

**GET query filters:**

| Param | Type | Example |
|-------|------|---------|
| `supervisorId` | UUID | Filter by supervisor |
| `dateFrom` | Unix ms | Trips after this time |
| `dateTo` | Unix ms | Trips before this time |
| `nightOnly` | `1` | Only trips with night minutes |
| `dayOnly` | `1` | Only trips with day minutes |

**Trip object fields (camelCase):**

```
id, learnerId, learnerName, supervisorId, supervisorName,
carId, carName, cloudId, startTime, endTime,
startOdometer, endOdometer, startLat, startLng,
status, syncStatus, approvalState, approvedBy, approvedAt,
weather, gpsPoints, accelPoints, accelEvents,
distanceKm, odoDistanceKm, dayMinutes, nightMinutes,
maxSpeedKmh, avgSpeedKmh, odoSource, version
```

POST acts as an upsert — if a trip with the same `id` already exists, it updates it.

### 6.4 Supervisors

| Method | Endpoint | Auth | Body | Returns |
|--------|----------|------|------|---------|
| GET | `/api/supervisors` | Yes | — | `Supervisor[]` |
| POST | `/api/supervisors` | Yes | `{ name, licenceNumber?, relationship }` | `Supervisor` |
| PATCH | `/api/supervisors/:id` | Yes | `{ name?, licenceNumber?, relationship? }` | `Supervisor` |
| DELETE | `/api/supervisors/:id` | Yes | — | `{ success }` |

Each user only sees their own supervisors. Relationship must be one of: `Parent`, `Instructor`, `Friend`, `Other`.

### 6.5 Cars

| Method | Endpoint | Auth | Body | Returns |
|--------|----------|------|------|---------|
| GET | `/api/cars` | Yes | — | `Car[]` |
| POST | `/api/cars` | Yes | `{ name, numberPlate? }` | `Car` |
| PATCH | `/api/cars/:id` | Yes | `{ name?, numberPlate?, lastOdometer?, esp32DeviceId? }` | `Car` |
| DELETE | `/api/cars/:id` | Yes | — | `{ success }` |

Each user only sees their own cars.

### 6.6 Logbook Summary

| Method | Endpoint | Auth | Returns |
|--------|----------|------|---------|
| GET | `/api/logbook/summary` | Yes | `LogbookSummary` |

**Response:**

```json
{
  "totalHours": 12.5,
  "dayHours": 10.0,
  "nightHours": 2.5,
  "tripCount": 8,
  "targetHours": 120,
  "nightTargetHours": 20,
  "lastTripDate": 1700003600000
}
```

- Learner: summary of their own completed trips
- Parent: summary across all linked learners' completed trips

### 6.7 Devices (Optional)

| Method | Endpoint | Auth | Body | Returns |
|--------|----------|------|------|---------|
| POST | `/api/devices/register` | Yes | `{ mac }` | `{ success }` |

Placeholder for ESP32/BLE device registration.

---

## 7. Error Responses

All errors return JSON with an `error` field:

```json
{ "error": "Invalid email or password" }
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request (missing fields, validation error) |
| 401 | Not authenticated (missing/invalid/expired token) |
| 403 | Forbidden (wrong role, not your resource) |
| 404 | Resource not found |
| 409 | Conflict (e.g. email already registered) |

---

## 8. Database

- **Engine:** SQLite (file-based, no server needed)
- **File:** `backend/lplate.db` (created on first run)
- **Schema:** Defined in `backend/db.py`, matches `docs/api-and-database-design.md`

To reset the database (delete all data and start fresh):

```bash
cd cap_vibe/backend
del lplate.db
python run.py
```

To inspect the database:

```bash
cd cap_vibe/backend
python -c "import sqlite3; c=sqlite3.connect('lplate.db'); print([t[0] for t in c.execute('SELECT name FROM sqlite_master WHERE type=\"table\"').fetchall()])"
```

---

## 9. File Structure

```
backend/
├── app.py              # All API routes
├── auth.py             # JWT token creation, validation, @require_auth decorator
├── config.py           # Configuration (DB path, JWT secret, target hours)
├── db.py               # Database schema, init_db(), get_db()
├── requirements.txt    # Python dependencies
└── run.py              # Entry point: python run.py
```

---

## 10. Quick Start Checklist

1. `cd cap_vibe/backend`
2. `pip install -r requirements.txt`
3. `python run.py` — server starts on port 5000
4. In `2_js/src/config.js`, set `USE_MOCK = false` and `API_BASE_URL = 'http://localhost:5000'`
5. Start the React app (`cd 2_js && npm run dev`)
6. Register an account and start using the app with real data
