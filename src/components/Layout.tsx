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
      "w-full flex items-center space-x-3 px-3 py-2.5 mx-0 rounded-xl text-xs font-medium transition-all cursor-pointer select-none",
      active 
        ? "bg-white/[0.12] text-white font-semibold shadow-sm border border-white/[0.08]" 
        : "text-neutral-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
    )}
  >
    <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-blue-400" : "text-neutral-400")} />
    <span>{label}</span>
  </button>
);

const MobileTabButton = ({ active, icon: Icon, label, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={cn(
      "flex-1 flex flex-col items-center justify-center min-h-[48px] py-1 transition-all cursor-pointer relative select-none",
      active ? "text-blue-400 font-semibold" : "text-neutral-400 hover:text-neutral-200"
    )}
    aria-label={label}
  >
    <div className={cn("p-1 rounded-xl transition-all", active ? "bg-blue-500/15" : "")}>
      <Icon className="w-4 h-4" />
    </div>
    <span className="text-[9px] tracking-wider uppercase leading-none mt-0.5">{label}</span>
  </button>
);

export const Layout = ({ children, activeTab, setActiveTab }: any) => {
  const { navState, gpsInputEnabled, setGpsInputEnabled } = useNavStore();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  
  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-full bg-black text-[#f5f5f7] overflow-hidden font-sans">
      {/* Sidebar - Desktop Only (macOS Sonoma / Tahoe Frosted Window Style) */}
      <aside className="w-64 bg-[#0a0b0e] border-r border-white/[0.08] flex flex-col z-20 hidden md:flex flex-shrink-0">
        <div className="p-5 pb-3">
          <div className="flex items-center space-x-3">
            {/* Apple Mini Squircle */}
            <div className="w-10 h-10 rounded-[12px] bg-gradient-to-b from-[#1d7fff] to-[#041a4a] p-[1px] shadow-[0_4px_12px_rgba(0,102,255,0.3)] flex items-center justify-center">
              <div className="w-full h-full rounded-[11px] bg-gradient-to-b from-white/20 to-transparent flex items-center justify-center">
                <Compass className="w-5 h-5 text-white animate-pulse-soft stroke-[2]" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">NAVISENSE</h1>
              <p className="text-[9px] font-mono text-neutral-400 tracking-wider uppercase mt-0.5">Inertial Guidance</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-3 mt-4 space-y-1">
          <NavLink active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={Map} label="Live Navigation" />
          <NavLink active={activeTab === 'sensors'} onClick={() => setActiveTab('sensors')} icon={Activity} label="Sensor Telemetry" />
          <NavLink active={activeTab === 'fusion'} onClick={() => setActiveTab('fusion')} icon={Cpu} label="Sensor Fusion" />
          <NavLink active={activeTab === 'diagnostics'} onClick={() => setActiveTab('diagnostics')} icon={Settings} label="Diagnostics" />
          <NavLink active={activeTab === 'field-test'} onClick={() => setActiveTab('field-test')} icon={FlaskConical} label="Field Test Mode" />
        </nav>
        
        <div className="p-4 border-t border-white/[0.08] mt-auto">
          {navState.isDemoMode && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5 text-amber-300 text-xs font-mono mb-3 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="font-semibold">SIMULATION MODE</span>
            </div>
          )}
          <div className="text-xs text-neutral-400 flex justify-between items-center px-1">
            <span>Engine State</span>
            <span className="text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Online 60Hz
            </span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] relative overflow-hidden bg-black">
        {/* Topbar - Responsive macOS / iPadOS Frosted Header */}
        <header className="min-h-[3.25rem] apple-glass border-b border-white/[0.08] flex items-center justify-between px-3 sm:px-6 z-20 flex-shrink-0 gap-2">
          {/* Left Branding / Mode */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            {/* Mobile Branding */}
            <div className="flex items-center space-x-2 md:hidden">
              <div className="w-7 h-7 rounded-[9px] bg-gradient-to-b from-[#1d7fff] to-[#041a4a] flex items-center justify-center p-[1px]">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold tracking-tight text-white leading-tight">NAVISENSE</span>
                <span className="text-[8px] text-neutral-400 uppercase font-mono">
                  {navState.isDemoMode ? 'SIMULATION' : 'LIVE DEVICE'}
                </span>
              </div>
            </div>

            {/* Desktop Left Mode Stat */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex flex-col">
                <span className="text-[9px] text-neutral-400 uppercase tracking-wider font-mono">Device Mode</span>
                <span className="text-xs font-semibold text-white">{navState.isDemoMode ? 'Simulation Engine' : 'Live Smartphone IMU'}</span>
              </div>
              <div className="h-5 w-px bg-white/10"></div>
            </div>
          </div>

          {/* Center / Right Control Hub */}
          <div className="flex items-center space-x-2 sm:space-x-3 overflow-x-auto no-scrollbar">
            {/* Apple Control Center Style GPS Outage Toggle */}
            <div className="flex items-center bg-white/[0.04] border border-white/10 rounded-full p-1 gap-1.5 shadow-sm">
              {/* Receiver Hardware Status (Desktop/Tablet) */}
              <div className="hidden lg:flex flex-col text-right leading-tight px-2 border-r border-white/10">
                <span className="text-[8px] text-neutral-400 uppercase font-mono tracking-wider">Receiver</span>
                <span className="text-[10px] font-mono text-gray-200 font-medium">
                  {navState.gpsReceiver?.status === 'AVAILABLE' 
                    ? `LOCK ${navState.gpsReceiver.accuracy ? `±${navState.gpsReceiver.accuracy.toFixed(1)}m` : ''}`
                    : (navState.gpsReceiver?.status || 'SEARCHING')}
                </span>
              </div>

              {/* Interactive Segmented Pill Switch */}
              <button
                onClick={() => {
                  if (gpsInputEnabled) {
                    setConfirmModalOpen(true);
                  } else {
                    setGpsInputEnabled(true);
                  }
                }}
                className={cn(
                  "flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-bold transition-all cursor-pointer select-none shadow-sm",
                  gpsInputEnabled 
                    ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 active:scale-95"
                    : "bg-amber-500/20 border border-amber-500/50 text-amber-200 hover:bg-amber-500/30 animate-pulse active:scale-95"
                )}
                aria-label="Toggle GPS Input (Simulate GPS Outage)"
                title="Controls whether NaviSense accepts GPS measurements. Tap to simulate GPS outage."
              >
                <span 
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0", 
                    gpsInputEnabled 
                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" 
                      : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                  )} 
                />
                <span className="tracking-tight whitespace-nowrap">
                  {gpsInputEnabled ? 'GPS FEED: ON' : 'GPS: SUPPRESSED'}
                </span>
              </button>
            </div>

            {/* GPS Lock Capsule */}
            <div className={cn(
              "flex items-center space-x-1.5 px-2.5 py-1 rounded-full border text-[10px] sm:text-xs font-mono whitespace-nowrap backdrop-blur-md",
              navState.gpsActive 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/30 text-rose-400"
            )}>
              {navState.gpsActive ? (
                <Wifi className="w-3 h-3 flex-shrink-0" />
              ) : (
                <WifiOff className="w-3 h-3 flex-shrink-0" />
              )}
              <span className="font-semibold">
                {navState.gpsActive 
                  ? `FIX ${navState.gps?.accuracy ? `±${navState.gps.accuracy.toFixed(1)}m` : ''}`
                  : 'NO FIX'}
              </span>
            </div>

            {/* Nav Mode Capsule */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] sm:text-xs font-mono whitespace-nowrap backdrop-blur-md">
              <Crosshair className="w-3 h-3 flex-shrink-0" />
              <span className="font-semibold truncate max-w-[85px] sm:max-w-none">
                {navState.mode}
              </span>
            </div>
          </div>
        </header>

        {/* PERSISTENT SIMULATED OUTAGE BANNER (Apple Warning Sheet Style) */}
        {!gpsInputEnabled && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 backdrop-blur-md px-3 sm:px-6 py-2 flex items-center justify-between z-20 flex-shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center space-x-2.5 text-xs font-mono text-amber-300 min-w-0">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span className="font-bold whitespace-nowrap">GPS OUTAGE ACTIVE:</span>
              <span className="hidden sm:inline text-amber-200/80 truncate">
                Incoming GPS fixes dropped at application gate. PDR & EKF coasting on IMU.
              </span>
              <span className="sm:hidden text-amber-200/80 text-[10px] truncate">
                Coasting on IMU Dead Reckoning
              </span>
            </div>
            <button
              onClick={() => setGpsInputEnabled(true)}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-full active:scale-95 transition-all cursor-pointer flex-shrink-0 ml-2 shadow-md"
            >
              RESTORE FIX
            </button>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-hidden relative pb-[4rem] md:pb-0 bg-black">
          {children}
        </main>

        {/* INLINE CONFIRMATION MODAL BEFORE DISABLING GPS INPUT (Apple HIG Alert Sheet) */}
        {confirmModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="apple-glass rounded-[28px] max-w-md w-full p-6 shadow-2xl space-y-4 border border-white/15 animate-in zoom-in-95 duration-150">
              <div className="flex items-center space-x-3 text-amber-400">
                <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30">
                  <AlertTriangle className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Simulate GPS Outage?</h3>
                  <p className="text-xs text-neutral-400">Application Input Gating</p>
                </div>
              </div>

              <div className="text-xs text-neutral-300 space-y-2 font-sans bg-white/[0.03] p-3.5 rounded-2xl border border-white/[0.08]">
                <p className="leading-relaxed">
                  NaviSense will intentionally drop incoming GPS fixes to evaluate dead reckoning coasting accuracy.
                </p>
                <div className="text-neutral-400 text-[11px] space-y-1 pt-1 border-t border-white/[0.06]">
                  <div>• Inertial Dead Reckoning (PDR) and EKF kinematics stay active.</div>
                  <div>• Drift will be bounded solely by IMU attitude and ZUPT gating.</div>
                  <div>• Your phone's real system location services are not modified.</div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  onClick={() => setConfirmModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 cursor-pointer transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setGpsInputEnabled(false);
                    setConfirmModalOpen(false);
                  }}
                  className="px-5 py-2 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black rounded-full transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  Confirm Outage
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Tab Bar - Apple iOS Translucent Bar */}
        <nav 
          className="md:hidden fixed bottom-0 left-0 right-0 h-[4rem] apple-glass border-t border-white/[0.08] flex items-center justify-around z-30 px-2 safe-pb"
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
            label="Field Test" 
          />
        </nav>
      </div>
    </div>
  );
};
