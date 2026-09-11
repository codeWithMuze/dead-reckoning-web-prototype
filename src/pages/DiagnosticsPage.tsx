import { useState } from 'react';
import { useNavStore } from '../store/useNavStore';
import { sensorManager } from '../engine/SensorManager';
import { aiModule } from '../engine/AIModule';
import { CheckCircle2, XCircle, AlertCircle, ShieldAlert } from 'lucide-react';

export const DiagnosticsPage = () => {
  const { navState, calibration } = useNavStore();
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);

  const handleRequestPermissions = async () => {
    const granted = await sensorManager.requestPermissions();
    setPermissionsGranted(granted);
    if (granted) {
      sensorManager.start();
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">System Diagnostics</h2>
        <p className="text-xs text-muted">Hardware sensor API availability & environmental compliance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
        <div className="space-y-3">
          <StatusRow 
            label="Device Permissions" 
            status={permissionsGranted === null ? 'UNKNOWN' : permissionsGranted ? 'GRANTED' : 'DENIED'}
            action={permissionsGranted !== true ? (
              <button 
                onClick={handleRequestPermissions} 
                className="min-h-[36px] px-3 py-1.5 text-xs font-semibold bg-primary/20 hover:bg-primary/30 active:scale-95 text-primary border border-primary/30 rounded-lg cursor-pointer transition-all"
              >
                Request
              </button>
            ) : null}
          />
          <StatusRow label="GPS Geolocation API" status={'geolocation' in navigator ? 'AVAILABLE' : 'UNAVAILABLE'} />
          <StatusRow label="Device Motion API" status={typeof DeviceMotionEvent !== 'undefined' ? 'AVAILABLE' : 'UNAVAILABLE'} />
          <StatusRow label="Device Orientation API" status={typeof DeviceOrientationEvent !== 'undefined' ? 'AVAILABLE' : 'UNAVAILABLE'} />
        </div>
        
        <div className="space-y-3">
          <StatusRow label="Sensor Calibration" status={calibration.calibrated ? 'CALIBRATED' : 'UNCALIBRATED'} />
          <StatusRow label="Navigation Engine" status={navState.mode !== 'IDLE' ? 'ONLINE' : 'OFFLINE'} />
          <StatusRow label="AI Drift Module" status={aiModule.getModelStatus()} />
          <StatusRow label="Security Context" status={window.isSecureContext ? 'SECURE CONTEXT' : 'INSECURE (NO HTTPS)'} />
        </div>
      </div>

      <div className="bg-panel border border-border rounded-xl p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-warning" />
          <h3 className="text-xs font-semibold text-white tracking-wider uppercase">System Assumptions & Constraints</h3>
        </div>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-muted leading-relaxed">
          <li>Smartphone IMUs are consumer MEMS sensors; double integration accumulates velocity & position drift rapidly.</li>
          <li>Without absolute magnetometer or dual-antenna references, yaw angle tends to drift over time.</li>
          <li>Zero-velocity updates (ZUPT) and heuristic damping are active to prevent unconstrained position runaway.</li>
          <li>Mobile browsers require a Secure Context (HTTPS or localhost) and explicit user gesture for sensor access.</li>
          <li>NaviSense is a technical demonstrator for GPS-denied sensor fusion concepts.</li>
        </ul>
      </div>
    </div>
  );
};

const StatusRow = ({ label, status, action }: { label: string, status: string, action?: React.ReactNode }) => {
  const isGood = status === 'AVAILABLE' || status === 'GRANTED' || status === 'CALIBRATED' || status === 'ONLINE' || status === 'SECURE CONTEXT';
  const isWarn = status === 'UNKNOWN' || status === 'UNCALIBRATED' || status === 'NOT TRAINED';
  
  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-panel border border-border rounded-xl gap-2">
      <span className="text-xs sm:text-sm text-gray-300 font-medium truncate">{label}</span>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {action}
        <div className="flex items-center space-x-1.5">
          {isGood ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" /> : isWarn ? <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" /> : <XCircle className="w-4 h-4 text-danger flex-shrink-0" />}
          <span className={`text-[11px] sm:text-xs font-bold tracking-wider font-mono ${isGood ? 'text-success' : isWarn ? 'text-warning' : 'text-danger'}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};
