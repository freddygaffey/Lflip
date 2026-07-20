#!/usr/bin/env python3
# AI generated
"""Archive one load-test run: results + server metrics + environment metadata.

The sampler (metrics_server.py local) runs continuously on the box and appends
to a single CSV. A "run" is just a time window sliced out of it, so runs never
need the sampler started/stopped around them.

  python3 archive_run.py --name 2026-07-20_1730_werkzeug_1vcpu \
      --start 17:29:40 --end 17:33:00 \
      --results ../../loadtest_results.json \
      --metrics-csv metrics_full.csv --stack "Werkzeug dev server (single process)"

Timestamps: the CSV's ts_local column is a unix epoch, which is unambiguous.
The server runs UTC while the client is AEST, so the iso column is rewritten to
Australia/Sydney on the way out and every run lines up on one clock.
"""
import argparse, csv, json, os, shutil, subprocess, sys
from datetime import datetime, date
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Australia/Sydney")

ap = argparse.ArgumentParser()
ap.add_argument("--name", required=True, help="run directory name")
ap.add_argument("--start", required=True, help="window start, local HH:MM:SS")
ap.add_argument("--end", required=True, help="window end, local HH:MM:SS")
ap.add_argument("--results", required=True, help="loadtest_results.json")
ap.add_argument("--metrics-csv", required=True, help="full metrics.csv pulled from the box")
ap.add_argument("--stack", required=True, help='e.g. "Werkzeug dev server (single process)"')
ap.add_argument("--target", default="https://dev.lflip.pebnum.com")
ap.add_argument("--notes", default="")
ap.add_argument("--runs-dir", default="runs")
ap.add_argument("--ssh-host", default="lflip", help="box under test, for capturing specs")
ap.add_argument("--client", default="macOS (Sydney ~13ms RTT)")
a = ap.parse_args()


def to_epoch(hms):
    h, m, s = (int(x) for x in hms.split(":"))
    return datetime.combine(date.today(), datetime.min.time(), TZ).replace(
        hour=h, minute=m, second=s).timestamp()


start, end = to_epoch(a.start), to_epoch(a.end)
out = os.path.join(a.runs_dir, a.name)
os.makedirs(out, exist_ok=True)

# --- slice metrics to the run window, restamping iso to local time ---
kept, peak_cpu, peak_conn, peak_load, max_iowait = [], 0.0, 0, 0.0, 0.0
with open(a.metrics_csv) as f:
    rd = csv.DictReader(f)
    fields = rd.fieldnames
    for row in rd:
        try:
            ts = float(row["ts_local"])
        except (TypeError, ValueError):
            continue
        if not (start <= ts <= end):
            continue
        row["iso"] = datetime.fromtimestamp(ts, TZ).strftime("%H:%M:%S")
        kept.append(row)
        for key, fn in (("cpu_pct", "cpu"), ("load1", "load"),
                        ("cpu_iowait", "iow"), ("tcp_established", "conn")):
            try:
                v = float(row.get(key) or 0)
            except ValueError:
                continue
            if fn == "cpu":
                peak_cpu = max(peak_cpu, v)
            elif fn == "load":
                peak_load = max(peak_load, v)
            elif fn == "iow":
                max_iowait = max(max_iowait, v)
            else:
                peak_conn = max(peak_conn, int(v))

if not kept:
    sys.exit(f"no metrics rows in {a.start}-{a.end}; check the window")

with open(os.path.join(out, "metrics.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    w.writerows(kept)

shutil.copy(a.results, os.path.join(out, "results.json"))
results = json.load(open(a.results))


def ssh(cmd, default="unknown"):
    try:
        return subprocess.run(["ssh", "-n", "-o", "ConnectTimeout=10", a.ssh_host, cmd],
                              capture_output=True, text=True, timeout=25).stdout.strip() or default
    except Exception:
        return default


def git(cmd):
    try:
        return subprocess.run(["git"] + cmd, capture_output=True, text=True,
                              timeout=10).stdout.strip() or "unknown"
    except Exception:
        return "unknown"


meta = {
    "run_name": a.name,
    "window_local": {"start": a.start, "end": a.end, "samples": len(kept)},
    "target": a.target,
    "server": {
        "host": a.ssh_host,
        "cores": ssh("nproc"),
        "mem_mb": ssh("free -m | awk '/^Mem:/{print $2}'"),
        "os": ssh(". /etc/os-release; echo $PRETTY_NAME"),
        "kernel": ssh("uname -r"),
        "python": ssh("/home/fred/venv/bin/python -V 2>&1 || python3 -V"),
        "nginx": ssh("nginx -v 2>&1"),
    },
    "stack": {"app_server": a.stack, "database": "SQLite", "reverse_proxy": "nginx"},
    "client": {"host": a.client, "ulimit_n": os.environ.get("ULIMIT_N", "4096")},
    "git_commit": git(["rev-parse", "--short", "HEAD"]),
    "peaks": {
        "cpu_pct": peak_cpu, "load1": peak_load,
        "max_iowait_pct": max_iowait, "tcp_established": peak_conn,
    },
    "results_summary": [
        {"conc": r["conc"], "rps": r["rps"], "p95_ms": r["p95_ms"], "fails": r["fails"]}
        for r in results
    ],
    "notes": a.notes,
}
with open(os.path.join(out, "meta.json"), "w") as f:
    json.dump(meta, f, indent=2)

print(f"archived -> {out}")
print(f"  {len(kept)} metric samples, {len(results)} load steps")
print(f"  peak cpu {peak_cpu}%  load {peak_load}  conns {peak_conn}  max io-wait {max_iowait}%")
