import { useState, useEffect } from 'react';
import { useNavStore } from '../store/useNavStore';
import { sensorManager } from '../engine/SensorManager';
import { calibrationManager } from '../engine/CalibrationManager';
import { sessionRecorder } from '../engine/SessionRecorder';
import { navEngine } from '../engine/NavEngine';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Compass, 
  Sliders, 
  Play, 
  Square, 
  Download, 
  RefreshCw, 
  Info,
  Footprints
} from 'lucide-react';
import type { CalibrationData } from '../types';

export const DiagnosticsPage = () => {
  const { navState, calibration, updateCalibration } = useNavStore();
  const [permissionsGranted, setPermissionsGranted] = useState<boolean | null>(null);

  // Calibration State
  const [calibrating, setCalibrating] = useState(false);
  const [calibProgress, setCalibProgress] = useState(0);

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);

  // Weinberg K parameter slider
  const [weinbergK, setWeinbergK] = useState(navState.pdr.weinbergK || 0.42);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsRecording(sessionRecorder.getIsRecording());
      setFrameCount(sessionRecorder.getFrameCount());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleRequestPermissions = async () => {
    const granted = await sensorManager.requestPermissions();
    setPermissionsGranted(granted);
    if (granted) {
      sensorManager.start();
    }
  };

  const handleStartCalibration = () => {
    setCalibrating(true);
    setCalibProgress(0);

    calibrationManager.startCalibration(
      (progress) => {
        setCalibProgress(progress);
      },
      (completedData: CalibrationData) => {
        setCalibrating(false);
        updateCalibration(completedData);
      }
    );
  };

  const handleResetCalibration = () => {
    calibrationManager.resetCalibration();
    updateCalibration(calibrationManager.getCalibration());
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      sessionRecorder.stop();
      setIsRecording(false);
    } else {
      sessionRecorder.start();
      setIsRecording(true);
    }
  };

  const handleWeinbergChange = (newK: number) => {
    setWeinbergK(newK);
    navEngine.setWeinbergK(newK);
  };

  const debug = navState.debug;
  const pdr = navState.pdr;
  const ekf = navState.ekf;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-6 pb-28 md:pb-12">
      {/* Header */}
      <div>
        <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">System Diagnostics & Debug Console</h2>
        <p className="text-xs text-muted">Real-time attitude estimation, calibration, PDR kinematics, and EKF telemetry</p>
      </div>

      {/* 1. Sensor Hardware & API Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
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
          <StatusRow 
            label="GPS Receiver (Hardware)" 
            status={navState.gpsReceiver?.status === 'AVAILABLE' 
              ? `AVAILABLE (±${navState.gpsReceiver.accuracy ? navState.gpsReceiver.accuracy.toFixed(1) : '?'}m)` 
              : ('geolocation' in navigator ? 'WAITING FIX' : 'UNAVAILABLE')} 
          />
          <StatusRow 
            label="GPS Input Gate (App)" 
            status={navState.gpsInputEnabled ? 'ON (ACCEPTED)' : 'OFF (SIMULATED OUTAGE)'} 
          />
          <StatusRow label="Device Motion API" status={typeof DeviceMotionEvent !== 'undefined' ? 'AVAILABLE' : 'UNAVAILABLE'} />
          <StatusRow label="Device Orientation API" status={typeof DeviceOrientationEvent !== 'undefined' ? 'AVAILABLE' : 'UNAVAILABLE'} />
        </div>
        
        <div className="space-y-3">
          <StatusRow label="Navigation Engine" status={navState.mode !== 'IDLE' ? 'ONLINE' : 'STANDBY'} />
          <StatusRow label="Motion Classifier" status={navState.motionState} />
          <StatusRow label="Attitude Reference" status={navState.headingType === 'ABSOLUTE' ? 'ABSOLUTE COMPASS' : 'RELATIVE ORIGIN'} />
          <StatusRow 
            label="Outage Watchdog State" 
            status={navState.mode === 'GPS_DENIED' ? (!navState.gpsInputEnabled ? 'GATE_MUTED' : 'SIGNAL_LOST') : 'TRACKING'} 
          />
          <StatusRow label="Security Context" status={window.isSecureContext ? 'SECURE (HTTPS)' : 'INSECURE (NO HTTPS)'} />
        </div>
      </div>

      {/* SIH Technical Disclosure: GPS Outage Methodology */}
      <div className="bg-panel border border-border/80 rounded-xl p-4 sm:p-5 flex items-start space-x-3.5 shadow-sm">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary flex-shrink-0 mt-0.5">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">SIH Technical Disclosure & Experimental Note</h4>
          <p className="text-xs text-muted leading-relaxed">
            Web applications cannot directly control the iPhone system Location Services switch. NaviSense provides an application-level GPS input gate for controlled GPS-outage testing. Disabling GPS Input tests the actual stale-data watchdog, EKF covariance inflation, and PDR dead-reckoning coasting without falsifying physical RF reception.
          </p>
        </div>
      </div>

      {/* 2. Sensor Calibration Routine */}
      <div className="bg-panel border border-border rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">SENSOR BIAS CALIBRATION</h3>
              <p className="text-[11px] text-muted">Estimate stationary accelerometer and gyroscope bias offsets</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {calibration.calibrated && (
              <button 
                onClick={handleResetCalibration}
                className="text-xs text-muted hover:text-white px-2 py-1 rounded border border-border cursor-pointer flex items-center gap-1"
                title="Reset stored calibration"
              >
                <RefreshCw className="w-3 h-3" /> Reset
              </button>
            )}
            <button
              onClick={handleStartCalibration}
              disabled={calibrating}
              className={`min-h-[38px] px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-md ${
                calibrating 
                  ? 'bg-warning/20 text-warning border border-warning/40 animate-pulse' 
                  : 'bg-primary hover:bg-blue-600 text-white'
              }`}
            >
              {calibrating ? 'CALIBRATING...' : calibration.calibrated ? 'RECALIBRATE' : 'START CALIBRATION'}
            </button>
          </div>
        </div>

        {/* Progress Bar during calibration */}
        {calibrating && (
          <div className="bg-background/80 border border-border p-3 rounded-lg space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-warning font-semibold">Keep smartphone completely still on a flat surface...</span>
              <span className="text-white font-bold">{calibProgress}%</span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-warning transition-all duration-100" 
                style={{ width: `${calibProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Calibration Results Table */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className="bg-background/50 border border-border rounded-lg p-3">
            <div className="text-muted text-[10px] uppercase font-bold tracking-wider mb-1.5 border-b border-border/60 pb-1">
              Accelerometer Biases (m/s²)
            </div>
            <div className="flex justify-between"><span>biasX:</span> <span className="text-red-400">{calibration.accelBias.x}</span></div>
            <div className="flex justify-between"><span>biasY:</span> <span className="text-green-400">{calibration.accelBias.y}</span></div>
            <div className="flex justify-between"><span>biasZ:</span> <span className="text-blue-400">{calibration.accelBias.z}</span></div>
            <div className="flex justify-between text-gray-400 mt-1 border-t border-border/40 pt-1">
              <span>Noise Std (σ):</span> <span className="text-white">±{calibration.accelNoiseStd} m/s²</span>
            </div>
          </div>

          <div className="bg-background/50 border border-border rounded-lg p-3">
            <div className="text-muted text-[10px] uppercase font-bold tracking-wider mb-1.5 border-b border-border/60 pb-1">
              Gyroscope Biases (rad/s)
            </div>
            <div className="flex justify-between"><span>biasX:</span> <span className="text-red-400">{calibration.gyroBias.x}</span></div>
            <div className="flex justify-between"><span>biasY:</span> <span className="text-green-400">{calibration.gyroBias.y}</span></div>
            <div className="flex justify-between"><span>biasZ:</span> <span className="text-blue-400">{calibration.gyroBias.z}</span></div>
            <div className="flex justify-between text-gray-400 mt-1 border-t border-border/40 pt-1">
              <span>Noise Std (σ):</span> <span className="text-white">±{calibration.gyroNoiseStd} rad/s</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Pipeline Debug Panel */}
      <div className="bg-panel border border-border rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 border-b border-border pb-3">
          <Compass className="w-5 h-5 text-primary" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">NAVIGATION PIPELINE TELEMETRY MATRIX</h3>
            <p className="text-[11px] text-muted">Local East-North-Up (ENU) coordinate frame & EKF state inspection</p>
          </div>
        </div>

        {/* Real-time Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
          
          {/* Card: Attitude & Quaternion */}
          <div className="bg-background/50 border border-border rounded-lg p-3">
            <div className="text-primary font-bold text-[10px] uppercase tracking-wider mb-2 border-b border-border/60 pb-1 flex justify-between">
              <span>Attitude Quaternion</span>
              <span className={navState.headingType === 'ABSOLUTE' ? 'text-success' : 'text-warning'}>
                {navState.headingType}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between"><span>q.w:</span> <span>{debug.quaternion.w.toFixed(4)}</span></div>
              <div className="flex justify-between"><span>q.x:</span> <span>{debug.quaternion.x.toFixed(4)}</span></div>
              <div className="flex justify-between"><span>q.y:</span> <span>{debug.quaternion.y.toFixed(4)}</span></div>
              <div className="flex justify-between"><span>q.z:</span> <span>{debug.quaternion.z.toFixed(4)}</span></div>
              <div className="flex justify-between text-white font-bold border-t border-border/40 pt-1">
                <span>Yaw Heading:</span> <span>{debug.headingDeg.toFixed(1)}°</span>
              </div>
            </div>
          </div>

          {/* Card: Dynamic Accelerations (World ENU) */}
          <div className="bg-background/50 border border-border rounded-lg p-3">
            <div className="text-primary font-bold text-[10px] uppercase tracking-wider mb-2 border-b border-border/60 pb-1">
              Dynamic Accel (World ENU)
            </div>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-red-400">East:</span> <span>{debug.linearAccelWorld.x.toFixed(3)} m/s²</span></div>
              <div className="flex justify-between"><span className="text-green-400">North:</span> <span>{debug.linearAccelWorld.y.toFixed(3)} m/s²</span></div>
              <div className="flex justify-between"><span className="text-blue-400">Up (Dyn):</span> <span>{debug.linearAccelWorld.z.toFixed(3)} m/s²</span></div>
              <div className="flex justify-between text-gray-400 border-t border-border/40 pt-1">
                <span>Motion State:</span> 
                <span className={`font-bold ${debug.motionState === 'WALKING' ? 'text-success' : debug.motionState === 'STATIONARY' ? 'text-primary' : 'text-gray-400'}`}>
                  {debug.motionState}
                </span>
              </div>
              <div className="flex justify-between text-gray-500 text-[10px]">
                <span>Variance:</span> <span>{debug.motionVariance} m²/s⁴</span>
              </div>
            </div>
          </div>

          {/* Card: PDR Step Kinematics */}
          <div className="bg-background/50 border border-border rounded-lg p-3">
            <div className="text-primary font-bold text-[10px] uppercase tracking-wider mb-2 border-b border-border/60 pb-1 flex justify-between">
              <span>PDR Kinematics</span>
              <Footprints className="w-3.5 h-3.5 text-muted" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Step Count:</span> <span className="text-white font-bold">{pdr.stepCount}</span></div>
              <div className="flex justify-between"><span>Cadence:</span> <span>{pdr.cadence} spm</span></div>
              <div className="flex justify-between"><span>Latest Stride:</span> <span>{pdr.strideLength} m</span></div>
              <div className="flex justify-between"><span>Total Distance:</span> <span>{pdr.totalDistance} m</span></div>
              <div className="flex justify-between text-gray-400 border-t border-border/40 pt-1">
                <span>PDR Local (E, N):</span> 
                <span className="text-white font-mono">[{pdr.localPos.east.toFixed(1)}, {pdr.localPos.north.toFixed(1)}]m</span>
              </div>
            </div>
          </div>

          {/* Card: EKF State Vector & Covariance */}
          <div className="bg-background/50 border border-border rounded-lg p-3 sm:col-span-2 lg:col-span-3">
            <div className="text-primary font-bold text-[10px] uppercase tracking-wider mb-2 border-b border-border/60 pb-1 flex justify-between">
              <span>Extended Kalman Filter (Local Metric ENU)</span>
              <span className="text-xs text-muted font-mono">Last Op: {ekf.lastUpdateType}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-muted text-[10px] mb-1">State Vector [E, N, vE, vN]:</div>
                <div className="space-y-0.5 text-white">
                  <div>posEast: <span className="text-primary font-bold">{ekf.state[0].toFixed(2)} m</span></div>
                  <div>posNorth: <span className="text-primary font-bold">{ekf.state[1].toFixed(2)} m</span></div>
                  <div>velEast: <span>{ekf.state[2].toFixed(2)} m/s</span></div>
                  <div>velNorth: <span>{ekf.state[3].toFixed(2)} m/s</span></div>
                </div>
              </div>
              <div>
                <div className="text-muted text-[10px] mb-1">Covariance Diag [P00..P33]:</div>
                <div className="space-y-0.5 text-gray-400">
                  <div>Var(pE): {ekf.pDiag[0]} m²</div>
                  <div>Var(pN): {ekf.pDiag[1]} m²</div>
                  <div>Var(vE): {ekf.pDiag[2]} m²/s²</div>
                  <div>Var(vN): {ekf.pDiag[3]} m²/s²</div>
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <div className="text-muted text-[10px] mb-1">Position Uncertainty Radius:</div>
                  <div className="text-base text-white font-bold">±{ekf.uncertainty1Sigma} m <span className="text-xs text-muted font-normal">(1-sigma / 68%)</span></div>
                  <div className="text-xs text-muted">±{ekf.uncertainty2Sigma} m <span className="text-[10px] font-normal">(2-sigma / 95%)</span></div>
                </div>
                <div className="text-[10px] text-gray-500">
                  GPS Age: {debug.gpsAgeMs > 0 ? `${(debug.gpsAgeMs / 1000).toFixed(1)}s` : 'Active'}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Weinberg K Tuning Slider */}
        <div className="bg-background/40 border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-gray-300">Weinberg Stride Parameter (k):</span>
            <span className="font-mono text-primary font-bold">{weinbergK.toFixed(2)}</span>
            <span className="text-[10px] text-muted">(L = k * (a_max - a_min)^0.25)</span>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <input 
              type="range" 
              min="0.25" 
              max="0.65" 
              step="0.01"
              value={weinbergK}
              onChange={(e) => handleWeinbergChange(parseFloat(e.target.value))}
              className="w-44 accent-primary cursor-pointer"
            />
            <button 
              onClick={() => handleWeinbergChange(0.42)}
              className="text-[10px] text-muted hover:text-white underline cursor-pointer"
            >
              Default (0.42)
            </button>
          </div>
        </div>
      </div>

      {/* 4. Session Recording & Export */}
      <div className="bg-panel border border-border rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Download className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">FIELD DATA RECORDING & EXPORT</h3>
              <p className="text-[11px] text-muted">Log high-rate sensor kinematics, PDR steps, and EKF solutions for bench analysis</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleRecording}
              className={`min-h-[38px] px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                isRecording 
                  ? 'bg-danger/20 text-danger border border-danger/40 animate-pulse' 
                  : 'bg-panel border border-border hover:bg-white/5 text-white'
              }`}
            >
              {isRecording ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isRecording ? 'STOP RECORDING' : 'START RECORDING'}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs font-mono">
          <span className="text-muted">Recorded Frames: <span className="text-white font-bold">{frameCount}</span></span>
          <div className="flex space-x-2">
            <button
              onClick={() => sessionRecorder.exportJSON()}
              disabled={frameCount === 0}
              className="px-3 py-1 bg-background border border-border hover:border-primary/50 text-gray-300 hover:text-white rounded text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export JSON
            </button>
            <button
              onClick={() => sessionRecorder.exportCSV()}
              disabled={frameCount === 0}
              className="px-3 py-1 bg-background border border-border hover:border-primary/50 text-gray-300 hover:text-white rounded text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* 5. Technical Transparency & Limitations */}
      <div className="bg-panel border border-border rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-warning" />
          <h3 className="text-xs font-bold text-white tracking-wider uppercase">Technical Transparency & Engineering Limitations</h3>
        </div>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-muted leading-relaxed">
          <li><strong>Coordinate Frame:</strong> Local Tangent Plane East-North-Up (ENU) metric coordinates relative to first GNSS fix.</li>
          <li><strong>Attitude Representation:</strong> Unit quaternions propagated via high-rate calibrated angular rate integration: dq/dt = 0.5 * q ⊗ [0, ω].</li>
          <li><strong>Zero-Velocity Updates (ZUPT):</strong> Engages when stationary variance is low, clamping velocity to zero and constraining position drift without unphysical friction multipliers.</li>
          <li><strong>PDR Kinematics:</strong> Peak detection on vertical dynamic acceleration with Weinberg fourth-root stride length estimation: L = k · (a_max - a_min)^0.25.</li>
          <li><strong>Extended Kalman Filter (EKF):</strong> 4-state local metric filter [pE, pN, vE, vN] fused with metric GPS fixes. Uncertainty circle reflects covariance radius: sqrt(P_00 + P_11).</li>
          <li><strong>Heading Ambiguity:</strong> Unless compass permission is granted and absolute heading is true, heading is session-relative from initialization.</li>
        </ul>
      </div>
    </div>
  );
};

const StatusRow = ({ label, status, action }: { label: string; status: string; action?: React.ReactNode }) => {
  const isGood = status === 'AVAILABLE' || status === 'GRANTED' || status === 'ONLINE' || status === 'SECURE (HTTPS)' || status === 'ABSOLUTE COMPASS';
  const isWarn = status === 'UNKNOWN' || status === 'STANDBY' || status === 'RELATIVE ORIGIN';
  
  return (
    <div className="flex items-center justify-between p-3 bg-panel border border-border rounded-xl gap-2">
      <span className="text-xs text-gray-300 font-medium truncate">{label}</span>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {action}
        <div className="flex items-center space-x-1.5">
          {isGood ? <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" /> : isWarn ? <AlertCircle className="w-4 h-4 text-warning flex-shrink-0" /> : <XCircle className="w-4 h-4 text-danger flex-shrink-0" />}
          <span className={`text-[11px] font-bold tracking-wider font-mono ${isGood ? 'text-success' : isWarn ? 'text-warning' : 'text-danger'}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
};

