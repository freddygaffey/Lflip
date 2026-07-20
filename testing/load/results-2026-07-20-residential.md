# Load test — phase 1 baseline (2026-07-20)

Client: MacBook on a residential connection (client-side bandwidth/queuing limits
apply at c≥25; phase 2 will re-run from a VPS for higher clean throughput).
Target: production API `https://dev.lflip.pebnum.com` (Flask behind nginx, SQLite).
Test account: `loadtest.lflip@example.com` seeded with 20 trips × 60 GPS points.
Tool: `loadtest_run.py` (thread-pool, stepped concurrency).

| Scenario | Concurrency | Requests | Req/s | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) | Failures |
|---|---|---|---|---|---|---|---|---|
| static GET / | 1 | 50 | 16.3 | 49.9 | 136.0 | 158.2 | 158.2 | 0 |
| static GET / | 10 | 100 | 129.7 | 66.8 | 151.1 | 159.0 | 159.0 | 0 |
| static GET / | 25 | 250 | 225.8 | 95.2 | 202.7 | 220.5 | 223.6 | 0 |
| static GET / | 50 | 500 | 221.0 | 217.1 | 314.6 | 360.4 | 392.2 | 0 |
| authed GET /api/trips | 1 | 50 | 15.3 | 54.7 | 139.7 | 142.9 | 142.9 | 0 |
| authed GET /api/trips | 10 | 100 | 99.5 | 83.8 | 160.5 | 177.0 | 177.0 | 0 |
| authed GET /api/trips | 25 | 250 | 124.9 | 191.5 | 266.5 | 309.8 | 317.4 | 0 |
| authed GET /api/trips | 50 | 500 | 140.0 | 339.0 | 439.6 | 504.5 | 532.1 | 0 |
| authed GET gps (60 pts) | 1 | 50 | 15.2 | 55.1 | 139.7 | 143.1 | 143.1 | 0 |
| authed GET gps (60 pts) | 10 | 100 | 100.6 | 81.9 | 174.1 | 191.0 | 191.0 | 0 |
| authed GET gps (60 pts) | 25 | 250 | 119.7 | 201.1 | 273.7 | 296.3 | 313.7 | 0 |
| authed GET gps (60 pts) | 50 | 500 | 128.6 | 382.8 | 507.3 | 528.6 | 626.3 | 0 |
| write push_trip (60 gps) | 1 | 10 | 11.7 | 71.4 | 152.0 | 152.0 | 152.0 | 0 |
| write push_trip (60 gps) | 5 | 50 | 35.9 | 114.9 | 235.0 | 317.8 | 317.8 | 0 |
| write push_trip (60 gps) | 10 | 100 | 41.6 | 188.4 | 570.7 | 722.6 | 722.6 | 0 |

## Observations

- **Zero failed requests across 2,510 requests** at up to 50 concurrent clients —
  the server stayed stable and degraded gracefully (latency rose, nothing broke).
- Reads plateau around ~125–140 req/s at c=25–50 while p50 latency roughly
  doubles per step — classic single-worker queuing (Flask dev server handles
  requests with limited parallelism), not errors.
- Writes are the slowest path (~42 req/s at c=10, p95 571 ms): each push_trip
  inserts 1 trip + 60 GPS rows and SQLite serialises writers on a single lock.
- Static root outpaces DB-backed routes (~226 vs ~125 req/s), isolating the
  database/Python layer, not nginx or TLS, as the bottleneck.
- Expected vs actual: target was "no failures and p95 < 1 s at 50 concurrent
  users" — met with p95 ≤ 507 ms on all read scenarios.

## Identified improvements (for evaluation section)

1. Serve Flask via gunicorn with multiple workers instead of `app.run`.
2. SQLite → PostgreSQL if concurrent write volume mattered at real scale.
3. Batch-insert GPS points (`bulk_save_objects`) to shorten the write lock.
