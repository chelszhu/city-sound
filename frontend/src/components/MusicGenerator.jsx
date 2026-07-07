import { useState, useRef } from 'react';

const TF_OPTIONS = [
  { value: '1h',  label: 'Last hour' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d',  label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

function sinceDate(tf) {
  const d = new Date();
  if (tf === '1h')  d.setHours(d.getHours() - 1);
  else if (tf === '24h') d.setDate(d.getDate() - 1);
  else if (tf === '7d')  d.setDate(d.getDate() - 7);
  else if (tf === '30d') d.setDate(d.getDate() - 30);
  return d.toISOString();
}

// Synthetic reverb impulse response
function makeReverb(ctx, seconds) {
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.5);
    }
  }
  return buf;
}

// Encode AudioBuffer → WAV ArrayBuffer
function encodeWav(buf) {
  const ch = buf.numberOfChannels;
  const sr = buf.sampleRate;
  const len = buf.length;
  const ab = new ArrayBuffer(44 + len * ch * 2);
  const v = new DataView(ab);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + len * ch * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, ch, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, len * ch * 2, true);
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(c)[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return ab;
}

export default function MusicGenerator({ onClose }) {
  const [tf, setTf] = useState('24h');
  const [status, setStatus] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null); // { url, count }
  const abortRef = useRef(false);

  const generate = async () => {
    setGenerating(true);
    setResult(null);
    abortRef.current = false;

    try {
      setStatus('Fetching recordings…');
      const p = new URLSearchParams({
        south: '40.4774', north: '40.9176',
        west: '-74.2591', east: '-73.7004',
      });
      if (tf !== 'all') p.append('since', sinceDate(tf));

      const recs = await fetch(`/api/recordings?${p}`).then(r => r.json());
      if (!recs.length) {
        setStatus('No recordings found. Add some sounds first!');
        setGenerating(false);
        return;
      }

      const sample = recs.slice(0, 16);
      setStatus(`Loading ${sample.length} sound samples…`);

      const AC = window.AudioContext || window.webkitAudioContext;
      const tmpCtx = new AC();

      const buffers = (
        await Promise.allSettled(
          sample.map(async r => {
            const ab = await fetch(`/uploads/${r.filename}`).then(x => x.arrayBuffer());
            return tmpCtx.decodeAudioData(ab);
          })
        )
      ).filter(x => x.status === 'fulfilled').map(x => x.value);

      tmpCtx.close();

      if (!buffers.length) {
        setStatus('Could not decode any audio files.');
        setGenerating(false);
        return;
      }

      setStatus('Composing generative soundscape…');

      const DURATION = 36;
      const SR = 44100;
      const offCtx = new OfflineAudioContext(2, SR * DURATION, SR);

      // Reverb
      const convolver = offCtx.createConvolver();
      convolver.buffer = makeReverb(offCtx, 3.5);
      convolver.connect(offCtx.destination);

      // Master with fade in/out
      const master = offCtx.createGain();
      master.gain.setValueAtTime(0, 0);
      master.gain.linearRampToValueAtTime(0.75, 2.5);
      master.gain.setValueAtTime(0.75, DURATION - 4);
      master.gain.linearRampToValueAtTime(0, DURATION);

      // Dry + wet
      const dry = offCtx.createGain(); dry.gain.value = 0.45; dry.connect(offCtx.destination);
      const wet = offCtx.createGain(); wet.gain.value = 0.55; wet.connect(convolver);
      master.connect(dry); master.connect(wet);

      // Low-pass filter for atmosphere
      const lpf = offCtx.createBiquadFilter();
      lpf.type = 'lowpass'; lpf.frequency.value = 3500; lpf.Q.value = 0.7;
      lpf.connect(master);

      // Schedule layers
      const N = buffers.length;
      for (let i = 0; i < N; i++) {
        const buf = buffers[i];
        const rec = sample[i];

        // Normalise lng to pan (-1 → 1) across NYC width
        const pan = Math.max(-0.9, Math.min(0.9, ((rec.lng + 74.26) / 0.56) * 2 - 1));
        // Normalise lat to pitch (south → slower, north → faster)
        const pitch = 0.6 + ((rec.lat - 40.47) / 0.44) * 0.8;

        const repeats = 2 + Math.floor(Math.random() * 3);

        for (let rep = 0; rep < repeats; rep++) {
          // Stagger entries: spread sounds across the full duration
          const t = (i / N) * DURATION * 0.6
                  + rep * (DURATION * 0.8 / repeats)
                  + (Math.random() - 0.5) * 2;
          const startAt = Math.max(0.1, Math.min(t, DURATION - 2));

          const src = offCtx.createBufferSource();
          src.buffer = buf;
          src.playbackRate.value = pitch * (0.85 + Math.random() * 0.3);

          const panner = offCtx.createStereoPanner();
          panner.pan.value = pan + (Math.random() - 0.5) * 0.2;

          const env = offCtx.createGain();
          const atkEnd = startAt + 0.4;
          const relStart = Math.min(startAt + buf.duration / src.playbackRate.value - 0.5, startAt + 5);
          env.gain.setValueAtTime(0, startAt);
          env.gain.linearRampToValueAtTime(0.35 + Math.random() * 0.25, atkEnd);
          env.gain.setValueAtTime(0.35 + Math.random() * 0.25, relStart);
          env.gain.linearRampToValueAtTime(0, relStart + 0.8);

          src.connect(panner);
          panner.connect(env);
          env.connect(lpf);
          src.start(startAt);
        }
      }

      setStatus('Rendering…');
      const rendered = await offCtx.startRendering();
      const wav = encodeWav(rendered);
      const blob = new Blob([wav], { type: 'audio/wav' });

      setResult({ url: URL.createObjectURL(blob), count: buffers.length });
      setStatus('');
    } catch (err) {
      console.error(err);
      setStatus(`Error: ${err.message}`);
    }

    setGenerating(false);
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h3>GENERATE SOUNDSCAPE</h3>
          <p>Generative composition from city sounds</p>
        </div>
        <button className="panel-close" onClick={onClose}>×</button>
      </div>

      <div className="gen-body">
        <div className="gen-section">
          <label>TIMEFRAME</label>
          <div className="tf-bar" style={{ padding: 0, border: 'none' }}>
            {TF_OPTIONS.map(o => (
              <button key={o.value} className={`tf-btn ${tf === o.value ? 'active' : ''}`} onClick={() => setTf(o.value)}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="gen-section" style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <label>HOW IT WORKS</label>
          <p>
            Pulls all submissions from the selected window and weaves them into a 36-second
            spatial soundscape. Each recording's position on the NYC map controls its stereo pan,
            and its latitude shifts the playback pitch. Convolution reverb and random envelope
            layering create the generative feel.
          </p>
        </div>

        {status && (
          <div className="gen-status">
            {generating && <span className="spinner" style={{ display: 'inline-block', width: 10, height: 10, verticalAlign: 'middle', marginRight: 6, borderWidth: 1.5 }} />}
            {status}
          </div>
        )}

        <button className="btn-generate" onClick={generate} disabled={generating}>
          {generating ? 'GENERATING…' : '♪ GENERATE'}
        </button>

        {result && (
          <div className="generated-result">
            <h4>✓ COMPOSED FROM {result.count} SAMPLES</h4>
            <audio controls src={result.url} />
            <a href={result.url} download="nyc-soundscape.wav" className="btn-dl">
              ↓ Download WAV
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
