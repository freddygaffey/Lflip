#!/usr/bin/env python3
# AI generated
"""Generate a load-test report (Markdown, optionally HTML for PDF) from results.

Usage:
  python3 report_gen.py loadtest_results.json --out report.md \
          --title "Lflip Load Test — Phase 2 Baseline" --sla-ms 2000 \
          --metrics metrics.csv --html report.html

Reads the JSON written by loadtest.py (a list of per-run rows) and, optionally,
the CSV written by metrics_server.py, then derives:
  - peak throughput and the saturation "knee"
  - where errors begin and the failure ceiling
  - the highest concurrency meeting the p95 SLA
  - server-side resource peaks (per-core CPU, memory, disk write)
and writes an analytical report. --html additionally emits a standalone HTML
file that prints straight to PDF from any browser (Cmd/Ctrl-P -> Save as PDF).
"""
import argparse, csv, json, math, statistics
from collections import defaultdict


def load_results(path):
    with open(path) as f:
        rows = json.load(f)
    by_scenario = defaultdict(list)
    for r in rows:
        by_scenario[r["scenario"]].append(r)
    for rs in by_scenario.values():
        rs.sort(key=lambda r: r["conc"])
    return by_scenario


def analyse(rows, sla_ms):
    peak = max(rows, key=lambda r: r["rps"])
    err_onset = next((r for r in rows if r["fails"] > 0), None)
    ceiling = next((r for r in rows if r["n"] and 100 * r["fails"] / r["n"] >= 2.0), None)
    sla_ok = [r for r in rows if r["p95_ms"] <= sla_ms and r["fails"] == 0]
    sla_max = max(sla_ok, key=lambda r: r["conc"]) if sla_ok else None
    clean = [r for r in rows if r["fails"] == 0]
    clean_max = max(clean, key=lambda r: r["conc"]) if clean else None
    return {"peak": peak, "err_onset": err_onset, "ceiling": ceiling,
            "sla_max": sla_max, "clean_max": clean_max}


def load_metrics(path):
    with open(path) as f:
        raw = list(csv.DictReader(f))

    def num(r, name):
        v = r.get(name)
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    def busiest(r):
        vals = [float(v) for v in (r.get("cpu_per_core") or "").split(";") if v]
        return max(vals) if vals else num(r, "cpu_pct")

    t0 = num(raw[0], "ts_local") if raw else 0
    samples = []
    for r in raw:
        ts = num(r, "ts_local")
        samples.append({
            "t": int(ts - t0) if (ts is not None and t0 is not None) else 0,
            "cpu": num(r, "cpu_pct"),
            "core": busiest(r),
            "iowait": num(r, "cpu_iowait"),
            "mem": num(r, "mem_pct"),
            "swap": num(r, "swap_used_mb"),
            "disk_w": num(r, "disk_write_mbps"),
            "net_s": num(r, "net_sent_mbps"),
            "load1": num(r, "load1"),
            "est": num(r, "tcp_established"),
        })

    def peak(key):
        xs = [s[key] for s in samples if s[key] is not None]
        return max(xs) if xs else None

    return {
        "samples": samples,
        "t0": t0,
        "n": len(samples),
        "cpu_max": peak("cpu"),
        "cpu_mean": round(statistics.mean([s["cpu"] for s in samples if s["cpu"] is not None]), 1)
                    if any(s["cpu"] is not None for s in samples) else None,
        "core_max": round(peak("core"), 1) if peak("core") is not None else None,
        "iowait_max": round(peak("iowait"), 1) if peak("iowait") is not None else None,
        "mem_max": peak("mem"),
        "mem_idle": samples[0]["mem"] if samples else None,
        "swap_max": round(peak("swap"), 1) if peak("swap") is not None else None,
        "disk_write_max": round(peak("disk_w"), 2) if peak("disk_w") is not None else None,
        "net_sent_max": round(peak("net_s"), 2) if peak("net_s") is not None else None,
        "load_max": peak("load1"),
        "est_max": int(peak("est")) if peak("est") is not None else None,
    }


