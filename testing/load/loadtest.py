# AI generated
"""Load test for the Lflip API — setup + stepped-concurrency test in one.

Usage:
  python3 loadtest.py                          # defaults: prod API, levels 1,10,25,50
  python3 loadtest.py --levels 1,25,100,200    # VPS run
  python3 loadtest.py --ramp                   # stress: ramp until the server fails
  python3 loadtest.py --base http://127.0.0.1:5000

Creates/reuses a dedicated load-test account, seeds 20 trips x 60 GPS points,
then runs each scenario at stepped concurrency:
  - static GET /
  - authed GET /api/trips
  - authed GET /api/trips/<id>/gps   (random trip each request)
  - write POST /api/trips/push_trip  (60 gps points)
  - mixed: each request randomly picks an endpoint with realistic weights
Records throughput, latency p50/p95/p99/max and failures; writes
loadtest_results.json and prints a markdown table for the report.
"""
import argparse, json, random, statistics, sys, time
from concurrent.futures import ThreadPoolExecutor
import requests

ap = argparse.ArgumentParser()
ap.add_argument("--base", default="https://dev.lflip.pebnum.com")
ap.add_argument("--email", default="loadtest.lflip@example.com")
ap.add_argument("--pwd", default="LoadTest!2026x")
ap.add_argument("--trips", type=int, default=20, help="trips to seed")
ap.add_argument("--levels", default="1,10,25,50", help="concurrency for read scenarios")
ap.add_argument("--write-levels", default="1,5,10", help="concurrency for write scenario")
ap.add_argument("--no-wipe", action="store_true",
                help="keep existing trips instead of resetting to a fresh seed")
ap.add_argument("--ramp", action="store_true",
                help="stress mode: ramp mixed-traffic concurrency until the server fails")
ap.add_argument("--max-p95-ms", type=float, default=15000,
                help="ramp stops when p95 exceeds this (0 = never, run to fail_pct)")
ap.add_argument("--fail-pct", type=float, default=2.0,
                help="ramp stops when this %% of requests fail (default 2)")
args = ap.parse_args()

BASE = args.base

# ---------- setup: account, seed data, token ----------

s = requests.Session()
r = s.post(f"{BASE}/api/register", json={
    "email": args.email, "pwd": args.pwd, "f_name": "Load", "l_name": "Test"}, timeout=15)
if r.status_code == 200:
    print("registered new load-test account")

r = s.post(f"{BASE}/api/login", json={"email": args.email, "password": args.pwd}, timeout=15)
if r.status_code != 200:
    print("login failed:", r.status_code, r.text[:200]); sys.exit(1)
H = {"Authorization": f"Bearer {r.json()['token']}"}

s.post(f"{BASE}/api/set_licence", json={"state": "act", "licence_no": "1234567890"},
       headers=H, timeout=15)

# reset to a known state so runs are comparable (writes during a test accumulate)
if not args.no_wipe:
    s.delete(f"{BASE}/api/trips", headers=H, timeout=60)
    print("wiped existing trips")

trips = s.get(f"{BASE}/api/trips", headers=H, timeout=15).json()
print(f"existing trips: {len(trips)}")
if len(trips) < args.trips:
    now = int(time.time() * 1000)
    for t in range(args.trips - len(trips)):
        start = now - (t + 1) * 86_400_000
        gps = [{"speed": random.uniform(0, 22), "lat": -35.28 + random.uniform(-0.05, 0.05),
                "lon": 149.13 + random.uniform(-0.05, 0.05), "time": start + i * 1000}
               for i in range(60)]
        trip = {"start_time": start, "end_time": start + 60_000,
                "start_odo": 1000 + t * 10, "end_odo": 1005 + t * 10,
                "day": t % 3 != 0, "weather": "clear", "gps": gps}
        r = s.post(f"{BASE}/api/trips/push_trip", json={"trip": trip}, headers=H, timeout=30)
        if r.status_code != 200:
            print("seed failed:", r.status_code, r.text[:200]); sys.exit(1)
    trips = s.get(f"{BASE}/api/trips", headers=H, timeout=15).json()
    print(f"seeded to {len(trips)} trips")
TRIP_IDS = [t["id"] for t in trips]

# ---------- request makers ----------

def write_payload():
    start = 1600000000000 + random.randrange(10**9)
    gps = [{"speed": random.uniform(0, 22), "lat": -35.28, "lon": 149.13,
            "time": start + j * 1000} for j in range(60)]
    return {"trip": {"start_time": start, "end_time": start + 60_000,
                     "start_odo": 1, "end_odo": 2, "day": True,
                     "weather": "clear", "gps": gps}}

def req_static():  return ("GET", "/", None)
def req_trips():   return ("GET", "/api/trips", None)
def req_gps():     return ("GET", f"/api/trips/{random.choice(TRIP_IDS)}/gps", None)
def req_write():   return ("POST", "/api/trips/push_trip", write_payload())

