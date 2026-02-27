"""
Simple Flask server for app_ui_prototypes HTML files.
Only depends on Flask.
"""
from pathlib import Path

from flask import Flask, send_from_directory, render_template_string, redirect, url_for

app = Flask(__name__)
PROTOTYPES_DIR = Path(__file__).parent


def get_html_files():
    """List all HTML files in app_ui_prototypes (root and subdirs).
    Prefers final/index.html over final.html when both exist (refactored canonical entry).
    Excludes backup/junk files (e.g. ignore*.html).
    """
    if not PROTOTYPES_DIR.exists():
        return []
    files = []
    for f in PROTOTYPES_DIR.rglob("*.html"):
        if f.suffix.lower() == ".html":
            rel = f.relative_to(PROTOTYPES_DIR)
            path_str = str(rel).replace("\\", "/")
            # Skip backup/junk and wrapper files
            if "ignore" in path_str.lower() or path_str == "iframe.html":
                continue
            files.append(path_str)
    files = sorted(files)
    # Prefer final/index.html over final.html when both exist
    if "final/index.html" in files and "final.html" in files:
        files = [f for f in files if f != "final.html"]
    # Pin final at the top so it's always visible
    if "final/index.html" in files:
        files = ["final/index.html"] + [f for f in files if f != "final/index.html"]
    return files


PREVIEW_SCREENS = [
    ("Log", "logger"),
    ("History", "history"),
    ("AI", "chat"),
    ("Settings", "settings"),
]

# Custom screen configs for specific prototypes. Add entries for new apps.
PREVIEW_SCREENS_CONFIG = {
    "lplate-logger.html": [("Log", "logger"), ("Trips", "trips"), ("AI", "chat"), ("More", "more")],
    "lplate-logger-orbit.html": [("Log", "logger"), ("Map", "map"), ("History", "history"), ("AI", "chat"), ("Settings", "settings")],
    "lplate-logger-synthwave.html": [("Log", "logger"), ("Map", "map"), ("History", "history"), ("AI", "chat"), ("Settings", "settings")],
    "final.html": [("Drive", "logger"), ("History", "history"), ("Rules", "chat"), ("Settings", "settings"), ("Approvals", "approvals")],
    "final/index.html": [("Drive", "logger"), ("History", "history"), ("Rules", "chat"), ("Settings", "settings"), ("Approvals", "approvals")],
}


def get_preview_screens(filename):
    """Return (label, hash) for each preview. Uses PREVIEW_SCREENS_CONFIG or default."""
    return PREVIEW_SCREENS_CONFIG.get(filename, PREVIEW_SCREENS)


def get_display_name(filename):
    """Return a friendly display name for the prototype (e.g. final/index.html -> final)."""
    if filename == "final/index.html":
        return "final"
    return filename


