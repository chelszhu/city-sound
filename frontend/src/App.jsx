import { useState, useCallback } from 'react';
import NycMap from './components/NycMap.jsx';
import RecordModal from './components/RecordModal.jsx';
import TimelinePanel from './components/TimelinePanel.jsx';
import MusicGenerator from './components/MusicGenerator.jsx';
import './App.css';

export default function App() {
  const [showRecord, setShowRecord] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [showMusic, setShowMusic] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCellClick = useCallback((cell) => {
    setSelectedCell(cell);
    setShowMusic(false);
  }, []);

  const handleRecordSubmit = useCallback(() => {
    setRefreshKey(k => k + 1);
    setShowRecord(false);
  }, []);

  const openMusic = useCallback(() => {
    setShowMusic(true);
    setSelectedCell(null);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <span className="header-dot" />
          <h1>SOUND IN NYC</h1>
        </div>
        <div className="header-actions">
          <button className="btn-music" onClick={openMusic}>
            ♪ Generate
          </button>
          <button className="btn-record" onClick={() => setShowRecord(true)}>
            ● REC
          </button>
        </div>
      </header>

      <NycMap
        onCellClick={handleCellClick}
        activeCell={selectedCell}
        refreshKey={refreshKey}
      />

      {showRecord && (
        <RecordModal
          onClose={() => setShowRecord(false)}
          onSubmit={handleRecordSubmit}
        />
      )}

      {selectedCell && (
        <TimelinePanel
          cell={selectedCell}
          onClose={() => setSelectedCell(null)}
        />
      )}

      {showMusic && (
        <MusicGenerator onClose={() => setShowMusic(false)} />
      )}
    </div>
  );
}
