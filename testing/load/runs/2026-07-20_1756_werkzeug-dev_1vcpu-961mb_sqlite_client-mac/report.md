# Lflip Load Test (Werkzeug dev server, 1 vCPU, 961 MB, SQLite)

Target: p95 ≤ 2.00 s, zero errors.

## Scenario: mixed (ramp)

| Concurrency | Req/s | p50 | p95 | p99 | Max | Failures |
|---|---|---|---|---|---|---|
| 10 | 78.8 | 105 ms | 215 ms | 328 ms | 328 ms | 0 |
| 25 | 95.3 | 211 ms | 430 ms | 617 ms | 813 ms | 0 |
| 50 | 95.2 | 506 ms | 687 ms | 964 ms | 1.46 s | 0 |
| 75 | 85.9 | 805 ms | 1.10 s | 2.17 s | 3.21 s | 0 |
| 100 | 67.0 | 1.41 s | 1.80 s | 2.84 s | 3.71 s | 0 |
| 150 | 49.0 | 2.50 s | 6.78 s | 11.41 s | 17.95 s | 5 (0.3%) |
| 200 | 21.1 | 4.90 s | 30.36 s | 30.64 s | 30.71 s | 450 (22.5%) |

## Server resources during the test

Sampled 208 points on the API host.

| Resource | Peak | Ceiling |
|---|---|---|
| Busiest single core | 100.0% | 100% |
| Average CPU (all cores) | 100.0% (mean 52.1%) | 100% |
| Memory | 62.1% (idle 58.0%) | 100% |
| CPU io-wait (disk stall) | 7.0% | 100% |
| Disk write | 5.73 MB/s | disk-dependent |
| Network out | 7.9 MB/s | link-dependent |
| Swap in use | 157.5 MiB | 0 ideally |
| Load average (1 min) | 2.1 | ≈ core count |
| TCP connections | 604 | fd limit |