INDEX_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>L-Plate Logger Prototypes</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            display: flex;
            flex-direction: column;
            font-family: system-ui, -apple-system, sans-serif;
            background: #0a0a0f;
            color: #e8e8f0;
            min-height: 100vh;
            padding: 2rem;
        }
        h1 { margin-bottom: 2rem; font-size: 1.75rem; font-weight: 600; }
        .grid {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
        }
        .card {
            display: flex;
            flex-direction: column;
            min-width: 95%;
            max-width: 1200px;
            background: #13131a;
            border: 1px solid #ffffff15;
            border-radius: 12px;
            overflow: hidden;
            transition: transform 0.2s, border-color 0.2s;
        }
        .card:hover {
            transform: translateY(-2px);
            border-color: #00e67640;
        }
        .thumbs-row {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
            padding: 8px;
            background: #1a1a24;
            border-bottom: 1px solid #ffffff08;
        }
        .thumb-cell {
            flex: 1;
            min-width: 90px;
            aspect-ratio: 9 / 16;
            overflow: hidden;
            border-radius: 6px;
            background: #22222e;
            position: relative;
        }
        .thumb-cell::after {
            content: attr(data-label);
            position: absolute;
            bottom: 4px;
            left: 6px;
            font-size: 10px;
            color: rgba(255,255,255,0.6);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .thumb-cell iframe {
            width: 200%;
            height: 200%;
            border: none;
            pointer-events: none;
            transform: scale(0.5);
            transform-origin: top left;
        }
        .card-body { padding: 1rem; }
        .card-title {
            font-size: 0.95rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
            word-break: break-word;
        }
        .card-link {
            display: inline-block;
            color: #00e676;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
        }
        .card-link:hover { text-decoration: underline; }
        .theme-toggle-bar {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }
        .theme-toggle-bar span { color: #8888a0; font-size: 0.9rem; }
        .theme-toggle-bar button {
            padding: 0.5rem 1rem;
            border-radius: 8px;
            border: 1px solid #ffffff25;
            background: #13131a;
            color: #e8e8f0;
            font-size: 0.875rem;
            cursor: pointer;
            transition: background 0.2s, border-color 0.2s;
        }
        .theme-toggle-bar button:hover { background: #1a1a24; border-color: #ffffff40; }
        .theme-toggle-bar button.active { background: #00e67622; border-color: #00e676; color: #00e676; }
    </style>
</head>
<body>
    <h1>L-Plate Logger Prototypes</h1>
    <div class="theme-toggle-bar">
        <span>Preview theme:</span>
        <button type="button" id="themeDark" class="active">Dark</button>
        <button type="button" id="themeLight">Light</button>
    </div>
    <div class="grid">
        {% for file in files %}
        <a href="{{ url_for('serve_prototype', filename=file) }}" class="card" target="_blank">
            <div class="thumbs-row">
                {% for label, hash in get_preview_screens(file) %}
                <div class="thumb-cell" data-label="{{ label }}">
                    <iframe data-src-base="{{ url_for('serve_prototype', filename=file) }}" data-hash="{{ hash }}" title="{{ label }}"></iframe>
                </div>
                {% endfor %}
            </div>
            <div class="card-body">
                <div class="card-title">{{ get_display_name(file) }}</div>
                <span class="card-link">Open prototype →</span>
            </div>
        </a>
        {% endfor %}
    </div>
    {% if not files %}
    <p style="color: #8888a0;">No HTML files found in app_ui_prototypes.</p>
    {% endif %}
    <script>
    (function(){
      let previewTheme = 'dark';
      function updateIframes() {
        document.querySelectorAll('.thumb-cell iframe[data-src-base]').forEach(function(iframe) {
          var base = iframe.getAttribute('data-src-base');
          var hash = iframe.getAttribute('data-hash');
          var sep = base.indexOf('?') >= 0 ? '&' : '?';
          iframe.src = base + sep + 'theme=' + previewTheme + (hash ? '#' + hash : '');
        });
      }
      function setTheme(t) {
        previewTheme = t;
        document.getElementById('themeDark').classList.toggle('active', t === 'dark');
        document.getElementById('themeLight').classList.toggle('active', t === 'light');
        updateIframes();
      }
      document.getElementById('themeDark').onclick = function() { setTheme('dark'); };
      document.getElementById('themeLight').onclick = function() { setTheme('light'); };
      updateIframes();
    })();
    </script>
</body>
</html>
"""


@app.route("/")
def index():
    return render_template_string(
        INDEX_HTML,
        files=get_html_files(),
        get_preview_screens=get_preview_screens,
        get_display_name=get_display_name,
    )


@app.route("/prototypes/final/")
def serve_final_index():
    """Redirect /prototypes/final/ to /prototypes/final/index.html for the refactored app."""
    return redirect(url_for("serve_prototype", filename="final/index.html"))


# MIME types for ES modules - browsers reject module scripts without correct type
MIME_OVERRIDES = {
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".css": "text/css",
}


@app.route("/prototypes/<path:filename>")
def serve_prototype(filename):
    path = Path(filename)
    mimetype = MIME_OVERRIDES.get(path.suffix.lower())
    return send_from_directory(
        PROTOTYPES_DIR,
        filename,
        mimetype=mimetype,
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
