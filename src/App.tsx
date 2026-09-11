import { useState } from 'react';
import { Layout } from './components/Layout';
import { LiveMap } from './components/LiveMap';
import { SensorsPage } from './pages/SensorsPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { FusionPage } from './pages/FusionPage';
import { sensorManager } from './engine/SensorManager';
import { demoManager } from './engine/DemoManager';
import { Compass, Play, Presentation } from 'lucide-react';
import { useNavStore } from './store/useNavStore';

function App() {
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const { navState } = useNavStore();

  const handleStartLive = async () => {
    const granted = await sensorManager.requestPermissions();
    if (granted || 'geolocation' in navigator) {
      sensorManager.start();
    }
    setStarted(true);
  };

  const handleStartDemo = () => {
    demoManager.start();
    setStarted(true);
  };

  const handleToggleGPS = () => {
    if (navState.isDemoMode) {
      demoManager.toggleGps(!navState.gpsActive);
    } else {
      // In real mode, we can't physically toggle the GPS easily in browser, 
      // but we could simulate a jammer for the prototype by ignoring GPS.
      alert("In Live Device Mode, you must physically lose GPS signal (e.g. go indoors).");
    }
  };

  if (!started) {
    return (
      <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-panel border border-border rounded-xl p-8 flex flex-col items-center text-center shadow-2xl">
          <Compass className="w-16 h-16 text-primary mb-6" />
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">NAVISENSE</h1>
          <p className="text-[10px] text-muted tracking-widest uppercase mb-8">GPS-DENIED NAVIGATION SYSTEM</p>
          
          <p className="text-sm text-gray-400 mb-8 leading-relaxed">
            Real-time inertial navigation using smartphone sensors, dead reckoning, sensor fusion and AI-assisted drift correction.
          </p>

          <div className="w-full space-y-4">
            <button 
              onClick={handleStartLive}
              className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>START LIVE SESSION</span>
            </button>
            
            <button 
              onClick={handleStartDemo}
              className="w-full flex items-center justify-center space-x-2 bg-transparent border border-border hover:bg-white/5 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              <Presentation className="w-4 h-4 text-muted" />
              <span>START DEMO MODE</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* Controls Overlay for Demo Mode */}
      {navState.isDemoMode && activeTab === 'map' && (
        <div className="absolute bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-4 bg-panel/90 backdrop-blur border border-border p-2 rounded-lg shadow-xl">
          <button 
            onClick={handleToggleGPS}
            className={`px-4 py-2 rounded text-xs font-bold tracking-wider uppercase transition-colors ${navState.gpsActive ? 'bg-danger/20 text-danger hover:bg-danger/30' : 'bg-success/20 text-success hover:bg-success/30'}`}
          >
            {navState.gpsActive ? 'SIMULATE GPS LOSS' : 'RESTORE GPS SIGNAL'}
          </button>
        </div>
      )}

      {activeTab === 'map' && <LiveMap />}
      {activeTab === 'sensors' && <SensorsPage />}
      {activeTab === 'fusion' && <FusionPage />}
      {activeTab === 'diagnostics' && <DiagnosticsPage />}
    </Layout>
  );
}

export default App;