def step_bands(metrics, results):
    """Map each load step's wall-clock window onto sample indices."""
    rows, t0 = metrics["samples"], metrics.get("t0")
    if not t0 or not rows:
        return []
    times = [s["t"] for s in rows]

    def idx(epoch):
        want = epoch - t0
        best, bd = 0, None
        for i, t in enumerate(times):
            d = abs(t - want)
            if bd is None or d < bd:
                best, bd = i, d
        return best

    bands = []
    for r in results:
        if r.get("t_start") is None or r.get("t_end") is None:
            continue
        i0, i1 = idx(r["t_start"]), idx(r["t_end"])
        if i1 > i0:
            bands.append({"i0": i0, "i1": i1, "conc": r["conc"], "rps": r["rps"]})
    return bands


def rps_over_time(metrics, results):
    """req/s on the same seconds-into-test axis as the utilisation chart."""
    rows, t0 = metrics["samples"], metrics.get("t0")
    if not t0 or len(rows) < 2:
        return ""
    steps = [r for r in results if r.get("t_start") and r.get("t_end")]
    if not steps:
        return ""
    pts = []
    for s in rows:
        abs_t = t0 + s["t"]
        rps = 0
        for r in steps:
            if r["t_start"] <= abs_t <= r["t_end"]:
                rps = r["rps"]
                break
        pts.append({"t": s["t"], "rps": rps})
    return _line_chart(pts, [("rps", "req/s")], "Throughput over time",
                       lambda v: f"{v:g}", xkey="t", xlabel="seconds into test",
                       markers=False)


def resource_charts(metrics, bands=None):
    rows = metrics["samples"]
    if len(rows) < 2:
        return ""
    # on a single-core box "busiest core" and "avg CPU" are the same line
    same = all(abs((s.get("core") or 0) - (s.get("cpu") or 0)) < 0.05 for s in rows)
    series = ([("cpu", "CPU")] if same
              else [("core", "busiest core"), ("cpu", "avg CPU")]) + [("mem", "memory")]
    if metrics.get("iowait_max") is not None:
        series.append(("iowait", "io-wait"))
    # keep only series that actually have data, cap at the validated palette size
    series = [(k, l) for k, l in series if any(s[k] is not None for s in rows)][:3]
    for s in rows:  # None -> 0 so the polyline is continuous
        for k, _ in series:
            if s[k] is None:
                s[k] = 0
    util = _line_chart(rows, series,
                       "Server utilisation vs load (shaded = a load step, labelled with clients and req/s)",
                       lambda t: f"{t:g}%", xkey="t", xlabel="seconds into test",
                       ymax_fixed=100, markers=False, bands=bands)
    figs = [util]
    if metrics.get("disk_write_max"):
        for s in rows:
            if s["disk_w"] is None:
                s["disk_w"] = 0
        figs.append(_line_chart(rows, [("disk_w", "disk write")],
                    "Disk write throughput over time", lambda t: f"{t:g}", xkey="t",
                    xlabel="seconds into test", markers=False))
    return '<div class="charts">' + "".join(f"<figure>{f}</figure>" for f in figs) + "</div>"


def ms(v):
    return f"{v/1000:.2f} s" if v and v >= 1000 else f"{int(v)} ms"


# ---------- inline SVG charts (no dependencies) ----------
# palette validated via the dataviz skill's validator (CVD-safe, light surface):
#   throughput/sequential blue, latency series blue/green/magenta, errors = critical red
SURFACE, INK, MUTED, GRID = "#fcfcfb", "#0b0b0b", "#52514e", "#e5e4e0"
SERIES = ["#2a78d6", "#008300", "#e87ba4"]
CRIT = "#d03b3b"


def _ticks(vmax, n=4):
    import math
    if vmax <= 0:
        return [0, 1], 1
    step = vmax / n
    mag = 10 ** math.floor(math.log10(step))
    for m in (1, 2, 2.5, 5, 10):
        if step <= m * mag:
            step = m * mag
            break
    top = math.ceil(vmax / step - 1e-9) * step  # top tick must cover the data
    ticks = [round(step * i, 6) for i in range(int(round(top / step)) + 1)]
    return ticks, ticks[-1]


