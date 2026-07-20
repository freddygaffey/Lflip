# Lflip Load Test — Werkzeug dev server, 1 vCPU / 961 MB, SQLite

Target: p95 ≤ 2.00 s, zero errors.

## Scenario: mixed (ramp)

| Concurrency | Req/s | p50 | p95 | p99 | Max | Failures |
|---|---|---|---|---|---|---|
| 10 | 93.2 | 85 ms | 226 ms | 231 ms | 231 ms | 0 |
| 25 | 73.1 | 276 ms | 573 ms | 1.29 s | 1.57 s | 0 |
| 50 | 82.6 | 522 ms | 930 ms | 1.25 s | 1.71 s | 0 |
| 75 | 82.3 | 853 ms | 1.10 s | 1.87 s | 3.64 s | 0 |
| 100 | 65.7 | 1.36 s | 2.29 s | 4.32 s | 6.51 s | 2 (0.2%) |
| 150 | 49.7 | 2.63 s | 5.57 s | 7.61 s | 9.14 s | 3 (0.2%) |
| 200 | 22.4 | 7.78 s | 19.42 s | 30.51 s | 33.98 s | 1194 (59.7%) |

## Server resources during the test

Sampled 200 points on the API host.

| Resource | Peak | Ceiling |
|---|---|---|
| Busiest single core | 100.0% | 100% |
| Average CPU (all cores) | 100.0% (mean 45.3%) | 100% |
| Memory | 63.0% | 100% |
| CPU io-wait (disk stall) | 6.0% | 100% |
| Disk write | 6.84 MB/s | disk-dependent |
| Network out | 6.33 MB/s | link-dependent |
| Load average (1 min) | 3.65 | ≈ core count |
| TCP connections | 481 | fd limit |
