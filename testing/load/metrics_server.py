#!/usr/bin/env python3
# AI generated
"""Server-side resource metrics for load testing.

Two modes in one file:

  SERVER  (run on the box under test, e.g. the Sydney API box):
      python3 metrics_server.py serve --token SECRET [--port 9100]
    Exposes GET /metrics?token=SECRET -> JSON snapshot of CPU (overall + per
    core), memory, load average, disk I/O, network I/O and TCP connection
    counts. Open the port in the firewall ONLY for the test window, ideally
    restricted to the poller's source IP, then close it again.

  POLLER  (run anywhere, e.g. your Mac, alongside loadtest.py):
      python3 metrics_server.py poll http://API_IP:9100 --token SECRET \
              --interval 1 --out metrics.csv
    Samples the server every --interval seconds and writes a timeseries CSV.
    Line it up against loadtest.py's concurrency steps by wall-clock time.

Full metrics need psutil (pip install psutil). Without it, falls back to
/proc for CPU%, memory and load average on Linux (no disk/net/conn rates).
"""
import argparse, csv, hmac, json, os, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

try:
    import psutil
    HAVE_PSUTIL = True
except ImportError:
    HAVE_PSUTIL = False


# ---------- metric collection ----------

def _proc_cpu_percent(interval=0.3):
    def snap():
        with open("/proc/stat") as f:
            vals = list(map(int, f.readline().split()[1:]))
        idle = vals[3] + (vals[4] if len(vals) > 4 else 0)
        return idle, sum(vals)
    i1, t1 = snap(); time.sleep(interval); i2, t2 = snap()
    dt = t2 - t1
    return round((1 - (i2 - i1) / dt) * 100, 1) if dt else 0.0


def _proc_mem():
    info = {}
    with open("/proc/meminfo") as f:
        for line in f:
            k, _, rest = line.partition(":")
            info[k] = int(rest.split()[0])  # kB
    total = info.get("MemTotal", 0)
    used = total - info.get("MemAvailable", 0)
    pct = round(used / total * 100, 1) if total else 0.0
    return round(used / 1024, 1), round(total / 1024, 1), pct  # MB, MB, %


def collect():
    m = {"ts": time.time()}
    if HAVE_PSUTIL:
        # interval=None averages over the whole gap since the previous call, so
        # every second is covered. A blocking sub-second interval samples only a
        # slice of each period and aliases bursty load into 0/100 flicker.
        per = psutil.cpu_percent(interval=None, percpu=True)
        m["cpu_per_core"] = per
        m["cpu_pct"] = round(sum(per) / len(per), 1) if per else 0.0
        m["ncpu"] = len(per)
        try:  # iowait % since the previous sample = time the CPU stalled on disk
            m["cpu_iowait"] = round(getattr(psutil.cpu_times_percent(interval=None), "iowait", 0.0), 1)
        except Exception:
            pass
        vm = psutil.virtual_memory()
        m["mem_used_mb"] = round(vm.used / 1048576, 1)  # MiB, to match mem_pct and free(1)
        sw = psutil.swap_memory()
        m["swap_used_mb"] = round(sw.used / 1048576, 1)
        m["swap_pct"] = sw.percent
        m["mem_total_mb"] = round(vm.total / 1e6, 1)
        m["mem_pct"] = vm.percent
        try:
            m["load1"], m["load5"], m["load15"] = [round(x, 2) for x in psutil.getloadavg()]
        except (AttributeError, OSError):
            pass
        d = psutil.disk_io_counters()
        if d:
            m["disk_read_bytes"], m["disk_write_bytes"] = d.read_bytes, d.write_bytes
        n = psutil.net_io_counters()
        if n:
            m["net_sent_bytes"], m["net_recv_bytes"] = n.bytes_sent, n.bytes_recv
        try:
            conns = psutil.net_connections(kind="tcp")
            m["tcp_established"] = sum(1 for c in conns if c.status == "ESTABLISHED")
            m["tcp_time_wait"] = sum(1 for c in conns if c.status == "TIME_WAIT")
        except (psutil.AccessDenied, OSError):
            pass  # needs root for system-wide counts
    else:
        m["cpu_pct"] = _proc_cpu_percent()
        m["cpu_per_core"] = []
        m["mem_used_mb"], m["mem_total_mb"], m["mem_pct"] = _proc_mem()
        m["ncpu"] = os.cpu_count()
        try:
            with open("/proc/loadavg") as f:
                m["load1"], m["load5"], m["load15"] = map(float, f.read().split()[:3])
        except OSError:
            pass
    return m


# ---------- server mode ----------

