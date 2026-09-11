import { useNavStore } from '../store/useNavStore';
import { ArrowDown, Cpu, Sparkles, Navigation, Satellite, Radio } from 'lucide-react';

export const FusionPage = () => {
  const { navState, latestSensor, modelPrediction } = useNavStore();

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Extended Kalman Filter & Fusion Pipeline</h2>
          <p className="text-xs text-muted">Multi-rate sensor fusion architecture with AI drift inference</p>
        </div>

        {/* Pipeline Container */}
        <div className="flex flex-col items-center space-y-3 sm:space-y-4 py-2 sm:py-6">
          
          {/* Stage 1: Sensor Ingestion Layer */}
          <div className="w-full">
            <div className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 text-center">
              Stage 1: Multi-Rate Sensor Ingestion
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <PipelineNode 
                icon={Satellite}
                title="GPS SATELLITE" 
                status={navState.gpsActive ? 'ACTIVE' : 'LOST'} 
                highlight={navState.gpsActive} 
                val={navState.gps ? `${navState.gps.latitude.toFixed(4)}, ${navState.gps.longitude.toFixed(4)}` : 'Signal Denied'} 
                badgeColor={navState.gpsActive ? 'text-success' : 'text-danger'}
              />
              <PipelineNode 
                icon={Radio}
                title="ACCELEROMETER (IMU)" 
                status={latestSensor ? 'STREAMING' : 'WAITING'} 
                highlight={!!latestSensor} 
                val={latestSensor ? `[${latestSensor.accel.x.toFixed(1)}, ${latestSensor.accel.y.toFixed(1)}, ${latestSensor.accel.z.toFixed(1)}]` : '---'} 
                badgeColor={latestSensor ? 'text-primary' : 'text-gray-500'}
              />
              <PipelineNode 
                icon={Navigation}
                title="GYROSCOPE (IMU)" 
                status={latestSensor ? 'STREAMING' : 'WAITING'} 
                highlight={!!latestSensor} 
                val={latestSensor ? `[${latestSensor.gyro.x.toFixed(1)}, ${latestSensor.gyro.y.toFixed(1)}, ${latestSensor.gyro.z.toFixed(1)}]` : '---'} 
                badgeColor={latestSensor ? 'text-primary' : 'text-gray-500'}
              />
            </div>
          </div>

          {/* Connector */}
          <ArrowDown className="w-5 h-5 text-muted/50 animate-bounce" />

          {/* Stage 2: Dead Reckoning Engine */}
          <div className="w-full max-w-2xl">
            <div className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 text-center">
              Stage 2: Inertial Kinematics & Coordinate Transformation
            </div>
            <div className="bg-panel border border-border rounded-xl p-4 shadow-lg text-center">
              <div className="flex items-center justify-center space-x-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
                <span className="text-xs font-bold tracking-widest text-warning uppercase">DEAD RECKONING ENGINE</span>
              </div>
              <p className="text-xs text-gray-400 mb-2 font-mono">
                Attitude Euler Integration • Zero-Velocity Updates (ZUPT) • Damping
              </p>
              <div className="inline-block bg-background/80 border border-border px-3 py-1 rounded text-xs font-mono text-muted">
                Status: <span className="text-white font-medium">{navState.mode !== 'IDLE' ? 'ACTIVE INTEGRATION' : 'STANDBY'}</span>
              </div>
            </div>
          </div>

          {/* Connector */}
          <ArrowDown className="w-5 h-5 text-muted/50" />

          {/* Stage 3: Fusion & AI Drift Layer */}
          <div className="w-full max-w-3xl">
            <div className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 text-center">
              Stage 3: EKF State Estimation & AI Assistance
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* EKF Node */}
              <div className="bg-primary/10 border border-primary/40 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Cpu className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold tracking-widest text-white uppercase">EKF SENSOR FUSION</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Optimal recursive covariance update weighting GPS vs Inertial prediction.
                  </p>
                </div>
                <div className="bg-black/30 border border-primary/20 rounded p-2 text-xs font-mono flex justify-between">
                  <span className="text-muted">Nav State:</span>
                  <span className="text-primary font-bold">{navState.mode}</span>
                </div>
              </div>

              {/* AI Drift Node */}
              <div className="bg-purple-950/20 border border-purple-500/40 rounded-xl p-4 shadow-lg flex flex-col justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold tracking-widest text-purple-300 uppercase">AI DRIFT CORRECTION</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Neural network inference compensating for IMU bias drift over time.
                  </p>
                </div>
                <div className="bg-black/30 border border-purple-500/20 rounded p-2 text-xs font-mono flex justify-between">
                  <span className="text-muted">Confidence:</span>
                  <span className="text-purple-300 font-bold">
                    {modelPrediction ? `${(modelPrediction.driftConfidence * 100).toFixed(0)}%` : 'Ready / Structural'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Connector */}
          <ArrowDown className="w-5 h-5 text-muted/50" />

          {/* Stage 4: Output Layer */}
          <div className="w-full max-w-xl">
            <div className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2 text-center">
              Stage 4: Unified Geodetic Navigation Output
            </div>
            <div className="bg-success/10 border border-success/40 rounded-xl p-4 shadow-xl text-center">
              <div className="text-xs font-bold tracking-widest text-success uppercase mb-1">
                FINAL ESTIMATE FIX
              </div>
              <div className="font-mono text-sm sm:text-base text-white font-medium my-1 break-all">
                {navState.estimatedPosition 
                  ? `${navState.estimatedPosition.latitude.toFixed(6)}, ${navState.estimatedPosition.longitude.toFixed(6)}` 
                  : 'Acquiring Pose...'}
              </div>
              <div className="text-xs text-muted font-mono mt-1">
                Uncertainty Radius: <span className="text-white">±{navState.uncertainty ? navState.uncertainty.toFixed(1) : '0.0'}m</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const PipelineNode = ({ icon: Icon, title, status, highlight, val, badgeColor }: any) => (
  <div className={`p-3.5 rounded-xl border border-border bg-panel flex flex-col justify-between shadow-md transition-all ${highlight ? 'border-primary/40 shadow-primary/5' : 'opacity-70'}`}>
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-1.5">
        <Icon className="w-3.5 h-3.5 text-muted" />
        <span className="text-[10px] text-muted tracking-wider font-semibold">{title}</span>
      </div>
      <span className={`text-[10px] font-mono font-bold ${badgeColor}`}>{status}</span>
    </div>
    <div className="text-xs text-gray-300 font-mono bg-background/60 border border-border/50 px-2 py-1 rounded truncate">
      {val}
    </div>
  </div>
);
