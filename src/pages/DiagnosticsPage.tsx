import { useState } from 'react';
import { useNavStore } from '../store/useNavStore';
import { sensorManager } from '../engine/SensorManager';
import { aiModule } from '../engine/AIModule';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

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
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <h2 className="text-xl font-bold tracking-tight text-white mb-6">System Diagnostics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <StatusRow 
            label="Device Permissions" 
            status={permissionsGranted === null ? 'UNKNOWN' : permissionsGranted ? 'GRANTED' : 'DENIED'}
            action={permissionsGranted !== true ? <button onClick={handleRequestPermissions} className="text-xs bg-primary/20 text-primary px-3 py-1 rounded hover:bg-primary/30">Request</button> : null}
          />
          <StatusRow label="GPS API" status={'geolocation' in navigator ? 'AVAILABLE' : 'UNAVAILABLE'} />
          <StatusRow label="Device Motion API" status={typeof DeviceMotionEvent !== 'undefined' ? 'AVAILABLE' : 'UNAVAILABLE'} />
          <StatusRow label="Device Orientation API" status={typeof DeviceOrientationEvent !== 'undefined' ? 'AVAILABLE' : 'UNAVAILABLE'} />
        </div>
        
        <div className="space-y-4">
          <StatusRow label="Sensor Calibration" status={calibration.calibrated ? 'CALIBRATED' : 'UNCALIBRATED'} />
          <StatusRow label="Navigation Engine" status={navState.mode !== 'IDLE' ? 'ONLINE' : 'OFFLINE'} />
          <StatusRow label="AI Drift Module" status={aiModule.getModelStatus()} />
          <StatusRow label="Environment" status={window.isSecureContext ? 'SECURE CONTEXT' : 'INSECURE (APIs MAY FAIL)'} />
        </div>
      </div>

      <div className="bg-panel border border-border rounded-lg p-6 mt-8">
        <h3 className="text-sm font-semibold text-white tracking-wide mb-4">SYSTEM ASSUMPTIONS & LIMITATIONS</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-muted">
          <li>Smartphone IMUs are generally noisy MEMS sensors. Double integration of acceleration for position accumulates error exponentially.</li>
          <li>Without absolute heading reference (magnetometer/dual-antenna GPS), yaw drift occurs.</li>
          <li>For prototype demonstration, zero-velocity updates (ZUPT) and damping are applied to limit unbounded position runaway.</li>
          <li>Browser sensor APIs may restrict frequency or require HTTPS (Secure Context) and explicit user permission.</li>
          <li>This is a technical demonstration of dead reckoning and sensor fusion concepts, not a safety-critical navigation system.</li>
        </ul>
      </div>
    </div>
  );
};

const StatusRow = ({ label, status, action }: { label: string, status: string, action?: React.ReactNode }) => {
  const isGood = status === 'AVAILABLE' || status === 'GRANTED' || status === 'CALIBRATED' || status === 'ONLINE' || status === 'SECURE CONTEXT';
  const isWarn = status === 'UNKNOWN' || status === 'UNCALIBRATED' || status === 'NOT TRAINED';
  
  return (
    <div className="flex items-center justify-between p-4 bg-panel border border-border rounded-lg">
      <span className="text-sm text-gray-300 font-medium">{label}</span>
      <div className="flex items-center space-x-3">
        {action}
        <div className="flex items-center space-x-1.5">
          {isGood ? <CheckCircle2 className="w-4 h-4 text-success" /> : isWarn ? <AlertCircle className="w-4 h-4 text-warning" /> : <XCircle className="w-4 h-4 text-danger" />}
          <span className={`text-xs font-bold tracking-widest ${isGood ? 'text-success' : isWarn ? 'text-warning' : 'text-danger'}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};