class Handler(BaseHTTPRequestHandler):
    token = None

    def log_message(self, *a):  # silence default request logging
        pass

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/health":
            return self._json({"ok": True, "psutil": HAVE_PSUTIL})
        if u.path != "/metrics":
            self.send_error(404)
            return
        q = parse_qs(u.query)
        supplied = q.get("token", [""])[0] or self.headers.get("X-Token", "")
        if not (self.token and hmac.compare_digest(supplied, self.token)):
            body = b'{"error":"unauthorized"}'
            self.send_response(401)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        self._json(collect())

    def _json(self, obj):
        body = json.dumps(obj).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def serve(args):
    if not args.token:
        sys.exit("refusing to start without a --token (this endpoint is public)")
    Handler.token = args.token
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"metrics server on {args.host}:{args.port} "
          f"(psutil={'yes' if HAVE_PSUTIL else 'no — /proc fallback'})")
    print(f"  GET http://<this-ip>:{args.port}/metrics?token=<token>")
    print("  SECURITY: open this port ONLY during testing, ideally restricted to the")
    print("            poller's source IP, and close it again afterwards.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")


# ---------- poller mode ----------

FIELDS = ["iso", "ts_local", "cpu_pct", "cpu_iowait", "cpu_per_core", "mem_pct",
          "mem_used_mb", "swap_used_mb", "swap_pct", "load1", "disk_read_mbps", "disk_write_mbps",
          "net_sent_mbps", "net_recv_mbps", "tcp_established", "tcp_time_wait"]


def _sample_loop(get_metrics, args):
    """Drive one sample per interval into a CSV; get_metrics() returns a dict or None."""
    prev = None
    with open(args.out, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        try:
            while True:
                t0 = time.time()
                m = get_metrics()
                if m is None:
                    time.sleep(args.interval)
                    continue
                row = {
                    "iso": time.strftime("%H:%M:%S", time.localtime(t0)),
                    "ts_local": round(t0, 3),
                    "cpu_pct": m.get("cpu_pct"),
                    "cpu_iowait": m.get("cpu_iowait"),
                    "cpu_per_core": ";".join(str(x) for x in m.get("cpu_per_core", [])),
                    "mem_pct": m.get("mem_pct"),
                    "mem_used_mb": m.get("mem_used_mb"),
                    "swap_used_mb": m.get("swap_used_mb"),
                    "swap_pct": m.get("swap_pct"),
                    "load1": m.get("load1"),
                    "tcp_established": m.get("tcp_established"),
                    "tcp_time_wait": m.get("tcp_time_wait"),
                }
                if prev:
                    dt = m["ts"] - prev["ts"]
                    def rate(k):
                        return round((m[k] - prev[k]) / dt / 1e6, 3) if dt > 0 and k in m and k in prev else None
                    row["disk_read_mbps"] = rate("disk_read_bytes")
                    row["disk_write_mbps"] = rate("disk_write_bytes")
                    row["net_sent_mbps"] = rate("net_sent_bytes")
                    row["net_recv_mbps"] = rate("net_recv_bytes")
                prev = m
                w.writerow(row)
                fh.flush()
                print(f"{row['iso']} cpu={row['cpu_pct']}% mem={row['mem_pct']}% "
                      f"load={row.get('load1')} est={row.get('tcp_established')} "
                      f"cores=[{row['cpu_per_core']}]")
                sleep = args.interval - (time.time() - t0)
                if sleep > 0:
                    time.sleep(sleep)
        except KeyboardInterrupt:
            print("\nstopped, wrote", args.out)


def local(args):
    """Sample THIS machine straight to a CSV — no server, no port, no firewall hole."""
    print(f"sampling this host every {args.interval}s -> {args.out} (Ctrl-C to stop)")
    _sample_loop(collect, args)


def poll(args):
    import urllib.request
    url = args.target.rstrip("/") + "/metrics?token=" + args.token
    print(f"polling {args.target} every {args.interval}s -> {args.out} (Ctrl-C to stop)")
    def get():
        try:
            with urllib.request.urlopen(url, timeout=5) as r:
                return json.loads(r.read())
        except Exception as e:
            print("poll error:", e)
            return None
    _sample_loop(get, args)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="server-side resource metrics for load testing")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("serve", help="run the metrics endpoint on the box under test")
    s.add_argument("--host", default="0.0.0.0")
    s.add_argument("--port", type=int, default=9100)
    s.add_argument("--token", required=True, help="shared secret required on every request")

    lo = sub.add_parser("local", help="sample THIS machine to a CSV (no server/port needed)")
    lo.add_argument("--interval", type=float, default=1.0)
    lo.add_argument("--out", default="metrics.csv")

    p = sub.add_parser("poll", help="sample a remote metrics endpoint into a CSV")
    p.add_argument("target", help="e.g. http://API_IP:9100")
    p.add_argument("--token", required=True)
    p.add_argument("--interval", type=float, default=1.0)
    p.add_argument("--out", default="metrics.csv")

    args = ap.parse_args()
    {"serve": serve, "local": local, "poll": poll}[args.cmd](args)
