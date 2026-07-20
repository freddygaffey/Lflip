# Lflip Load Test — Werkzeug dev server, 1 vCPU / 961 MB, SQLite

Target: p95 ≤ 2.00 s, zero errors.

## Scenario: mixed (ramp)

| Concurrency | Req/s | p50 | p95 | p99 | Max | Failures |
|---|---|---|---|---|---|---|
| 10 | 89.5 | 95 ms | 175 ms | 213 ms | 213 ms | 0 |
| 25 | 122.3 | 185 ms | 294 ms | 356 ms | 814 ms | 0 |
| 50 | 93.5 | 448 ms | 863 ms | 2.14 s | 2.78 s | 0 |
| 75 | 79.4 | 891 ms | 1.20 s | 1.63 s | 3.53 s | 0 |
| 100 | 66.4 | 1.41 s | 1.80 s | 2.25 s | 3.88 s | 0 |
| 150 | 49.6 | 2.37 s | 5.70 s | 8.26 s | 30.16 s | 3 (0.2%) |
| 200 | 22.7 | 9.07 s | 15.88 s | 30.68 s | 36.89 s | 1031 (51.5%) |

## Server resources during the test

Sampled 192 points on the API host.

| Resource | Peak | Ceiling |
|---|---|---|
| Busiest single core | 100.0% | 100% |
| Average CPU (all cores) | 100.0% (mean 49.8%) | 100% |
| Memory | 60.8% | 100% |
| CPU io-wait (disk stall) | 8.0% | 100% |
| Disk write | 4.86 MB/s | disk-dependent |
| Network out | 6.88 MB/s | link-dependent |
| Load average (1 min) | 3.02 | ≈ core count |
| TCP connections | 529 | fd limit |
