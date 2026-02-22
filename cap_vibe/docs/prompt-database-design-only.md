# Prompt: Design the Database Only

Copy and paste this prompt to an AI assistant to design the database schema. Do not implement Flask, API, or any application code — only the database design.

---

## Prompt

```
Design the SQLite database schema for the L-Plate Tracker app. Do not write Flask code or API endpoints — only the database: table definitions, columns, types, primary keys, foreign keys, indexes, and constraints.

## Domain

L-Plate Tracker is a learner driver logbook app. Users can be:
- **Learners** (L-plate drivers) — log trips, have supervisors and cars
- **Parents** — approve their kids' trips, linked to learners via QR pairing

## Entities and Rules

**Users**
- id, email (unique), password_hash, name, role ('learner' | 'parent'), licence_number (optional)
- Created at timestamp

**Trips**
- Each trip is created by a learner (user_id = learner)
- Fields: id, user_id (learner), supervisor_id, supervisor_name (denormalised), car_id (optional)
- start_time, end_time (unix ms), start_odometer, end_odometer (km)
- status (pending, active, stopped, complete), sync_status (unsynced, syncing, synced, error)
- approval_state (pending, approved, rejected), approved_by (user id), approved_at (unix ms)
- weather (sunny, overcast, rain, night)
- gps_points, accel_points, accel_events (JSON/TEXT)
- distance_km, day_minutes, night_minutes, max_speed_kmh, avg_speed_kmh
- odo_source (esp32 | manual)
- created_at, updated_at

**Supervisors**
- Belong to a learner (user_id). Each learner has their own list of supervisors (Mum, Dad, instructor, etc.)
- id, user_id, name, licence_number (optional), relationship (Parent | Instructor | Friend | Other)
- created_at

**Cars**
- Belong to a user (learner)
- id, user_id, name, number_plate, last_odometer, esp32_device_id (optional)
- created_at, updated_at

**Parent–learner pairing**
- Parent_links: links a parent to a learner so the parent can approve that learner's trips
- parent_id, learner_id, created_at
- Unique on (parent_id, learner_id)

**Pairing tokens**
- Short-lived tokens for QR pairing. Learner creates token; parent scans and completes pairing
- token (e.g. "PAIR-ABC12345", primary key), learner_id, expires_at (unix ms)
- Tokens expire after ~15 minutes

## Output format

Provide:
1. CREATE TABLE statements in correct order (respect foreign key dependencies)
2. CREATE INDEX statements for common lookups (e.g. trips by user_id, parent_links by parent_id)
3. Any CHECK constraints for enums (status, role, approval_state, etc.)

Use SQLite types: TEXT, INTEGER, REAL. For JSON data use TEXT. For timestamps use INTEGER (unix ms).
```
