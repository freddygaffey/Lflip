# Lflip Load Test — Phase 2 Baseline

## Method

The API was driven with a stepped-concurrency load generator (`loadtest.py`). Each level fires a fixed number of requests spread across the target concurrency and records throughput, latency percentiles and failures by HTTP status. Scenarios cover a static route, authenticated reads, a write path, and a mixed realistic traffic blend. The pass target (SLA) is p95 ≤ 2.00 s with zero errors.

## Scenario: mixed (ramp)

| Concurrency | Req/s | p50 | p95 | p99 | Max | Failures |
|---|---|---|---|---|---|---|
| 10 | 77.9 | 103 ms | 213 ms | 282 ms | 282 ms | 0 |
| 25 | 99.4 | 221 ms | 366 ms | 498 ms | 611 ms | 0 |
| 50 | 84.4 | 475 ms | 961 ms | 1.99 s | 2.76 s | 0 |
| 75 | 76.5 | 916 ms | 1.19 s | 1.70 s | 2.86 s | 0 |
| 100 | 65.2 | 1.28 s | 3.40 s | 4.77 s | 6.45 s | 0 |
| 150 | 44.4 | 2.60 s | 8.43 s | 12.25 s | 16.70 s | 6 (0.4%) |
| 200 | 21.8 | 4.47 s | 30.01 s | 30.43 s | 32.04 s | 377 (18.9%) |

**Findings**

- Peak throughput **99.4 req/s** at 25 concurrent.
- p95 stayed within the 2.00 s SLA (zero errors) up to **75 concurrent** (p95 1.19 s).
- Zero failed requests up to **100 concurrent**.
- First errors at **150 concurrent** (6 of 1500; {'500': 6}).
- **Ceiling: 200 concurrent** (18.9% failed; {'ReadTimeout': 82, 'ConnectTimeout': 289, '500': 6}).

## Interpretation & next steps

- Throughput rising then plateauing while latency climbs is server saturation, not client limits — requests queue rather than fail.
- The write path degrades first: each trip upload inserts many GPS rows and SQLite serialises writers on a single lock, producing the first server (500) errors under contention.
- Improvements identified: serve Flask via gunicorn with multiple workers; batch GPS inserts to shorten the write lock; migrate to PostgreSQL if concurrent write volume grows.
