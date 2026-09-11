import { useState } from 'react';
import { Layout } from './components/Layout';
import { LiveMap } from './components/LiveMap';
import { SensorsPage } from './pages/SensorsPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { FusionPage } from './pages/FusionPage';
import { FieldTestPage } from './pages/FieldTestPage';
import { sensorManager } from './engine/SensorManager';
import { demoManager } from './engine/DemoManager';
import { navEngine } from './engine/NavEngine';
import { Compass, Play, Presentation } from 'lucide-react';
import { useNavStore } from './store/useNavStore';

function App() {
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const { navState } = useNavStore();

  const handleStartLive = async () => {
    demoManager.stop();
    sensorManager.stop();
    navEngine.reset();
    useNavStore.getState().resetTrails();
    useNavStore.getState().updateNavState({
      isDemoMode: false,
      mode: 'IDLE',
      origin: null,
      gps: null,
      estimatedPosition: null,
      gpsActive: false,
    });

    await sensorManager.requestPermissions();
    sensorManager.start();
    setStarted(true);
  };

  const handleStartDemo = () => {
    sensorManager.stop();
    navEngine.reset();
    useNavStore.getState().resetTrails();
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
      <div className="min-h-[100dvh] w-full bg-background flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto safe-pt safe-pb">
        <div className="max-w-md w-full bg-panel border border-border rounded-2xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl my-auto">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-5">
            <Compass className="w-12 h-12 sm:w-16 sm:h-16 text-primary animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-1.5">NAVISENSE</h1>
          <p className="text-[10px] text-muted tracking-widest uppercase font-mono mb-6">GPS-DENIED NAVIGATION SYSTEM</p>
          
          <p className="text-xs sm:text-sm text-gray-400 mb-8 leading-relaxed">
            Real-time inertial navigation using smartphone sensors, dead reckoning, sensor fusion and AI-assisted drift correction.
          </p>

          <div className="w-full space-y-3.5">
            <button 
              onClick={handleStartLive}
              className="w-full min-h-[48px] flex items-center justify-center space-x-2 bg-primary hover:bg-blue-600 active:scale-[0.99] text-white font-medium py-3 px-4 rounded-xl transition-all cursor-pointer shadow-lg shadow-primary/25"
            >
              <Play className="w-4 h-4 fill-white" />
              <span className="tracking-wide text-xs sm:text-sm">START LIVE SESSION</span>
            </button>
            
            <button 
              onClick={handleStartDemo}
              className="w-full min-h-[48px] flex items-center justify-center space-x-2 bg-panel border border-border hover:border-muted/50 hover:bg-white/5 active:scale-[0.99] text-white font-medium py-3 px-4 rounded-xl transition-all cursor-pointer"
            >
              <Presentation className="w-4 h-4 text-muted" />
              <span className="tracking-wide text-xs sm:text-sm">START DEMO MODE</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* Floating GPS Loss Simulator for Demo Mode */}
      {navState.isDemoMode && activeTab === 'map' && (
        <div className="absolute bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-4 bg-panel/95 backdrop-blur-md border border-border p-1.5 rounded-xl shadow-2xl max-w-[90vw]">
          <button 
            onClick={handleToggleGPS}
            className={`min-h-[44px] px-4 sm:px-6 py-2 rounded-lg text-xs font-bold tracking-wider uppercase transition-all cursor-pointer shadow-sm flex items-center space-x-2 ${
              navState.gpsActive 
                ? 'bg-danger/20 text-danger hover:bg-danger/30 border border-danger/30' 
                : 'bg-success/20 text-success hover:bg-success/30 border border-success/30'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${navState.gpsActive ? 'bg-danger' : 'bg-success animate-ping'}`} />
            <span>{navState.gpsActive ? 'Simulate GPS Loss' : 'Restore GPS Signal'}</span>
          </button>
        </div>
      )}

      {activeTab === 'map' && <LiveMap />}
      {activeTab === 'sensors' && <SensorsPage />}
      {activeTab === 'fusion' && <FusionPage />}
      {activeTab === 'diagnostics' && <DiagnosticsPage />}
      {activeTab === 'field-test' && <FieldTestPage />}
    </Layout>
  );
}

export default App;
