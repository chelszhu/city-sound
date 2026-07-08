"""
Sound in NYC — Flask backend
Run: python3 server.py
"""
import os
import json
import math
import sqlite3
import uuid
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, send_file

BASE = os.path.dirname(os.path.abspath(__file__))
UPLOADS = os.path.join(BASE, "uploads")
DB_PATH = os.path.join(BASE, "sounds.db")
STATIC = os.path.join(BASE, "public")

os.makedirs(UPLOADS, exist_ok=True)
os.makedirs(STATIC, exist_ok=True)

app = Flask(__name__, static_folder=STATIC, instance_path='/tmp/sound-nyc')
app.config["MAX_CONTENT_LENGTH"] = 30 * 1024 * 1024  # 30 MB


# ── Database ──────────────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.create_function("FLOOR_DIV", 2, lambda x, y: math.floor(x / y))
    return conn


def init_db():
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS recordings (
                id        TEXT PRIMARY KEY,
                filename  TEXT NOT NULL,
                lat       REAL NOT NULL,
                lng       REAL NOT NULL,
                tags      TEXT DEFAULT '[]',
                timestamp TEXT NOT NULL,
                created   TEXT DEFAULT (datetime('now'))
            )
        """)
    refresh_demo_timestamps()


def refresh_demo_timestamps():
    """Demo recordings ship with fixed timestamps that age out of the
    'last hour / 24h' filters. On startup, if the newest sample is older
    than 12h, slide all sample timestamps forward (keeping their relative
    spacing) so the demo map always feels alive."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, timestamp FROM recordings WHERE filename LIKE 'sample_%'"
        ).fetchall()
        if not rows:
            return
        try:
            times = {r["id"]: datetime.fromisoformat(r["timestamp"]) for r in rows}
        except ValueError:
            return
        newest = max(times.values())
        # naive local time: the frontend parses these strings as local,
        # so anchoring to local now keeps displayed ages sensible
        now = datetime.now()
        age = (now - newest).total_seconds()
        if 0 <= age < 12 * 3600:
            return  # still fresh (negative age = future timestamps → re-anchor)
        delta = now - newest - timedelta(minutes=30)  # newest lands ~30 min ago
        for rec_id, ts in times.items():
            conn.execute(
                "UPDATE recordings SET timestamp = ? WHERE id = ?",
                ((ts + delta).isoformat(), rec_id),
            )


def grid_cell_size(zoom: int) -> float:
    sizes = {10: 0.05, 11: 0.025, 12: 0.0125, 13: 0.00625,
             14: 0.003125, 15: 0.001562, 16: 0.000781, 17: 0.000390}
    return sizes.get(max(10, min(17, zoom)), 0.0125)


# ── API ───────────────────────────────────────────────────────────────────────

@app.post("/api/recordings")
def upload_recording():
    f = request.files.get("audio")
    lat = request.form.get("lat")
    lng = request.form.get("lng")
    if not f or lat is None or lng is None:
        return jsonify(error="Missing required fields"), 400

    filename = f"{uuid.uuid4()}.webm"
    f.save(os.path.join(UPLOADS, filename))

    rec_id = str(uuid.uuid4())
    tags   = request.form.get("tags", "[]")
    ts     = request.form.get("timestamp", datetime.utcnow().isoformat())

    with get_db() as conn:
        conn.execute(
            "INSERT INTO recordings (id, filename, lat, lng, tags, timestamp) VALUES (?,?,?,?,?,?)",
            (rec_id, filename, float(lat), float(lng), tags, ts),
        )

    return jsonify(id=rec_id, filename=filename)


@app.get("/api/recordings")
def list_recordings():
    south = request.args.get("south", type=float)
    north = request.args.get("north", type=float)
    west  = request.args.get("west",  type=float)
    east  = request.args.get("east",  type=float)
    since = request.args.get("since")
    until = request.args.get("until")

    sql    = "SELECT * FROM recordings WHERE 1=1"
    params = []

    if None not in (south, north, west, east):
        sql += " AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?"
        params += [south, north, west, east]
    if since:
        sql += " AND timestamp >= ?"; params.append(since)
    if until:
        sql += " AND timestamp <= ?"; params.append(until)
    sql += " ORDER BY timestamp DESC"

    with get_db() as conn:
        rows = conn.execute(sql, params).fetchall()

    return jsonify([{**dict(r), "tags": json.loads(r["tags"])} for r in rows])


@app.get("/api/grid")
def grid_data():
    south = request.args.get("south", type=float, default=40.4774)
    north = request.args.get("north", type=float, default=40.9176)
    west  = request.args.get("west",  type=float, default=-74.2591)
    east  = request.args.get("east",  type=float, default=-73.7004)
    zoom  = request.args.get("zoom",  type=int,   default=12)

    size = grid_cell_size(zoom)
    sql = """
        SELECT
            FLOOR_DIV(lat, ?) AS row,
            FLOOR_DIV(lng, ?) AS col,
            COUNT(*) AS count
        FROM recordings
        WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
        GROUP BY row, col
    """
    with get_db() as conn:
        rows = conn.execute(sql, (size, size, south, north, west, east)).fetchall()

    return jsonify([dict(r) for r in rows])


# ── Static files ──────────────────────────────────────────────────────────────

@app.get("/uploads/<path:filename>")
def serve_upload(filename):
    return send_from_directory(UPLOADS, filename)


@app.get("/")
@app.get("/<path:path>")
def serve_frontend(path=""):
    index = os.path.join(STATIC, "index.html")
    if os.path.isfile(index):
        return send_file(index)
    return "index.html not found", 404


# ── Main ──────────────────────────────────────────────────────────────────────

init_db()  # runs on import too, so gunicorn workers get a ready DB

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    print(f"\n  Sound in NYC server running →  http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
