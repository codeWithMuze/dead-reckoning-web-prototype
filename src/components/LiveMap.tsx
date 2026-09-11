import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useNavStore } from '../store/useNavStore';
import type { } from '../types';

// Custom icons to avoid broken image links in Vite
const createIcon = (color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const gpsIcon = createIcon('#10b981'); // success green
const estIcon = createIcon('#3b82f6'); // primary blue

export const LiveMap = () => {
  const { navState, gpsTrail, drTrail, fusedTrail } = useNavStore();
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    if (mapRef.current && navState.estimatedPosition) {
      mapRef.current.setView([navState.estimatedPosition.latitude, navState.estimatedPosition.longitude]);
    }
  }, [navState.estimatedPosition?.latitude, navState.estimatedPosition?.longitude]);

  // Center map initially if position exists
  const center: [number, number] = navState.estimatedPosition 
    ? [navState.estimatedPosition.latitude, navState.estimatedPosition.longitude]
    : [40.7128, -74.0060]; // Default SF

  return (
    <div className="w-full h-full relative">
      <MapContainer 
        center={center} 
        zoom={18} 
        scrollWheelZoom={true} 
        className="w-full h-full z-0"
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* GPS Trail */}
        {gpsTrail.length > 1 && (
          <Polyline positions={gpsTrail} color="#10b981" weight={3} opacity={0.5} dashArray="5, 5" />
        )}

        {/* Dead Reckoning Trail */}
        {drTrail.length > 1 && (
          <Polyline positions={drTrail} color="#f59e0b" weight={2} opacity={0.7} dashArray="2, 4" />
        )}

        {/* Fused EKF Trail */}
        {fusedTrail.length > 1 && (
          <Polyline positions={fusedTrail} color="#3b82f6" weight={4} opacity={0.9} />
        )}

        {/* Current GPS Position */}
        {navState.gpsActive && navState.gps && (
          <Marker position={[navState.gps.latitude, navState.gps.longitude]} icon={gpsIcon} />
        )}

        {/* Current Estimated Position & Uncertainty */}
        {navState.estimatedPosition && (
          <>
            <Circle 
              center={[navState.estimatedPosition.latitude, navState.estimatedPosition.longitude]} 
              radius={navState.uncertainty || 2} 
              pathOptions={{ fillColor: '#3b82f6', color: '#3b82f6', weight: 1, fillOpacity: 0.15 }}
            />
            <Marker 
              position={[navState.estimatedPosition.latitude, navState.estimatedPosition.longitude]} 
              icon={estIcon} 
            />
          </>
        )}
      </MapContainer>

      {/* Telemetry Overlay Panel */}
      <div className="absolute top-4 right-4 z-10 w-64 flex flex-col space-y-2 pointer-events-none">
        <MetricCard label="SPEED" value={(Math.sqrt(navState.estimatedVelocity.vn**2 + navState.estimatedVelocity.ve**2)).toFixed(2)} unit="m/s" />
        <MetricCard label="HEADING" value={navState.heading.toFixed(0)} unit="°" />
        <MetricCard label="UNCERTAINTY" value={navState.uncertainty.toFixed(1)} unit="m" />
        <MetricCard label="GPS ACCURACY" value={navState.gps ? navState.gps.accuracy.toFixed(1) : '---'} unit="m" />
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, unit }: { label: string, value: string | number, unit: string }) => (
  <div className="bg-panel/90 backdrop-blur border border-border rounded-lg p-3 shadow-lg flex items-center justify-between">
    <span className="text-[10px] text-muted font-semibold tracking-widest">{label}</span>
    <div className="font-mono flex items-baseline space-x-1">
      <span className="text-white text-lg font-medium">{value}</span>
      <span className="text-muted text-xs">{unit}</span>
    </div>
  </div>
);
