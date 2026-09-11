
import { useNavStore } from '../store/useNavStore';
import { ArrowRight, ArrowDown } from 'lucide-react';

export const FusionPage = () => {
  const { navState, latestSensor, modelPrediction } = useNavStore();

  return (
    <div className="h-full overflow-y-auto p-6">
      <h2 className="text-xl font-bold tracking-tight text-white mb-6">Extended Kalman Filter & Fusion Pipeline</h2>
      
      <div className="flex flex-col items-center justify-center space-y-4 max-w-4xl mx-auto py-10">
        
        {/* Sensor Layer */}
        <div className="flex space-x-8 w-full justify-center">
          <Node title="GPS" status={navState.gpsActive ? 'ACTIVE' : 'LOST'} highlight={navState.gpsActive} val={navState.gps ? `${navState.gps.latitude.toFixed(4)}, ${navState.gps.longitude.toFixed(4)}` : 'N/A'} />
          <Node title="ACCELEROMETER" status={latestSensor ? 'ACTIVE' : 'WAITING'} highlight={!!latestSensor} val={latestSensor ? `[${latestSensor.accel.x.toFixed(1)}, ${latestSensor.accel.y.toFixed(1)}, ${latestSensor.accel.z.toFixed(1)}]` : 'N/A'} />
          <Node title="GYROSCOPE" status={latestSensor ? 'ACTIVE' : 'WAITING'} highlight={!!latestSensor} val={latestSensor ? `[${latestSensor.gyro.x.toFixed(1)}, ${latestSensor.gyro.y.toFixed(1)}, ${latestSensor.gyro.z.toFixed(1)}]` : 'N/A'} />
        </div>

        <div className="flex space-x-32 text-border"><ArrowDown /><ArrowDown /><ArrowDown /></div>

        {/* Preprocessing */}
        <div className="flex space-x-8 w-full justify-center">
          <Node title="DEAD RECKONING ENGINE" status={navState.mode !== 'IDLE' ? 'RUNNING' : 'IDLE'} highlight={navState.mode !== 'IDLE'} width="w-96" />
        </div>

        <div className="flex space-x-32 text-border"><ArrowDown /></div>

        {/* Fusion Layer */}
        <div className="flex space-x-8 w-full justify-center relative">
          <Node title="EKF SENSOR FUSION" status={navState.mode} highlight={navState.mode !== 'IDLE'} width="w-64" bg="bg-primary/10" border="border-primary/50" />
          
          <div className="absolute right-10 top-0 flex items-center space-x-4">
             <ArrowRight className="text-border" />
             <Node title="AI DRIFT CORRECTION" status={modelPrediction ? 'PREDICTING' : 'READY'} highlight={!!modelPrediction} val={modelPrediction ? `Confidence: ${(modelPrediction.driftConfidence * 100).toFixed(0)}%` : 'No model loaded'} bg="bg-purple-900/20" border="border-purple-500/50" />
          </div>
        </div>

        <div className="flex space-x-32 text-border"><ArrowDown /></div>

        {/* Output */}
        <div className="flex space-x-8 w-full justify-center">
          <Node title="FINAL ESTIMATE" status="OUTPUT" highlight={!!navState.estimatedPosition} val={navState.estimatedPosition ? `${navState.estimatedPosition.latitude.toFixed(5)}, ${navState.estimatedPosition.longitude.toFixed(5)}` : 'N/A'} width="w-64" bg="bg-success/10" border="border-success/50" />
        </div>

      </div>
    </div>
  );
};

const Node = ({ title, status, highlight, val, width = 'w-48', bg = 'bg-panel', border = 'border-border' }: any) => (
  <div className={`p-4 rounded-lg border ${border} ${bg} ${width} flex flex-col items-center justify-center text-center shadow-lg transition-all ${highlight ? 'shadow-primary/10 shadow-xl' : 'opacity-60'}`}>
    <span className="text-[10px] text-muted tracking-widest font-bold mb-1">{title}</span>
    <span className={`text-xs font-mono font-bold mb-2 ${highlight ? 'text-white' : 'text-gray-500'}`}>{status}</span>
    {val && <span className="text-xs text-muted font-mono bg-black/30 px-2 py-1 rounded w-full truncate">{val}</span>}
  </div>
);
