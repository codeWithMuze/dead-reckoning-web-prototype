import { useState } from 'react';
import { useNavStore } from '../store/useNavStore';
import { Activity, Compass, Map, Settings, Wifi, WifiOff, Cpu, Crosshair, FlaskConical, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NavLink = ({ active, icon: Icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors border-l-2 cursor-pointer",
      active ? "bg-[#16161a] border-primary text-white" : "border-transparent text-muted hover:bg-[#16161a] hover:text-gray-200"
    )}
  >
    <Icon className="w-5 h-5 flex-shrink-0" />
    <span>{label}</span>
  </button>
);

const MobileTabButton = ({ active, icon: Icon, label, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={cn(
      "flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 transition-colors cursor-pointer relative",
      active ? "text-primary font-semibold" : "text-muted hover:text-gray-200"
    )}
    aria-label={label}
  >
    <Icon className="w-5 h-5 mb-0.5" />
    <span className="text-[10px] tracking-wider uppercase leading-none">{label}</span>
    {active && (
      <span className="absolute bottom-0 w-8 h-0.5 bg-primary rounded-full" />
    )}
  </button>
);

export const Layout = ({ children, activeTab, setActiveTab }: any) => {
  const { navState, gpsInputEnabled, setGpsInputEnabled } = useNavStore();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full bg-background text-text overflow-hidden font-sans">
      {/* Sidebar - Desktop Only */}
      <aside className="w-64 bg-panel border-r border-border flex flex-col z-20 hidden md:flex flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Compass className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">NAVISENSE</h1>
              <p className="text-[9px] text-muted tracking-widest uppercase mt-0.5">Inertial Navigation</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 mt-4 space-y-1">
          <NavLink active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={Map} label="Live Navigation" />
          <NavLink active={activeTab === 'sensors'} onClick={() => setActiveTab('sensors')} icon={Activity} label="Sensor Telemetry" />
          <NavLink active={activeTab === 'fusion'} onClick={() => setActiveTab('fusion')} icon={Cpu} label="Sensor Fusion" />
          <NavLink active={activeTab === 'diagnostics'} onClick={() => setActiveTab('diagnostics')} icon={Settings} label="Diagnostics" />
          <NavLink active={activeTab === 'field-test'} onClick={() => setActiveTab('field-test')} icon={FlaskConical} label="Field Test Mode" />
        </nav>
        
        <div className="p-4 border-t border-border mt-auto">
          {navState.isDemoMode && (
            <div className="bg-warning/10 border border-warning/30 rounded px-3 py-1.5 text-warning text-xs font-mono mb-2 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
              <span>DEMO MODE</span>
            </div>
          )}
          <div className="text-xs text-muted flex justify-between items-center">
            <span>Engine Status</span>
            <span className="text-success font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
              Online
            </span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] relative overflow-hidden">
        {/* Topbar - Responsive Header */}
        <header className="min-h-[3.5rem] bg-panel/95 backdrop-blur-md border-b border-border flex items-center justify-between px-2 sm:px-6 z-20 flex-shrink-0 gap-2">
          {/* Left Branding / Mode */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Mobile Branding */}
            <div className="flex items-center space-x-1.5 md:hidden">
              <Compass className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-wider text-white">NAVISENSE</span>
                <span className="text-[7px] text-muted uppercase font-mono">
                  {navState.isDemoMode ? 'SIM' : 'LIVE'}
                </span>
              </div>
            </div>

            {/* Desktop Left Mode Stat */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted uppercase tracking-wider">Device Mode</span>
                <span className="text-xs font-medium">{navState.isDemoMode ? 'SIMULATION' : 'LIVE SENSOR'}</span>
              </div>
              <div className="h-6 w-px bg-border"></div>
            </div>
          </div>

          {/* Center / Right Control Hub */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 overflow-x-auto no-scrollbar">
            {/* GLOBAL GPS INPUT CONTROL (Visible on all pages, mobile-optimized) */}
            <div className="flex items-center bg-[#111114] border border-border/80 rounded-lg p-0.5 sm:px-2 sm:py-1 gap-1.5 shadow-inner">
              {/* Receiver Hardware Status (Desktop/Tablet) */}
              <div className="hidden lg:flex flex-col text-right leading-tight pr-1.5 border-r border-border/60">
                <span className="text-[8px] text-muted uppercase font-mono tracking-wider">Receiver</span>
                <span className="text-[10px] font-mono text-gray-300">
                  {navState.gpsReceiver?.status === 'AVAILABLE' 
                    ? `AVAIL ${navState.gpsReceiver.accuracy ? `±${navState.gpsReceiver.accuracy.toFixed(1)}m` : ''}`
                    : (navState.gpsReceiver?.status || 'WAITING')}
                </span>
              </div>

              {/* High-Visibility Interactive Toggle Switch */}
              <button
                onClick={() => {
                  if (gpsInputEnabled) {
                    setConfirmModalOpen(true);
                  } else {
                    setGpsInputEnabled(true);
                  }
                }}
                className={cn(
                  "flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer border select-none shadow-sm",
                  gpsInputEnabled 
                    ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/25 active:scale-95"
                    : "bg-amber-500/20 border-amber-500/60 text-amber-300 hover:bg-amber-500/30 animate-pulse active:scale-95"
                )}
                aria-label="Toggle GPS Input (Simulate GPS Outage)"
                title="Controls whether NaviSense accepts GPS measurements. Tap to simulate GPS outage."
              >
                <span 
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0", 
                    gpsInputEnabled 
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" 
                      : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]"
                  )} 
                />
                <span className="tracking-tight whitespace-nowrap">
                  {gpsInputEnabled ? 'GPS: ON' : 'GPS: OFF (TEST)'}
                </span>
              </button>
            </div>

            {/* GPS Lock Pill */}
            <div className={cn(
              "flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 rounded-full border text-[10px] sm:text-xs font-mono whitespace-nowrap",
              navState.gpsActive ? "bg-success/10 border-success/30 text-success" : "bg-danger/10 border-danger/30 text-danger"
            )}>
              {navState.gpsActive ? (
                <Wifi className="w-3 h-3 flex-shrink-0" />
              ) : (
                <WifiOff className="w-3 h-3 flex-shrink-0" />
              )}
              <span className="font-semibold">
                {navState.gpsActive 
                  ? `GPS ${navState.gps?.accuracy ? `${navState.gps.accuracy.toFixed(1)}m` : 'FIX'}`
                  : 'NO GPS'}
              </span>
            </div>

            {/* Nav Mode Pill */}
            <div className="flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-[10px] sm:text-xs font-mono whitespace-nowrap">
              <Crosshair className="w-3 h-3 flex-shrink-0" />
              <span className="font-semibold truncate max-w-[80px] sm:max-w-none">
                {navState.mode}
              </span>
            </div>
          </div>
        </header>

        {/* PERSISTENT SIMULATED OUTAGE BANNER (Visible on all pages when GPS Input is OFF) */}
        {!gpsInputEnabled && (
          <div className="bg-warning/15 border-b border-warning/30 px-3 sm:px-6 py-1.5 flex items-center justify-between z-20 flex-shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2 text-xs font-mono text-warning min-w-0">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span className="font-bold whitespace-nowrap">APPLICATION OUTAGE TEST:</span>
              <span className="hidden sm:inline text-yellow-200/90 truncate">
                GPS fixes are suppressed at application input layer. PDR & EKF coasting active.
              </span>
              <span className="sm:hidden text-yellow-200/90 text-[10px] truncate">
                GPS Input Muted (PDR Active)
              </span>
            </div>
            <button
              onClick={() => setGpsInputEnabled(true)}
              className="px-2.5 py-0.5 bg-warning text-black font-bold text-[11px] rounded hover:bg-yellow-400 active:scale-95 transition-all cursor-pointer flex-shrink-0 ml-2 shadow"
            >
              RESTORE GPS
            </button>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-hidden relative pb-[4rem] md:pb-0">
          {children}
        </main>

        {/* INLINE CONFIRMATION MODAL BEFORE DISABLING GPS INPUT */}
        {confirmModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-panel border border-border rounded-xl max-w-md w-full p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-3 text-warning">
                <div className="p-2 rounded-lg bg-warning/10 border border-warning/30">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Simulate GPS Outage?</h3>
                  <p className="text-[11px] text-muted">Application-Level Input Gating</p>
                </div>
              </div>

              <div className="text-xs text-gray-300 space-y-2 font-sans bg-background/50 p-3 rounded-lg border border-border/60">
                <p>
                  <strong>GPS measurements will be ignored by NaviSense.</strong> Incoming fixes from your phone's browser Geolocation API will be dropped at the application input gate.
                </p>
                <div className="text-muted text-[11px] space-y-1">
                  <div>• IMU step detection (PDR) and EKF kinematics will continue running.</div>
                  <div>• The natural GPS watchdog will detect stale fixes after 4.0s.</div>
                  <div>• System Location Services on your phone are <strong>not</strong> affected.</div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setConfirmModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-muted hover:text-white rounded border border-border cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setGpsInputEnabled(false);
                    setConfirmModalOpen(false);
                  }}
                  className="px-4 py-1.5 text-xs font-bold bg-warning hover:bg-yellow-400 text-black rounded transition-all cursor-pointer shadow-md"
                >
                  DISABLE GPS INPUT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Nav - Accessible & Touch-Friendly with 4 tabs & Safe Area */}
        <nav 
          className="md:hidden fixed bottom-0 left-0 right-0 h-[4rem] bg-panel/95 backdrop-blur-md border-t border-border flex items-center justify-around z-30 px-1 safe-pb"
          role="navigation"
          aria-label="Mobile Navigation"
        >
          <MobileTabButton 
            active={activeTab === 'map'} 
            onClick={() => setActiveTab('map')} 
            icon={Map} 
            label="Map" 
          />
          <MobileTabButton 
            active={activeTab === 'sensors'} 
            onClick={() => setActiveTab('sensors')} 
            icon={Activity} 
            label="Sensors" 
          />
          <MobileTabButton 
            active={activeTab === 'fusion'} 
            onClick={() => setActiveTab('fusion')} 
            icon={Cpu} 
            label="Fusion" 
          />
          <MobileTabButton 
            active={activeTab === 'diagnostics'} 
            onClick={() => setActiveTab('diagnostics')} 
            icon={Settings} 
            label="Diag" 
          />
          <MobileTabButton 
            active={activeTab === 'field-test'} 
            onClick={() => setActiveTab('field-test')} 
            icon={FlaskConical} 
            label="Test" 
          />
        </nav>
      </div>
    </div>
  );
};
