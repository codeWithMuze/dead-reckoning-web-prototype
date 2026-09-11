import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, Marker } from 'react-leaflet';
import L from 'leaflet';
import { useNavStore } from '../store/useNavStore';
import { Plus, Minus, LocateFixed, Info, ChevronDown, ChevronUp } from 'lucide-react';

// Custom icons to avoid broken image links in Vite
const createIcon = (color: string) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.6);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7]
});

const gpsIcon = createIcon('#10b981'); // success green
const estIcon = createIcon('#3b82f6'); // primary blue

export const LiveMap = () => {
  const { navState, gpsTrail, drTrail, fusedTrail } = useNavStore();
  const mapRef = useRef<L.Map>(null);
  const [hudExpanded, setHudExpanded] = useState(true);
  const [showLegend, setShowLegend] = useState(false);

  useEffect(() => {
    if (mapRef.current && navState.estimatedPosition) {
      mapRef.current.setView([navState.estimatedPosition.latitude, navState.estimatedPosition.longitude]);
    }
  }, [navState.estimatedPosition?.latitude, navState.estimatedPosition?.longitude]);

  // Center map initially if position exists
  const center: [number, number] = navState.estimatedPosition 
    ? [navState.estimatedPosition.latitude, navState.estimatedPosition.longitude]
    : [40.7128, -74.0060]; // Default SF

  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapRef.current && navState.estimatedPosition) {
      mapRef.current.setView([navState.estimatedPosition.latitude, navState.estimatedPosition.longitude], 18, {
        animate: true,
      });
    }
  };

  const speed = (Math.sqrt(navState.estimatedVelocity.vn ** 2 + navState.estimatedVelocity.ve ** 2)).toFixed(2);
  const heading = navState.heading.toFixed(0);
  const uncertainty = navState.uncertainty.toFixed(1);
  const gpsAccuracy = navState.gps ? navState.gps.accuracy.toFixed(1) : '---';

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col">
      <MapContainer 
        center={center} 
        zoom={18} 
        scrollWheelZoom={true} 
        className="w-full h-full z-0 flex-1"
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* GPS Trail */}
        {gpsTrail.length > 1 && (
          <Polyline positions={gpsTrail} color="#10b981" weight={3} opacity={0.6} dashArray="6, 6" />
        )}

        {/* Dead Reckoning Trail */}
        {drTrail.length > 1 && (
          <Polyline positions={drTrail} color="#f59e0b" weight={2.5} opacity={0.75} dashArray="3, 5" />
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
              pathOptions={{ fillColor: '#3b82f6', color: '#3b82f6', weight: 1.5, fillOpacity: 0.15 }}
            />
            <Marker 
              position={[navState.estimatedPosition.latitude, navState.estimatedPosition.longitude]} 
              icon={estIcon} 
            />
          </>
        )}
      </MapContainer>

      {/* Responsive Telemetry HUD (Adaptive Header/Drawer on Mobile, Floating on Desktop) */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 left-2 sm:left-auto z-10 sm:w-64 max-w-[calc(100vw-1rem)] flex flex-col pointer-events-auto">
        {/* Toggle Bar for Mobile */}
        <div className="flex items-center justify-between sm:hidden bg-panel/90 backdrop-blur border border-border rounded-lg px-3 py-1.5 mb-1.5 shadow-md">
          <span className="text-[10px] font-bold tracking-widest text-muted uppercase">Telemetry HUD</span>
          <button 
            onClick={() => setHudExpanded(!hudExpanded)}
            className="p-1 text-gray-300 hover:text-white cursor-pointer"
            aria-label="Toggle Telemetry HUD"
          >
            {hudExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* HUD Metric Cards */}
        {hudExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-2">
            <MetricCard label="SPEED" value={speed} unit="m/s" />
            <MetricCard label="HEADING" value={heading} unit="°" />
            <MetricCard label="UNCERTAINTY" value={uncertainty} unit="m" />
            <MetricCard label="GPS ACCURACY" value={gpsAccuracy} unit="m" />
          </div>
        )}
      </div>

      {/* Floating Map Action Controls (Recenter, Zoom, Legend) */}
      <div className="absolute bottom-20 md:bottom-6 right-3 sm:right-6 z-10 flex flex-col space-y-2 pointer-events-auto">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="w-11 h-11 bg-panel/90 hover:bg-panel backdrop-blur border border-border rounded-xl text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer active:scale-95"
          title="Map Legend"
          aria-label="Map Legend"
        >
          <Info className="w-5 h-5 text-primary" />
        </button>

        <button
          onClick={handleRecenter}
          className="w-11 h-11 bg-panel/90 hover:bg-panel backdrop-blur border border-border rounded-xl text-white flex items-center justify-center shadow-lg transition-colors cursor-pointer active:scale-95"
          title="Center My Position"
          aria-label="Center My Position"
        >
          <LocateFixed className="w-5 h-5 text-success" />
        </button>

        <div className="flex flex-col bg-panel/90 backdrop-blur border border-border rounded-xl shadow-lg overflow-hidden">
          <button
            onClick={handleZoomIn}
            className="w-11 h-11 hover:bg-white/5 text-white flex items-center justify-center border-b border-border transition-colors cursor-pointer active:scale-95"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-11 h-11 hover:bg-white/5 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Map Legend Modal / Card */}
      {showLegend && (
        <div className="absolute bottom-20 md:bottom-6 left-3 sm:left-6 z-10 bg-panel/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-2xl max-w-55 pointer-events-auto text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
            <span className="font-bold text-[10px] tracking-wider text-muted uppercase">Map Legend</span>
            <button onClick={() => setShowLegend(false)} className="text-muted hover:text-white cursor-pointer">✕</button>
          </div>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-0.5 border-t-2 border-dashed border-[#10b981]"></span>
              <span className="text-gray-300">GPS Track</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-0.5 border-t-2 border-dotted border-[#f59e0b]"></span>
              <span className="text-gray-300">Dead Reckoning</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-1 bg-[#3b82f6] rounded"></span>
              <span className="text-primary font-bold">EKF Fused Track</span>
            </div>
            <div className="flex items-center space-x-2 pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] border border-white"></span>
              <span className="text-gray-400 text-[10px]">Estimated Fix</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ label, value, unit }: { label: string, value: string | number, unit: string }) => (
  <div className="bg-panel/90 backdrop-blur border border-border rounded-lg p-2.5 sm:p-3 shadow-lg flex items-center justify-between">
    <span className="text-[9px] sm:text-[10px] text-muted font-semibold tracking-wider">{label}</span>
    <div className="font-mono flex items-baseline space-x-1">
      <span className="text-white text-base sm:text-lg font-medium">{value}</span>
      <span className="text-muted text-[10px] sm:text-xs">{unit}</span>
    </div>
  </div>
);
