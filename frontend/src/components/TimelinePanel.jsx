import { useState, useEffect } from 'react';

const TF_OPTIONS = [
  { value: 'all',  label: 'All' },
  { value: '1h',   label: '1h' },
  { value: '24h',  label: '24h' },
  { value: '7d',   label: '7d' },
  { value: '30d',  label: '30d' },
];

function sinceDate(tf) {
  const d = new Date();
  if (tf === '1h')  d.setHours(d.getHours() - 1);
  else if (tf === '24h') d.setDate(d.getDate() - 1);
  else if (tf === '7d')  d.setDate(d.getDate() - 7);
  else if (tf === '30d') d.setDate(d.getDate() - 30);
  return d.toISOString();
}

function fmtTime(ts) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function TimelinePanel({ cell, onClose }) {
  const [tf, setTf] = useState('all');
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { bounds } = cell;
    const p = new URLSearchParams({
      south: bounds.south, north: bounds.north,
      west: bounds.west,  east: bounds.east,
    });
    if (tf !== 'all') p.append('since', sinceDate(tf));

    fetch(`/api/recordings?${p}`)
      .then(r => r.json())
      .then(data => { setRecordings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [cell, tf]);

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>GRID CELL</h3>
          <p>{cell.count} recording{cell.count !== 1 ? 's' : ''} total</p>
        </div>
        <button className="panel-close" onClick={onClose}>×</button>
      </div>

      <div className="tf-bar">
        {TF_OPTIONS.map(o => (
          <button key={o.value} className={`tf-btn ${tf === o.value ? 'active' : ''}`} onClick={() => setTf(o.value)}>
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="panel-msg">Loading…</div>
      ) : recordings.length === 0 ? (
        <div className="panel-msg">No recordings in this timeframe.</div>
      ) : (
        <div className="timeline-scroll">
          {recordings.map(rec => (
            <div key={rec.id} className="timeline-item">
              <div className="t-meta">
                <span className="t-time">{fmtTime(rec.timestamp)}</span>
                <div className="t-tags">
                  {rec.tags.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
              <audio controls src={`/uploads/${rec.filename}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
