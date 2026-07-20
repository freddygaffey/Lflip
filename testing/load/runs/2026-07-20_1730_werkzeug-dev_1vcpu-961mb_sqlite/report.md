# Lflip Load Test — Werkzeug dev server, 1 vCPU / 961 MB, SQLite

Target: p95 ≤ 2.00 s, zero errors.

## Scenario: mixed (ramp)

| Concurrency | Req/s | p50 | p95 | p99 | Max | Failures |
|---|---|---|---|---|---|---|
| 10 | 66.9 | 136 ms | 223 ms | 358 ms | 358 ms | 0 |
| 25 | 82.8 | 272 ms | 425 ms | 744 ms | 1.04 s | 0 |
| 50 | 78.9 | 534 ms | 824 ms | 1.25 s | 3.23 s | 0 |
| 75 | 67.2 | 974 ms | 2.06 s | 3.84 s | 5.95 s | 0 |
| 100 | 59.2 | 1.59 s | 2.08 s | 3.03 s | 5.27 s | 0 |
| 150 | 43.6 | 3.00 s | 6.58 s | 9.02 s | 16.77 s | 4 (0.3%) |
| 200 | 26.0 | 8.04 s | 8.05 s | 19.53 s | 34.11 s | 1061 (53.0%) |

## Server resources during the test

Sampled 200 points on the API host.

| Resource | Peak | Ceiling |
|---|---|---|
| Busiest single core | 100.0% | 100% |
| Average CPU (all cores) | 100.0% (mean 50.0%) | 100% |
| Memory | 60.4% | 100% |
| CPU io-wait (disk stall) | 12.0% | 100% |
| Disk write | 4.92 MB/s | disk-dependent |
| Network out | 6.59 MB/s | link-dependent |
| Load average (1 min) | 2.99 | ≈ core count |
| TCP connections | 602 | fd limit |
