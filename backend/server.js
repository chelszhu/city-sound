const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${uuidv4()}.webm`),
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

app.post('/api/recordings', upload.single('audio'), (req, res) => {
  const { lat, lng, tags, timestamp } = req.body;
  if (!req.file || lat == null || lng == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const id = uuidv4();
  db.saveRecording({
    id,
    filename: req.file.filename,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    tags: tags ? JSON.parse(tags) : [],
    timestamp: timestamp || new Date().toISOString(),
  });
  res.json({ id, filename: req.file.filename });
});

app.get('/api/recordings', (req, res) => {
  const { south, north, west, east, since, until } = req.query;
  res.json(db.getRecordings({ south, north, west, east, since, until }));
});

app.get('/api/grid', (req, res) => {
  const { south, north, west, east, zoom } = req.query;
  res.json(db.getGridData({ south, north, west, east, zoom: parseInt(zoom) || 12 }));
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