def _line_chart(rows, series, title, fmt, xkey="conc", xlabel="concurrent clients",
                ymax_fixed=None, markers=True, bands=None, logy=False):
    W, H, ml, mt, mb = 700, 250, 58, 46, 40
    # right margin has to fit the longest end-label, else it overruns the axis
    mr = max(104, 14 + 7 * max((len(l) for _, l in series), default=0))
    n = len(rows)
    xs = lambda i: ml + (W - ml - mr) * (i / (n - 1) if n > 1 else 0.5)
    if logy:
        # latency spans ~100ms to ~30s; a linear axis lets the tail flatten
        # everything below it, so plot decades instead.
        vals = [r[k] for k, _ in series for r in rows if r.get(k) and r[k] > 0]
        lo = max(min(vals) if vals else 1, 1)
        hi = max(vals) if vals else 10
        d0, d1 = math.floor(math.log10(lo)), math.ceil(math.log10(hi))
        ticks = [10 ** e for e in range(int(d0), int(d1) + 1)]
        lg0, lg1 = math.log10(ticks[0]), math.log10(ticks[-1])
        span = (lg1 - lg0) or 1
        ys = lambda v: (H - mb - (H - mt - mb) *
                        ((math.log10(max(v, ticks[0])) - lg0) / span))
    else:
        if ymax_fixed:
            ticks = [ymax_fixed * i / 4 for i in range(5)]
            ymax = ymax_fixed
        else:
            ticks, ymax = _ticks(max(r.get(k, 0) or 0 for k, _ in series for r in rows))
        ys = lambda v: H - mb - (H - mt - mb) * (v / ymax if ymax else 0)
    p = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{title}" '
         f'style="width:100%;height:auto;font:13px sans-serif;background:{SURFACE}">']
    p.append(f'<text x="{ml}" y="24" fill="{INK}" font-weight="600">{title}</text>')
    # shaded load-step windows: the gaps between them explain the idle troughs
    for b in (bands or []):
        i0, i1 = b["i0"], b["i1"]
        if i1 <= i0:
            continue
        x0, x1 = xs(i0), xs(i1)
        p.append(f'<line x1="{x0:.1f}" y1="{mt}" x2="{x0:.1f}" y2="{H-mb}" '
                 f'stroke="{MUTED}" stroke-width="0.75" stroke-dasharray="3,3"/>')
        p.append(f'<rect x="{x0:.1f}" y="{mt}" width="{x1-x0:.1f}" height="{H-mt-mb}" '
                 f'fill="{SERIES[0]}" opacity="0.07"/>')
        # only label bands wide enough to hold the text, else they collide
        if x1 - x0 >= 32:
            p.append(f'<text x="{(x0+x1)/2:.1f}" y="{mt-6}" fill="{MUTED}" text-anchor="middle" '
                     f'font-size="11">c={b["conc"]}</text>')
    for t in ticks:  # gridlines + y labels
        yy = ys(t)
        p.append(f'<line x1="{ml}" y1="{yy:.1f}" x2="{W-mr}" y2="{yy:.1f}" stroke="{GRID}"/>')
        p.append(f'<text x="{ml-8}" y="{yy+4:.1f}" fill="{MUTED}" text-anchor="end">{fmt(t)}</text>')
    step = max(1, -(-n // 8))  # thin x labels to ~8
    for i, r in enumerate(rows):
        if i % step == 0 or i == n - 1:
            p.append(f'<text x="{xs(i):.1f}" y="{H-mb+18}" fill="{MUTED}" text-anchor="middle">{r[xkey]}</text>')
    p.append(f'<text x="{(ml+W-mr)/2:.0f}" y="{H-6}" fill="{MUTED}" text-anchor="middle">{xlabel}</text>')
    end_labels = []
    for si, (key, label) in enumerate(series):
        c = SERIES[si % len(SERIES)]
        # a run may not have tested every level; its line just ends early
        have = [(i, r) for i, r in enumerate(rows) if r.get(key) is not None]
        if not have:
            continue
        pts = " ".join(f"{xs(i):.1f},{ys(r[key]):.1f}" for i, r in have)
        p.append(f'<polyline points="{pts}" fill="none" stroke="{c}" stroke-width="2" '
                 f'stroke-linejoin="round"/>')
        if markers:
            for i, r in have:
                p.append(f'<circle cx="{xs(i):.1f}" cy="{ys(r[key]):.1f}" r="3.2" fill="{c}"/>')
        end_labels.append([ys(have[-1][1][key]), label, c])
    end_labels.sort()  # de-collide vertically: keep labels >= 15px apart
    for j in range(1, len(end_labels)):
        if end_labels[j][0] - end_labels[j - 1][0] < 15:
            end_labels[j][0] = end_labels[j - 1][0] + 15
    for yy, label, c in end_labels:
        p.append(f'<text x="{W-mr+8}" y="{yy+4:.1f}" fill="{c}" font-weight="600">{label}</text>')
    p.append("</svg>")
    return "".join(p)


def _bar_chart(rows, title):
    W, H, ml, mr, mt, mb = 700, 230, 58, 104, 46, 40
    n = len(rows)
    vals = [100 * r["fails"] / r["n"] if r["n"] else 0 for r in rows]
    ticks, ymax = _ticks(max(vals + [1]))
    slot = (W - ml - mr) / n
    bw = slot * 0.6
    ys = lambda v: H - mb - (H - mt - mb) * (v / ymax if ymax else 0)
    p = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="{title}" '
         f'style="width:100%;height:auto;font:13px sans-serif;background:{SURFACE}">']
    p.append(f'<text x="{ml}" y="24" fill="{INK}" font-weight="600">{title}</text>')
    for t in ticks:
        yy = ys(t)
        p.append(f'<line x1="{ml}" y1="{yy:.1f}" x2="{W-mr}" y2="{yy:.1f}" stroke="{GRID}"/>')
        p.append(f'<text x="{ml-8}" y="{yy+4:.1f}" fill="{MUTED}" text-anchor="end">{t:g}%</text>')
    for i, (r, v) in enumerate(zip(rows, vals)):
        cx = ml + slot * i + slot / 2
        top = ys(v)
        p.append(f'<rect x="{cx-bw/2:.1f}" y="{top:.1f}" width="{bw:.1f}" '
                 f'height="{H-mb-top:.1f}" rx="3" fill="{CRIT if v else GRID}"/>')
        if v:
            p.append(f'<text x="{cx:.1f}" y="{top-6:.1f}" fill="{CRIT}" '
                     f'text-anchor="middle" font-weight="600">{v:.1f}%</text>')
        p.append(f'<text x="{cx:.1f}" y="{H-mb+18}" fill="{MUTED}" text-anchor="middle">{r["conc"]}</text>')
    p.append(f'<text x="{(ml+W-mr)/2:.0f}" y="{H-6}" fill="{MUTED}" text-anchor="middle">concurrent clients</text>')
    p.append("</svg>")
    return "".join(p)


def charts_for(rows):
    figs = [
        _line_chart(rows, [("rps", "req/s")], "Throughput vs concurrency", lambda t: f"{t:g}"),
        _line_chart(rows, [("p50_ms", "p50"), ("p95_ms", "p95"), ("p99_ms", "p99")],
                    "Latency vs concurrency (log scale)", lambda t: ms(t), logy=True),
        _bar_chart(rows, "Error rate vs concurrency"),
    ]
    return '<div class="charts">' + "".join(f"<figure>{f}</figure>" for f in figs) + "</div>"


def build_md(by_scenario, sla_ms, title, metrics, bare=False):
    L = [f"# {title}", ""]
    if bare:
        L += [f"Target: p95 ≤ {ms(sla_ms)}, zero errors.", ""]
    else:
        L += ["## Method", "",
              "The API was driven with a stepped-concurrency load generator "
              "(`loadtest.py`). Each level fires a fixed number of requests spread "
              "across the target concurrency and records throughput, latency "
              "percentiles and failures by HTTP status. Scenarios cover a static "
              "route, authenticated reads, a write path, and a mixed realistic "
              f"traffic blend. The pass target (SLA) is p95 ≤ {ms(sla_ms)} with "
              "zero errors.", ""]

    for scenario, rows in by_scenario.items():
        a = analyse(rows, sla_ms)
        L += [f"## Scenario: {scenario}", "",
              "| Concurrency | Req/s | p50 | p95 | p99 | Max | Failures |",
              "|---|---|---|---|---|---|---|"]
        for r in rows:
            fr = f"{r['fails']} ({100*r['fails']/r['n']:.1f}%)" if r["fails"] else "0"
            L.append(f"| {r['conc']} | {r['rps']} | {ms(r['p50_ms'])} | {ms(r['p95_ms'])} "
                     f"| {ms(r['p99_ms'])} | {ms(r['max_ms'])} | {fr} |")
        L.append("")
        if bare:
            continue
        L += ["**Findings**", ""]
        L.append(f"- Peak throughput **{a['peak']['rps']} req/s** at "
                 f"{a['peak']['conc']} concurrent.")
        if a["sla_max"]:
            L.append(f"- p95 stayed within the {ms(sla_ms)} SLA (zero errors) up to "
                     f"**{a['sla_max']['conc']} concurrent** "
                     f"(p95 {ms(a['sla_max']['p95_ms'])}).")
        if a["clean_max"]:
            L.append(f"- Zero failed requests up to **{a['clean_max']['conc']} "
                     f"concurrent**.")
        if a["err_onset"]:
            codes = {k: v for k, v in a["err_onset"]["codes"].items() if k != "200"}
            L.append(f"- First errors at **{a['err_onset']['conc']} concurrent** "
                     f"({a['err_onset']['fails']} of {a['err_onset']['n']}; {codes}).")
        else:
            L.append("- No errors observed at any tested level.")
        if a["ceiling"]:
            codes = {k: v for k, v in a["ceiling"]["codes"].items() if k != "200"}
            L.append(f"- **Ceiling: {a['ceiling']['conc']} concurrent** "
                     f"({100*a['ceiling']['fails']/a['ceiling']['n']:.1f}% failed; {codes}).")
        L.append("")

    if metrics:
        L += ["## Server resources during the test", "",
              f"Sampled {metrics['n']} points on the API host." if bare else
              f"Sampled {metrics['n']} points on the API host. Peak of each resource "
              "— the one closest to its ceiling is the binding constraint:", "",
              "| Resource | Peak | Ceiling |", "|---|---|---|",
              f"| Busiest single core | {metrics['core_max']}% | 100% |",
              f"| Average CPU (all cores) | {metrics['cpu_max']}% (mean {metrics['cpu_mean']}%) | 100% |",
              f"| Memory | {metrics['mem_max']}% (idle {metrics['mem_idle']}%) | 100% |"
              if metrics.get("mem_idle") is not None else
              f"| Memory | {metrics['mem_max']}% | 100% |",
              f"| CPU io-wait (disk stall) | {metrics.get('iowait_max')}% | 100% |",
              f"| Disk write | {metrics['disk_write_max']} MB/s | disk-dependent |",
              f"| Network out | {metrics.get('net_sent_max')} MB/s | link-dependent |",
              *([f"| Swap in use | {metrics['swap_max']} MiB | 0 ideally |"]
                if metrics.get("swap_max") else []),
              f"| Load average (1 min) | {metrics.get('load_max')} | ≈ core count |",
              f"| TCP connections | {metrics['est_max']} | fd limit |", ""]
        core, cpu, mem, iow = (metrics["core_max"], metrics["cpu_max"],
                               metrics["mem_max"], metrics.get("iowait_max"))
        verdict = None
        if iow is not None and iow > 20:
            verdict = ("**Constraint: disk I/O.** CPU spent a large fraction of time "
                       "stalled waiting on disk (io-wait peak {:.0f}%) — the SQLite write "
                       "path is the bottleneck; PostgreSQL / batched inserts is the fix.".format(iow))
        elif core is not None and core > 90 and cpu is not None and cpu < 70:
            verdict = ("**Constraint: single-process CPU.** One core hit ~100% while "
                       "average CPU stayed well below full — the server can't use all "
                       "cores. Multiple gunicorn workers is the direct fix.")
        elif mem is not None and mem > 90:
            verdict = "**Constraint: memory.** RAM approached full — add memory or reduce per-request footprint."
        elif cpu is not None and cpu > 85:
            verdict = "**Constraint: CPU-bound across all cores.** The box is genuinely out of CPU — scale up or out."
        if verdict and not bare:
            L += [verdict, ""]

    if not bare:
        L += ["## Interpretation & next steps", "",
              "- Throughput rising then plateauing while latency climbs is server "
              "saturation, not client limits — requests queue rather than fail.",
              "- The write path degrades first: each trip upload inserts many GPS "
              "rows and SQLite serialises writers on a single lock, producing the "
              "first server (500) errors under contention.",
              "- Improvements identified: serve Flask via gunicorn with multiple "
              "workers; batch GPS inserts to shorten the write lock; migrate to "
              "PostgreSQL if concurrent write volume grows.", ""]
    return "\n".join(L)


def md_to_html(md, title):
    # deliberately tiny converter: headings, tables, bold, list items
    import html as h
    out, in_table = [], False
    for line in md.splitlines():
        s = line.rstrip()
        if s.startswith("|") and "---" in s:
            continue
        if s.startswith("|"):
            cells = [c.strip() for c in s.strip("|").split("|")]
            if not in_table:
                out.append("<table><tr>" + "".join(f"<th>{h.escape(c)}</th>" for c in cells) + "</tr>")
                in_table = True
            else:
                out.append("<tr>" + "".join(f"<td>{h.escape(c)}</td>" for c in cells) + "</tr>")
            continue
        if in_table:
            out.append("</table>"); in_table = False
        if s.startswith("# "):
            out.append(f"<h1>{h.escape(s[2:])}</h1>")
        elif s.startswith("## "):
            out.append(f"<h2>{h.escape(s[3:])}</h2>")
        elif s.startswith("- "):
            out.append(f"<li>{_inline(s[2:])}</li>")
        elif s == "":
            out.append("")
        else:
            out.append(f"<p>{_inline(s)}</p>")
    if in_table:
        out.append("</table>")
    body = "\n".join(out)
    css = ("body{font:15px/1.5 -apple-system,Segoe UI,sans-serif;max-width:820px;"
           "margin:2rem auto;padding:0 1rem;color:#1a1a1a}"
           "h1{border-bottom:2px solid #333;padding-bottom:.3rem}"
           "h2{margin-top:1.8rem;color:#222}"
           "table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:14px}"
           "th,td{border:1px solid #ccc;padding:.4rem .6rem;text-align:left}"
           "th{background:#f2f2f2}li{margin:.2rem 0}"
           "figure{margin:1rem 0}.charts{margin:1rem 0}"
           "@media print{body{margin:0}figure{break-inside:avoid}}")
    return f"<!doctype html><meta charset=utf-8><title>{h.escape(title)}</title><style>{css}</style>{body}"


def _inline(s):
    import re, html as h
    s = h.escape(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    return s


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("results", help="loadtest_results.json")
    ap.add_argument("--out", default="report.md")
    ap.add_argument("--title", default="Load Test Report")
    ap.add_argument("--sla-ms", type=float, default=2000)
    ap.add_argument("--metrics", help="metrics.csv from metrics_server.py (optional)")
    ap.add_argument("--html", help="also write a print-to-PDF HTML file")
    ap.add_argument("--bare", action="store_true",
                    help="charts, tables and headings only — no written analysis")
    args = ap.parse_args()

    by_scenario = load_results(args.results)
    metrics = load_metrics(args.metrics) if args.metrics else None
    md = build_md(by_scenario, args.sla_ms, args.title, metrics, bare=args.bare)
    with open(args.out, "w") as f:
        f.write(md)
    print(f"wrote {args.out}")
    if args.html:
        html = md_to_html(md, args.title)
        for scenario, rows in by_scenario.items():  # inject charts after each scenario heading
            if len(rows) >= 2:
                import html as _h
                heading = f"<h2>{_h.escape('Scenario: ' + scenario)}</h2>"
                html = html.replace(heading, heading + charts_for(rows), 1)
        if metrics:  # inject resource charts after the server-resources heading
            all_steps = [r for rows in by_scenario.values() for r in rows]
            rps_svg = rps_over_time(metrics, all_steps)
            rc = resource_charts(metrics, bands=step_bands(metrics, all_steps))
            if rps_svg:
                rc = f'<div class="charts"><figure>{rps_svg}</figure></div>' + rc
            head = "<h2>Server resources during the test</h2>"
            html = html.replace(head, head + rc, 1)
        with open(args.html, "w") as f:
            f.write(html)
        print(f"wrote {args.html}  (open it and Cmd/Ctrl-P -> Save as PDF)")
