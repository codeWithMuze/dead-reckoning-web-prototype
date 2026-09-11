import { useNavStore } from '../store/useNavStore';
import { Activity, Compass, Map, Settings, Wifi, WifiOff, Cpu, Crosshair } from 'lucide-react';
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
  const { navState } = useNavStore();
  
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
        <header className="min-h-[3.5rem] bg-panel/95 backdrop-blur-md border-b border-border flex items-center justify-between px-3 sm:px-6 z-20 flex-shrink-0">
          {/* Mobile Branding */}
          <div className="flex items-center space-x-2 md:hidden">
            <Compass className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider text-white">NAVISENSE</span>
              <span className="text-[8px] text-muted uppercase font-mono">
                {navState.isDemoMode ? 'SIMULATION' : 'LIVE'}
              </span>
            </div>
          </div>

          {/* Desktop Left Mode Stat */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase tracking-wider">Device Mode</span>
              <span className="text-sm font-medium">{navState.isDemoMode ? 'SIMULATION' : 'LIVE SENSOR'}</span>
            </div>
            <div className="h-7 w-px bg-border"></div>
          </div>

          {/* Telemetry Status Pills (Responsive for all screen sizes) */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* GPS Pill */}
            <div className={cn(
              "flex items-center space-x-1.5 px-2 sm:px-3 py-1 rounded-full border text-xs font-mono",
              navState.gpsActive ? "bg-success/10 border-success/30 text-success" : "bg-danger/10 border-danger/30 text-danger"
            )}>
              {navState.gpsActive ? (
                <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span className="font-semibold text-[11px] sm:text-xs">
                {navState.gpsActive 
                  ? `GPS ${navState.gps?.accuracy ? `${navState.gps.accuracy.toFixed(1)}m` : 'FIX'}`
                  : 'NO GPS'}
              </span>
            </div>

            {/* Nav Mode Pill */}
            <div className="flex items-center space-x-1 px-2 sm:px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono">
              <Crosshair className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="font-semibold text-[11px] sm:text-xs truncate max-w-[90px] sm:max-w-none">
                {navState.mode}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-hidden relative pb-[4rem] md:pb-0">
          {children}
        </main>

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
        </nav>
      </div>
    </div>
  );
};
