import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getGridCellSize } from '../utils/grid.js';

const NYC_CENTER = [40.7128, -74.006];
const NYC_BOUNDS = L.latLngBounds([40.4774, -74.2591], [40.9176, -73.7004]);

export default function NycMap({ onCellClick, activeCell, refreshKey }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const gridRef = useRef(null);
  const activeCellRef = useRef(null);
  const [zoom, setZoom] = useState(12);

  const drawGrid = async (map) => {
    const bounds = map.getBounds();
    const z = map.getZoom();

    // Remove old grid
    if (gridRef.current) { gridRef.current.remove(); gridRef.current = null; }

    let gridData = [];
    try {
      const p = new URLSearchParams({
        south: bounds.getSouth(), north: bounds.getNorth(),
        west: bounds.getWest(), east: bounds.getEast(),
        zoom: z,
      });
      const res = await fetch(`/api/grid?${p}`);
      gridData = await res.json();
    } catch (_) {}

    const cellMap = {};
    let maxCount = 0;
    for (const d of gridData) {
      cellMap[`${d.row}_${d.col}`] = d.count;
      if (d.count > maxCount) maxCount = d.count;
    }

    const cellSize = getGridCellSize(z);
    const startRow = Math.floor(bounds.getSouth() / cellSize);
    const endRow   = Math.ceil(bounds.getNorth() / cellSize);
    const startCol = Math.floor(bounds.getWest() / cellSize);
    const endCol   = Math.ceil(bounds.getEast() / cellSize);

    const layer = L.layerGroup();

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const count = cellMap[`${row}_${col}`] ?? 0;
        const ratio = maxCount > 0 ? count / maxCount : 0;
        const fillOpacity = count > 0 ? 0.12 + ratio * 0.5 : 0.03;
        const fillColor   = count > 0 ? '#00ff80' : 'transparent';

        const rect = L.rectangle(
          [[row * cellSize, col * cellSize], [(row + 1) * cellSize, (col + 1) * cellSize]],
          {
            color: '#00ff8028',
            weight: 0.5,
            fillColor,
            fillOpacity,
            className: 'grid-cell',
          }
        );

        rect.on('mouseover', () => {
          rect.setStyle({ color: '#ff640088', weight: 1.5, fillOpacity: Math.max(fillOpacity, 0.18) });
          rect.bringToFront();
        });
        rect.on('mouseout', () => {
          rect.setStyle({ color: '#00ff8028', weight: 0.5, fillOpacity });
        });
        rect.on('click', () => {
          onCellClick({
            row, col, cellSize,
            count,
            bounds: {
              south: row * cellSize,
              north: (row + 1) * cellSize,
              west: col * cellSize,
              east: (col + 1) * cellSize,
            },
          });
        });

        layer.addLayer(rect);
      }
    }

    layer.addTo(map);
    gridRef.current = layer;
  };

  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: NYC_CENTER,
      zoom: 12,
      minZoom: 10,
      maxZoom: 17,
      maxBounds: NYC_BOUNDS,
      maxBoundsViscosity: 0.85,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '©<a href="https://www.openstreetmap.org/copyright">OSM</a> ©<a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    const onUpdate = () => {
      setZoom(map.getZoom());
      drawGrid(map);
    };

    map.on('moveend', onUpdate);
    map.on('zoomend', onUpdate);
    drawGrid(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Refresh grid when recordings change
  useEffect(() => {
    if (mapRef.current) drawGrid(mapRef.current);
  }, [refreshKey]);

  // Highlight active cell
  useEffect(() => {
    if (activeCellRef.current) {
      activeCellRef.current.remove();
      activeCellRef.current = null;
    }
    if (activeCell && mapRef.current) {
      const { bounds } = activeCell;
      const hl = L.rectangle(
        [[bounds.south, bounds.west], [bounds.north, bounds.east]],
        { color: '#ff6400', weight: 2, fillColor: '#ff6400', fillOpacity: 0.15 }
      ).addTo(mapRef.current);
      activeCellRef.current = hl;
    }
  }, [activeCell]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-root" />
      <div className="zoom-badge">Z {zoom}</div>
      <div className="map-legend">
        <span>0</span>
        <div className="legend-gradient" />
        <span>DENSITY</span>
      </div>
    </div>
  );
}
