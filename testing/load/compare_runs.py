#!/usr/bin/env python3
# AI generated
"""Compare archived load-test runs side by side.

  python3 compare_runs.py --all --out comparison.html
  python3 compare_runs.py runs/2026-..._1vcpu runs/2026-..._4vcpu --out comparison.html

Each run contributes one line per chart, so hardware/stack changes can be read
off directly. Runs are matched on the concurrency levels they share; levels a
run didn't test are simply absent from its line.
"""
import argparse, json, os, re, sys
import report_gen as rg

PALETTE = ["#2a78d6", "#008300", "#e87ba4", "#d97706", "#7c3aed", "#0891b2"]

ap = argparse.ArgumentParser()
ap.add_argument("runs", nargs="*", help="run directories")
ap.add_argument("--all", action="store_true", help="every run under --runs-dir")
ap.add_argument("--runs-dir", default="runs")
ap.add_argument("--out", default="comparison.html")
ap.add_argument("--sla-ms", type=float, default=2000)
a = ap.parse_args()

dirs = a.runs
if a.all:
    dirs = sorted(os.path.join(a.runs_dir, d) for d in os.listdir(a.runs_dir)
                  if os.path.isdir(os.path.join(a.runs_dir, d)))
if not dirs:
    sys.exit("no runs given (use --all or list run directories)")

runs = []
for d in dirs:
    try:
        meta = json.load(open(os.path.join(d, "meta.json")))
        results = json.load(open(os.path.join(d, "results.json")))
    except FileNotFoundError:
        print(f"skipping {d}: missing meta.json/results.json")
        continue
    srv = meta.get("server", {})
    stack = meta.get("stack", {})
    app = stack.get("app_server", "?").split("(")[0].strip()
    low = app.lower()
    if "gunicorn" in low:
        m = re.search(r"(\d+)\s+(?:sync\s+)?worker", low)
        app = f"gunicorn {m.group(1)}w" if m else "gunicorn"
    elif "werkzeug" in low:
        app = "Werkzeug"
    cores = srv.get("cores", "?")
    label = f"{cores} core, {app}"
    stamp = next((p for p in os.path.basename(d).split("_") if p.isdigit() and len(p) == 4), "")
    runs.append({"dir": d, "name": os.path.basename(d), "meta": meta, "results": results,
                 "label": label, "stamp": stamp, "srv": srv, "stack": stack})

# only fall back to clock time where two runs really are the same config
seen = {}
for r in runs:
    seen.setdefault(r["label"], []).append(r)
for label, group in seen.items():
    if len(group) > 1:
        for r in group:
            r["label"] = f"{label} ({r['stamp']})"

if not runs:
    sys.exit("no usable runs")

# Resource use per load step: the sampler records a continuous timeseries, so
# each step's window (t_start..t_end) is averaged to give one point per level.
# Runs recorded before loadtest.py logged per-step timestamps are skipped.
for run in runs:
    run["res"] = {}
    mpath = os.path.join(run["dir"], "metrics.csv")
    if not os.path.exists(mpath):
        continue
    try:
        m = rg.load_metrics(mpath)
    except Exception:
        continue
    t0, samples = m.get("t0"), m.get("samples", [])
    if not t0 or not samples:
        continue
    run["peak_cpu"] = m.get("cpu_max")
    run["peak_mem"] = m.get("mem_max")
    for step in run["results"]:
        ts, te = step.get("t_start"), step.get("t_end")
        if not ts or not te:
            continue
        lo, hi = ts - t0, te - t0
        win = [s for s in samples if lo <= s["t"] <= hi]
        if not win:
            continue
        def avg(key):
            vals = [s[key] for s in win if s.get(key) is not None]
            return round(sum(vals) / len(vals), 1) if vals else None
        run["res"][step["conc"]] = {"cpu": avg("cpu"), "mem": avg("mem"),
                                    "load1": avg("load1"), "est": avg("est")}

# one row per concurrency level, one column per run
levels = sorted({r["conc"] for run in runs for r in run["results"]})
def rows_for(field):
    out = []
    for c in levels:
        row = {"conc": c}
        for i, run in enumerate(runs):
            hit = next((r for r in run["results"] if r["conc"] == c), None)
            if hit:
                row[f"r{i}"] = hit[field]
        out.append(row)
    # keep every level any run reached; lines end where that run's data ends
    return out

series = [(f"r{i}", run["label"]) for i, run in enumerate(runs)]
rg.SERIES = PALETTE

charts = []
for field, title, fmt, logy in (
    ("rps", "Throughput vs concurrency", lambda t: f"{t:g}", False),
    ("p95_ms", "p95 latency vs concurrency (log scale)", lambda t: rg.ms(t), True),
    ("p50_ms", "p50 latency vs concurrency (log scale)", lambda t: rg.ms(t), True),
):
    rows = rows_for(field)
    if len(rows) >= 2:
        charts.append(rg._line_chart(rows, series, title, fmt, logy=logy))

