import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from '../context/ThemeContext.jsx';

const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

function LivePanner({ points }) {
  const map = useMap();
  const lastLen = useRef(0);
  useEffect(() => {
    if (points.length > lastLen.current && points.length > 0) {
      const last = points[points.length - 1];
      map.panTo([last.lat, last.lng], { animate: true, duration: 0.5 });
      lastLen.current = points.length;
    }
  }, [points, map]);
  return null;
}

export function RouteMap({ points, height = 280, liveMode = false }) {
  const { isDark } = useTheme();
  const tileUrl = isDark ? DARK_TILES : LIGHT_TILES;

  if (!points || points.length === 0) {
    return (
      <div
        className="bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500"
        style={{ height }}
      >
        No GPS data yet
      </div>
    );
  }

  const latLngs = points.map((p) => [p.lat, p.lng]);
  const center = [points[0].lat, points[0].lng];
  const last = points[points.length - 1];

  const startIcon = L.divIcon({
    html: '<div class="w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  const endIcon = L.divIcon({
    html: '<div class="w-4 h-4 bg-red-400 rounded-full border-2 border-white shadow-lg"></div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ height }}>
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer url={tileUrl} />
        <Polyline positions={latLngs} color="#22c55e" weight={4} opacity={0.9} />
        <Marker position={[points[0].lat, points[0].lng]} icon={startIcon} />
        {points.length > 1 && <Marker position={[last.lat, last.lng]} icon={endIcon} />}
        {liveMode && <LivePanner points={points} />}
      </MapContainer>
    </div>
  );
}
