const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'sounds.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS recordings (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    tags TEXT DEFAULT '[]',
    timestamp TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

function getGridCellSize(zoom) {
  const sizes = {
    10: 0.05, 11: 0.025, 12: 0.0125, 13: 0.00625,
    14: 0.003125, 15: 0.001562, 16: 0.000781, 17: 0.000390
  };
  return sizes[Math.min(17, Math.max(10, zoom))] || 0.0125;
}

module.exports = {
  saveRecording({ id, filename, lat, lng, tags, timestamp }) {
    db.prepare(`
      INSERT INTO recordings (id, filename, lat, lng, tags, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, filename, lat, lng, JSON.stringify(tags), timestamp);
  },

  getRecordings({ south, north, west, east, since, until } = {}) {
    let query = 'SELECT * FROM recordings WHERE 1=1';
    const params = [];
    if (south != null && north != null && west != null && east != null) {
      query += ' AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?';
      params.push(parseFloat(south), parseFloat(north), parseFloat(west), parseFloat(east));
    }
    if (since) { query += ' AND timestamp >= ?'; params.push(since); }
    if (until) { query += ' AND timestamp <= ?'; params.push(until); }
    query += ' ORDER BY timestamp DESC';
    return db.prepare(query).all(...params).map(r => ({ ...r, tags: JSON.parse(r.tags) }));
  },

  getGridData({ south, north, west, east, zoom }) {
    const cellSize = getGridCellSize(zoom);
    return db.prepare(`
      SELECT
        CAST(lat / ? AS INTEGER) AS row,
        CAST(lng / ? AS INTEGER) AS col,
        COUNT(*) AS count
      FROM recordings
      WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?
      GROUP BY row, col
    `).all(
      cellSize, cellSize,
      parseFloat(south), parseFloat(north),
      parseFloat(west), parseFloat(east)
    );
  }
};
