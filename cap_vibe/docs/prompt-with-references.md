# Prompt Template — With Doc References

Use this prompt (or adapt it) when asking an AI to implement features. It tells the AI to read the project docs first.

---

## General Implementation Prompt

```
I'm building the L-Plate Tracker app (React + Capacitor, learner driver logbook with parent approval).

Before implementing, please read these docs in the cap_vibe project:

- docs/api-and-database-design.md — API endpoints, database schema (SQLite), request/response examples
- docs/code-review-and-flask-implementation-plan.md — Flask backend implementation order, access rules, what to build
- docs/implementation-order.md — Overall feature phases (approval, auth, pairing, backend, BLE)

Use them as the source of truth. Match the API contract and database schema exactly.

Now implement: [YOUR TASK HERE]
```

---

## For Flask Backend Only

```
Implement the Flask backend for L-Plate Tracker. Read these first:

1. docs/api-and-database-design.md — Section 4 has the full SQLite schema. Section 2 has all API endpoints. Section 3 has request/response examples.
2. docs/code-review-and-flask-implementation-plan.md — Steps 1–8, project structure, access rules for trips (learner vs parent).

Follow the schema and endpoint contracts. Use sqlite3 or SQLAlchemy. Enable PRAGMA foreign_keys = ON.
```

---

## For Frontend Changes (React)

```
I'm working on the L-Plate Tracker React app in cap_vibe/2_js/. 

Reference:
- docs/api-and-database-design.md — API contract (what the app will call)
- docs/implementation-order.md — Feature phases
- docs/project-state-and-qr-pairing-plan.md — QR pairing flow, mock API structure

The mock API is in src/services/api/api.mock.js. Match its interface when adding features.

[YOUR TASK]
```

---

## Quick Reference: What Each Doc Covers

| File | Contains |
|------|----------|
| `api-and-database-design.md` | DB schema, API endpoints, request/response examples |
| `code-review-and-flask-implementation-plan.md` | Flask steps 1–8, DB reference, CORS, checklist |
| `implementation-order.md` | Phase order: approval → auth → pairing → backend → BLE |
| `project-state-and-qr-pairing-plan.md` | QR pairing flow, mock API methods, web + native |
| `phase-1-2-3-prompt-plan.md` | Copy-paste prompts for approval, auth, role-based UI |
| `prompt-database-design-only.md` | Prompt to design DB schema only |
