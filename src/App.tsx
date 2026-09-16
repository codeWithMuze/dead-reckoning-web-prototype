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
import { 
  Compass, 
  Play, 
  Presentation, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Radio,
  Lock,
  Smartphone
} from 'lucide-react';
import { useNavStore } from './store/useNavStore';

function App() {
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
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
      alert("In Live Device Mode, you must physically lose GPS signal (e.g. walk indoors or into a basement).");
    }
  };

  if (!started) {
    return (
      <div className="relative min-h-[100dvh] w-full bg-black text-[#f5f5f7] flex flex-col items-center justify-center p-4 sm:p-6 overflow-x-hidden safe-pt safe-pb selection:bg-blue-600/40">
        {/* Apple Atmospheric Lighting & Aerospace Radar Geometry */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Top Primary Sapphire Ambient Spotlight */}
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[550px] bg-gradient-to-b from-blue-600/25 via-blue-500/10 to-transparent blur-3xl rounded-full" />
          
          {/* Subtle Deep Indigo Secondary Ambient Light */}
          <div className="absolute -bottom-40 right-1/4 w-[600px] h-[500px] bg-indigo-600/15 blur-3xl rounded-full" />

          {/* Aerospace HUD Inertial Coordinate Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[850px] pointer-events-none opacity-20 hidden md:block">
            <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-radar-sweep" />
            <div className="absolute inset-[140px] rounded-full border border-white/10" />
            <div className="absolute inset-[280px] rounded-full border border-dashed border-blue-400/20" />
            {/* Coordinate Crosshairs */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-blue-400/30 to-transparent" />
            <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
          </div>
        </div>

        {/* Executive Presentation Card */}
        <div className="relative z-10 max-w-xl w-full apple-glass rounded-[32px] p-6 sm:p-9 flex flex-col items-center text-center my-auto">
          
          {/* Top Status Capsule Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 backdrop-blur-md mb-6 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono tracking-wider text-gray-300 font-semibold uppercase">
              ON-DEVICE SENSOR FUSION ENGINE • v2.4
            </span>
          </div>

          {/* Apple-Grade Squircle App Icon with Multi-stop Sheen & Gyro Dial */}
          <div className="relative mb-6 group cursor-default">
            {/* Rotating Ambient Outer Glow */}
            <div className="absolute -inset-2 rounded-[34px] bg-gradient-to-r from-blue-600/30 via-indigo-500/30 to-blue-400/30 blur-xl opacity-75 group-hover:opacity-100 transition-opacity animate-pulse-soft" />

            {/* Apple Continuous Squircle */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[26px] sm:rounded-[30px] bg-gradient-to-b from-[#1d7fff] via-[#0052d4] to-[#041a4a] p-[1.5px] shadow-[0_16px_36px_rgba(0,102,255,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)] flex items-center justify-center">
              {/* Inner Gloss Layer */}
              <div className="w-full h-full rounded-[24.5px] sm:rounded-[28.5px] bg-gradient-to-b from-white/15 to-transparent flex items-center justify-center relative overflow-hidden">
                {/* 4 Precision Cardinal Marks */}
                <span className="absolute top-1 text-[8px] font-mono font-bold text-white/50">N</span>
                <span className="absolute bottom-1 text-[8px] font-mono font-bold text-white/40">S</span>
                <span className="absolute left-1.5 text-[8px] font-mono font-bold text-white/40">W</span>
                <span className="absolute right-1.5 text-[8px] font-mono font-bold text-white/40">E</span>
                
                {/* Center Compass Needle Icon */}
                <div className="relative p-3 rounded-full bg-black/25 backdrop-blur-sm border border-white/20 shadow-inner">
                  <Compass className="w-9 h-9 sm:w-11 sm:h-11 text-white stroke-[1.75] drop-shadow-md" />
                </div>
              </div>
            </div>
          </div>

          {/* Product Headline & Executive Typography */}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-b from-white via-neutral-100 to-neutral-400 bg-clip-text text-transparent mb-1.5">
            NAVISENSE
          </h1>
          <p className="text-[11px] sm:text-xs font-mono font-semibold tracking-widest text-blue-400 uppercase mb-4">
            AUTONOMOUS DEAD RECKONING • GPS-DENIED NAVIGATION
          </p>
          
          <p className="text-xs sm:text-sm text-neutral-300/90 max-w-lg mb-6 leading-relaxed font-normal">
            Precision smartphone inertial navigation engineered for subterranean transit, multi-story facilities, and signal-denied canyons. Couples 60Hz IMU telemetry with Extended Kalman Filtering (EKF) and Zero-Velocity updates.
          </p>

          {/* Human-Designed Executive Capability Showcase */}
          <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-7 text-left">
            <div className="apple-glass-card rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center space-x-2 mb-1.5 text-blue-400">
                <Cpu className="w-4 h-4" />
                <span className="text-[11px] font-bold text-white font-mono">EKF Fusion</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-snug">
                60Hz kinematic prediction using quaternion attitude transformation.
              </p>
            </div>

            <div className="apple-glass-card rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center space-x-2 mb-1.5 text-emerald-400">
                <Zap className="w-4 h-4" />
                <span className="text-[11px] font-bold text-white font-mono">ZUPT Gating</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-snug">
                Zero-velocity updates cancel double-integration accelerometer drift.
              </p>
            </div>

            <div className="apple-glass-card rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center space-x-2 mb-1.5 text-purple-400">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[11px] font-bold text-white font-mono">Local & Private</span>
              </div>
              <p className="text-[10px] text-neutral-400 leading-snug">
                Zero telemetry leaves device. 100% client-side WebAssembly execution.
              </p>
            </div>
          </div>

          {/* Action Hub (Cupertino Primary & Secondary Buttons) */}
          <div className="w-full space-y-3">
            {/* Primary Action Button */}
            <button 
              onClick={handleStartLive}
              className="apple-btn-primary w-full min-h-[56px] flex items-center justify-between px-5 py-3 rounded-2xl cursor-pointer group select-none text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-sm">
                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-wide text-white leading-tight">
                    Start Live Field Session
                  </span>
                  <span className="text-[11px] text-blue-100/80 font-normal leading-tight">
                    Uses phone accelerometer & gyroscope (HTTPS)
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 text-white/90 group-hover:translate-x-0.5 transition-transform">
                <span className="text-[11px] font-mono font-medium hidden sm:inline">60Hz</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
            
            {/* Secondary Action Button */}
            <button 
              onClick={handleStartDemo}
              className="apple-btn-secondary w-full min-h-[56px] flex items-center justify-between px-5 py-3 rounded-2xl cursor-pointer group select-none text-left"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
                  <Presentation className="w-4 h-4 text-gray-300" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-wide text-white leading-tight">
                    Launch Interactive Simulation
                  </span>
                  <span className="text-[11px] text-gray-400 font-normal leading-tight">
                    Pre-recorded walk trajectory with outage toggles
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-gray-300 border border-white/10">
                Instant Demo
              </span>
            </button>
          </div>

          {/* Expandable Field Testing Guidelines & Hardware Context */}
          <div className="w-full mt-5 pt-4 border-t border-white/[0.08]">
            <button
              onClick={() => setGuidelinesOpen(!guidelinesOpen)}
              className="w-full flex items-center justify-between text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer py-1"
            >
              <div className="flex items-center space-x-2">
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                <span>Field Guidelines & Sensor Permission Checklist</span>
              </div>
              {guidelinesOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {guidelinesOpen && (
              <div className="mt-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-left space-y-2 text-xs text-neutral-300 animate-in fade-in duration-200">
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold font-mono">1.</span>
                  <div>
                    <strong className="text-white">Motion Sensor Access:</strong> On iOS Safari or Android Chrome, grant sensor permissions when prompted to read the IMU.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold font-mono">2.</span>
                  <div>
                    <strong className="text-white">Device Orientation:</strong> Hold the phone flat or in front of your chest facing forward while walking for optimal dead reckoning.
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-blue-400 font-bold font-mono">3.</span>
                  <div>
                    <strong className="text-white">Testing GPS Outages:</strong> Use the interactive top-bar toggle to mute GPS fixes, or walk deep into a basement or concrete building.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Executive System Context Readiness Footer */}
          <div className="w-full mt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-[10px] font-mono text-neutral-400 pt-2">
            <div className="flex items-center space-x-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>TLS/HTTPS Secure Context</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center space-x-1">
              <Smartphone className="w-3 h-3 text-blue-400" />
              <span>DeviceMotion 60Hz</span>
            </div>
            <span className="text-white/20">•</span>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>ZUPT Velocity Gating</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {/* Apple Dynamic Island Style Floating GPS Outage Controller for Demo Mode */}
      {navState.isDemoMode && activeTab === 'map' && (
        <div className="absolute bottom-20 md:bottom-8 left-1/2 transform -translate-x-1/2 z-20 apple-glass rounded-full px-4 py-2 shadow-2xl flex items-center space-x-3 select-none max-w-[92vw]">
          <div className="flex items-center space-x-2">
            <span className={`relative flex h-2.5 w-2.5`}>
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                navState.gpsActive ? 'bg-emerald-400' : 'bg-rose-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                navState.gpsActive ? 'bg-emerald-500' : 'bg-rose-500'
              }`} />
            </span>
            <span className="text-[11px] font-mono font-medium text-gray-300 hidden sm:inline">
              Simulation Scenario
            </span>
          </div>

          <div className="h-4 w-px bg-white/15" />

          <button 
            onClick={handleToggleGPS}
            className={`px-3.5 py-1 rounded-full text-xs font-bold font-mono tracking-wider transition-all cursor-pointer shadow-md flex items-center space-x-2 active:scale-95 ${
              navState.gpsActive 
                ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40' 
                : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40'
            }`}
          >
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