# mixed traffic: rough shape of a real session (mostly reads, some writes)
MIX = [(req_static, 10), (req_trips, 40), (req_gps, 35), (req_write, 15)]
def req_mixed():
    pick = random.choices([f for f, w in MIX], weights=[w for f, w in MIX])[0]
    return pick()

def hit(maker):
    method, path, payload = maker()
    t0 = time.perf_counter()
    try:
        r = requests.request(method, f"{BASE}{path}", json=payload, headers=H, timeout=30)
        ok, code = r.status_code == 200, r.status_code
    except Exception as e:
        ok, code = False, type(e).__name__
    return (time.perf_counter() - t0) * 1000, ok, code

# ---------- runner ----------

def run(name, maker, n, conc):
    lat, fails, codes = [], 0, {}
    epoch_start = time.time()
    with ThreadPoolExecutor(max_workers=conc) as ex:
        t0 = time.perf_counter()
        futs = [ex.submit(hit, maker) for _ in range(n)]
        for f in futs:
            ms, ok, code = f.result()
            lat.append(ms)
            codes[str(code)] = codes.get(str(code), 0) + 1
            if not ok: fails += 1
        wall = time.perf_counter() - t0
    lat.sort()
    q = lambda p: lat[min(len(lat) - 1, int(p / 100 * len(lat)))]
    row = {"scenario": name, "conc": conc, "n": n,
           "rps": round(n / wall, 1), "mean_ms": round(statistics.mean(lat), 1),
           "p50_ms": round(q(50), 1), "p95_ms": round(q(95), 1),
           "p99_ms": round(q(99), 1), "max_ms": round(max(lat), 1),
           "fails": fails, "codes": codes,
           "t_start": round(epoch_start, 3), "t_end": round(epoch_start + wall, 3)}
    print(f"{name:26s} c={conc:<3d} n={n:<4d} rps={row['rps']:>7} "
          f"p50={row['p50_ms']:>7} p95={row['p95_ms']:>8} max={row['max_ms']:>8} "
          f"fails={fails} {codes if fails else ''}", flush=True)
    return row

LEVELS = [int(x) for x in args.levels.split(",")]
WRITE_LEVELS = [int(x) for x in args.write_levels.split(",")]

RAMP_STEPS = [10, 25, 50, 75, 100, 150, 200, 300, 400, 500, 700, 1000]

def ramp():
    results = []
    for c in RAMP_STEPS:
        row = run("mixed (ramp)", req_mixed, max(100, c * 10), c)
        results.append(row)
        fail_rate = 100 * row["fails"] / row["n"]
        if fail_rate >= args.fail_pct:
            print(f"\nCEILING FOUND: {fail_rate:.1f}% of requests failed at "
                  f"c={c} (codes: {row['codes']})")
            prev = results[-2] if len(results) > 1 else None
            if prev:
                print(f"Last stable level: c={prev['conc']} "
                      f"({prev['rps']} req/s, p95 {prev['p95_ms']} ms, 0 fails)"
                      if prev["fails"] == 0 else
                      f"Previous level: c={prev['conc']} ({prev['fails']} fails)")
            break
        if args.max_p95_ms and row["p95_ms"] > args.max_p95_ms:
            print(f"\nCEILING FOUND: p95 latency {row['p95_ms']} ms at c={c} "
                  f"(requests queuing beyond usability, though none failed yet)")
            break
    else:
        print(f"\nNo ceiling found up to c={RAMP_STEPS[-1]} — server survived every level.")
    return results

results = []
if args.ramp:
    results = ramp()
else:
    for c in LEVELS:
        results.append(run("static GET /", req_static, max(50, c * 10), c))
    for c in LEVELS:
        results.append(run("authed GET /api/trips", req_trips, max(50, c * 10), c))
    for c in LEVELS:
        results.append(run("authed GET gps (random)", req_gps, max(50, c * 10), c))
    for c in WRITE_LEVELS:
        results.append(run("write push_trip (60 gps)", req_write, c * 10, c))
    for c in LEVELS:
        results.append(run("mixed realistic traffic", req_mixed, max(50, c * 10), c))

with open("loadtest_results.json", "w") as f:
    json.dump(results, f, indent=1)

print("\n| Scenario | Concurrency | Requests | Req/s | p50 (ms) | p95 (ms) | p99 (ms) | Max (ms) | Failures |")
print("|---|---|---|---|---|---|---|---|---|")
for r in results:
    print(f"| {r['scenario']} | {r['conc']} | {r['n']} | {r['rps']} | {r['p50_ms']} "
          f"| {r['p95_ms']} | {r['p99_ms']} | {r['max_ms']} | {r['fails']} |")
