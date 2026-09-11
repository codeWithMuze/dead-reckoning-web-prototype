
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
      "w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors border-l-2",
      active ? "bg-[#16161a] border-primary text-white" : "border-transparent text-muted hover:bg-[#16161a] hover:text-gray-200"
    )}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

export const Layout = ({ children, activeTab, setActiveTab }: any) => {
  const { navState } = useNavStore();
  
  return (
    <div className="flex h-screen bg-background text-text overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-panel border-r border-border flex flex-col z-20 hidden md:flex">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <Compass className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">NAVISENSE</h1>
              <p className="text-[10px] text-muted tracking-widest uppercase mt-0.5">Inertial Navigation</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 mt-6">
          <NavLink active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={Map} label="Live Navigation" />
          <NavLink active={activeTab === 'sensors'} onClick={() => setActiveTab('sensors')} icon={Activity} label="Sensor Telemetry" />
          <NavLink active={activeTab === 'fusion'} onClick={() => setActiveTab('fusion')} icon={Cpu} label="Sensor Fusion" />
          <NavLink active={activeTab === 'diagnostics'} onClick={() => setActiveTab('diagnostics')} icon={Settings} label="Diagnostics" />
        </nav>
        
        <div className="p-4 border-t border-border">
          {navState.isDemoMode && (
            <div className="bg-warning/10 border border-warning/30 rounded px-3 py-2 text-warning text-xs font-mono mb-3">
              ● DEMO / SYNTHETIC DATA
            </div>
          )}
          <div className="text-xs text-muted flex justify-between">
            <span>Engine</span>
            <span className="text-success">Online</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Topbar */}
        <header className="h-16 bg-panel/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 z-20">
          <div className="flex items-center space-x-6">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase tracking-wider">Device Mode</span>
              <span className="text-sm font-medium">{navState.isDemoMode ? 'SIMULATION' : 'LIVE SENSOR'}</span>
            </div>
            
            <div className="h-8 w-px bg-border"></div>
            
            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase tracking-wider">GPS Status</span>
              <div className="flex items-center space-x-1.5">
                {navState.gpsActive ? (
                  <Wifi className="w-3.5 h-3.5 text-success" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-danger" />
                )}
                <span className={cn("text-sm font-medium", navState.gpsActive ? "text-success" : "text-danger")}>
                  {navState.gpsActive ? `LOCKED (${navState.gps?.accuracy.toFixed(1)}m)` : 'LOST'}
                </span>
              </div>
            </div>

            <div className="h-8 w-px bg-border"></div>

            <div className="flex flex-col">
              <span className="text-[10px] text-muted uppercase tracking-wider">Nav State</span>
              <div className="flex items-center space-x-1.5">
                <Crosshair className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {navState.mode}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full h-16 bg-panel border-t border-border flex items-center justify-around z-30">
        <button onClick={() => setActiveTab('map')} className={cn("p-2", activeTab === 'map' ? "text-primary" : "text-muted")}>
          <Map className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('sensors')} className={cn("p-2", activeTab === 'sensors' ? "text-primary" : "text-muted")}>
          <Activity className="w-6 h-6" />
        </button>
        <button onClick={() => setActiveTab('diagnostics')} className={cn("p-2", activeTab === 'diagnostics' ? "text-primary" : "text-muted")}>
          <Settings className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
