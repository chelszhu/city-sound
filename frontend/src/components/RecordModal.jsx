import { useState, useRef, useEffect } from 'react';

const DURATION = 8;

// Random NYC coords for fallback when geolocation is denied
const NYC_SPOTS = [
  [40.7128, -74.006],  // Manhattan
  [40.758, -73.9855],  // Midtown
  [40.7282, -73.7949], // Queens
  [40.6501, -73.9496], // Brooklyn
  [40.6892, -74.0445], // Staten Island
  [40.8448, -73.8648], // Bronx
];

export default function RecordModal({ onClose, onSubmit }) {
  const [phase, setPhase] = useState('idle'); // idle | recording | review | uploading
  const [countdown, setCountdown] = useState(DURATION);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [location, setLocation] = useState(null);
  const [locNote, setLocNote] = useState('Locating…');

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocNote(`📍 ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      },
      () => {
        const [lat, lng] = NYC_SPOTS[Math.floor(Math.random() * NYC_SPOTS.length)];
        const jlat = lat + (Math.random() - 0.5) * 0.008;
        const jlng = lng + (Math.random() - 0.5) * 0.008;
        setLocation({ lat: jlat, lng: jlng });
        setLocNote(`📍 Approximate NYC location (geolocation denied)`);
      },
      { timeout: 6000 }
    );
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setPhase('review');
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setPhase('recording');
      setCountdown(DURATION);

      let count = DURATION;
      timerRef.current = setInterval(() => {
        count -= 1;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(timerRef.current);
          recorder.stop();
        }
      }, 1000);
    } catch {
      alert('Microphone access is required to record.');
    }
  };

  const stopEarly = () => {
    clearInterval(timerRef.current);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const submit = async () => {
    if (!audioBlob || !location) return;
    setPhase('uploading');

    const fd = new FormData();
    fd.append('audio', audioBlob, 'recording.webm');
    fd.append('lat', location.lat);
    fd.append('lng', location.lng);
    fd.append('tags', JSON.stringify(tags));
    fd.append('timestamp', new Date().toISOString());

    try {
      const res = await fetch('/api/recordings', { method: 'POST', body: fd });
      if (res.ok) {
        onSubmit();
      } else {
        alert('Upload failed — is the backend running?');
        setPhase('review');
      }
    } catch {
      alert('Could not reach the server. Is the backend running on port 3001?');
      setPhase('review');
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>RECORD SOUND</h2>
        <p className="loc-note">{locNote}</p>

        {phase === 'idle' && (
          <div className="rec-center">
            <div className="rec-ring" onClick={startRecording}>
              <span className="rec-icon">●</span>
              <span className="rec-label">TAP TO RECORD</span>
            </div>
            <p className="rec-hint">8-second audio clip</p>
          </div>
        )}

        {phase === 'recording' && (
          <div className="rec-center">
            <div className="rec-ring active" onClick={stopEarly} title="Tap to stop early">
              <span className="rec-count">{countdown}</span>
              <span className="rec-label">RECORDING</span>
            </div>
            <div className="wave-bars">
              {Array.from({ length: 22 }, (_, i) => (
                <div
                  key={i}
                  className="wave-bar"
                  style={{ animationDelay: `${i * 0.04}s`, animationDuration: `${0.5 + Math.random() * 0.4}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {phase === 'review' && (
          <div className="rec-review">
            <audio controls src={audioUrl} />

            <div className="tag-row">
              <input
                placeholder="Add tags (e.g. traffic, music, sirens)"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
              />
              <button onClick={addTag}>+</button>
            </div>

            {tags.length > 0 && (
              <div className="tags-wrap">
                {tags.map(t => (
                  <span key={t} className="tag-removable" onClick={() => setTags(prev => prev.filter(x => x !== t))}>
                    {t} ×
                  </span>
                ))}
              </div>
            )}

            <div className="review-actions">
              <button className="btn-ghost" onClick={() => { setAudioUrl(null); setAudioBlob(null); setPhase('idle'); }}>
                Re-record
              </button>
              <button className="btn-primary" onClick={submit}>
                Submit
              </button>
            </div>
          </div>
        )}

        {phase === 'uploading' && (
          <div className="spinner-wrap">
            <div className="spinner" />
            <span>Uploading to the sound map…</span>
          </div>
        )}
      </div>
    </div>
  );
}