# error rate needs computing rather than reading straight off
err_rows = []
for c in levels:
    row = {"conc": c}
    for i, run in enumerate(runs):
        hit = next((r for r in run["results"] if r["conc"] == c), None)
        if hit:
            row[f"r{i}"] = round(100 * hit["fails"] / hit["n"], 2)
    err_rows.append(row)
if len(err_rows) >= 2:
    charts.append(rg._line_chart(err_rows, series, "Error rate vs concurrency (%)",
                                 lambda t: f"{t:g}%"))


def res_rows(key):
    out = []
    for c in levels:
        row = {"conc": c}
        for i, run in enumerate(runs):
            v = run["res"].get(c, {}).get(key)
            if v is not None:
                row[f"r{i}"] = v
        out.append(row)
    return out if any(len(r) > 1 for r in out) else []


for key, title, fmt, fixed in (
    ("cpu", "Server CPU during test (%) — 100% = saturated", lambda t: f"{t:g}%", 100),
    ("mem", "Server memory during test (%)", lambda t: f"{t:g}%", 100),
    ("est", "Open TCP connections on server", lambda t: f"{t:g}", None),
):
    rows = res_rows(key)
    if len(rows) >= 2:
        charts.append(rg._line_chart(rows, series, title, fmt, ymax_fixed=fixed))


def summarise(run):
    rs = run["results"]
    peak = max(rs, key=lambda r: r["rps"])
    ok = [r for r in rs if r["fails"] == 0 and r["p95_ms"] <= a.sla_ms]
    worst = max(rs, key=lambda r: r["conc"])
    return {
        "peak_rps": peak["rps"], "peak_at": peak["conc"],
        "sla_to": max((r["conc"] for r in ok), default=None),
        "worst_conc": worst["conc"],
        "worst_fail_pct": round(100 * worst["fails"] / worst["n"], 1),
    }


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


hdr = "".join(f"<th>{esc(r['label'])}</th>" for r in runs)
def row(lbl, fn):
    return f"<tr><th>{lbl}</th>" + "".join(f"<td>{esc(fn(r))}</td>" for r in runs) + "</tr>"

s = [summarise(r) for r in runs]
table = f"""<table><thead><tr><th>—</th>{hdr}</tr></thead><tbody>
{row("Run", lambda r: r["name"])}
{row("Cores", lambda r: r["srv"].get("cores", "?"))}
{row("Memory (MB)", lambda r: r["srv"].get("mem_mb", "?"))}
{row("App server", lambda r: r["stack"].get("app_server", "?"))}
{row("Database", lambda r: r["stack"].get("database", "?"))}
{row("Client", lambda r: r["meta"].get("client", {}).get("host", "?"))}
{row("Peak req/s", lambda r: f"{summarise(r)['peak_rps']} @ c={summarise(r)['peak_at']}")}
{row("SLA-clean to", lambda r: (f"c={summarise(r)['sla_to']}" if summarise(r)["sla_to"] else "—"))}
{row("Failures at max c", lambda r: f"{summarise(r)['worst_fail_pct']}% @ c={summarise(r)['worst_conc']}")}
{row("Peak CPU", lambda r: f"{r.get('peak_cpu', r['meta'].get('peaks', {}).get('cpu_pct', '?'))}%")}
{row("Peak memory", lambda r: f"{r['peak_mem']}%" if r.get("peak_mem") is not None else "-")}
{row("Peak load avg", lambda r: r["meta"].get("peaks", {}).get("load1", "?"))}
{row("Peak TCP conns", lambda r: r["meta"].get("peaks", {}).get("tcp_established", "?"))}
</tbody></table>"""

html = f"""<!doctype html><meta charset="utf-8"><title>Load test comparison</title>
<style>
 body{{font:15px/1.55 -apple-system,system-ui,sans-serif;max-width:820px;margin:2rem auto;padding:0 1rem;color:#111;background:#fff}}
 h1{{font-size:1.5rem}} table{{border-collapse:collapse;width:100%;margin:1rem 0;font-size:14px}}
 th,td{{border:1px solid #ddd;padding:6px 9px;text-align:left;vertical-align:top}}
 thead th{{background:#f4f4f2}} tbody th{{background:#fafaf8;font-weight:600;white-space:nowrap}}
 figure{{margin:1.5rem 0}} svg{{width:100%;height:auto}}
 @media print{{body{{max-width:none}}}}
</style>
<h1>Load test comparison</h1>
{table}
{"".join(f"<figure>{c}</figure>" for c in charts)}
"""
with open(a.out, "w") as f:
    f.write(html)
print(f"wrote {a.out} ({len(runs)} runs, {len(charts)} charts)")
for r, sm in zip(runs, s):
    print(f"  {r['label']:28s} peak {sm['peak_rps']:>6} req/s @ c={sm['peak_at']}")
