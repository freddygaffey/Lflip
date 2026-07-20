# Lflip Load Test (4 vCPU server, gunicorn 4 workers, SQLite)

Target: p95 ≤ 2.00 s, zero errors.

## Scenario: mixed (ramp)

| Concurrency | Req/s | p50 | p95 | p99 | Max | Failures |
|---|---|---|---|---|---|---|
| 10 | 99.0 | 73 ms | 205 ms | 331 ms | 331 ms | 0 |
| 25 | 121.7 | 115 ms | 518 ms | 1.30 s | 1.47 s | 0 |
| 50 | 141.3 | 156 ms | 1.11 s | 1.47 s | 2.26 s | 0 |
| 75 | 151.7 | 212 ms | 1.36 s | 2.08 s | 2.61 s | 0 |
| 100 | 136.5 | 374 ms | 2.02 s | 4.05 s | 5.13 s | 0 |
| 150 | 91.4 | 823 ms | 4.38 s | 6.83 s | 10.91 s | 0 |
| 200 | 69.2 | 1.46 s | 7.36 s | 11.59 s | 16.81 s | 0 |
| 300 | 39.2 | 2.80 s | 16.79 s | 26.38 s | 40.50 s | 3 (0.1%) |

## Server resources during the test

Sampled 190 points on the API host.

| Resource | Peak | Ceiling |
|---|---|---|
| Busiest single core | 100.0% | 100% |
| Average CPU (all cores) | 63.3% (mean 14.0%) | 100% |
| Memory | 11.3% (idle 8.5%) | 100% |
| CPU io-wait (disk stall) | 3.5% | 100% |
| Disk write | 7.54 MB/s | disk-dependent |
| Network out | 22.53 MB/s | link-dependent |
| Load average (1 min) | 0.74 | ≈ core count |
| TCP connections | 465 | fd limit |
