import { useEffect, useState } from 'react';
import { useNavStore } from '../store/useNavStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

export const SensorsPage = () => {
  const { latestSensor, calibration, navState } = useNavStore();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!latestSensor) return;
    const radToDeg = 180 / Math.PI;
    setHistory(prev => {
      const newHist = [...prev, {
        time: latestSensor.timestamp,
        ax: latestSensor.accel.x,
        ay: latestSensor.accel.y,
        az: latestSensor.accel.z,
        gx: latestSensor.gyro.x * radToDeg,
        gy: latestSensor.gyro.y * radToDeg,
        gz: latestSensor.gyro.z * radToDeg,
      }];
      if (newHist.length > 50) return newHist.slice(newHist.length - 50); // Keep last 50 points
      return newHist;
    });
  }, [latestSensor]);

  const accelMag = latestSensor 
    ? Math.sqrt(latestSensor.accel.x**2 + latestSensor.accel.y**2 + latestSensor.accel.z**2).toFixed(2)
    : '0.00';
  const gyroMag = latestSensor
    ? (Math.sqrt(latestSensor.gyro.x**2 + latestSensor.gyro.y**2 + latestSensor.gyro.z**2) * (180 / Math.PI)).toFixed(2)
    : '0.00';

  const debug = navState.debug;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Sensor Telemetry</h2>
          <p className="text-xs text-muted">Real-time IMU streams, bias calibration & world-frame ENU projection</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Motion State Badge */}
          <div className="bg-panel border border-border px-3 py-1 rounded-full text-xs flex items-center space-x-1.5">
            <span className="text-[10px] text-muted uppercase">Motion:</span>
            <span className={
              navState.motionState === 'WALKING' ? 'text-success font-bold' :
              navState.motionState === 'STATIONARY' ? 'text-primary font-bold' :
              'text-warning font-bold'
            }>
              {navState.motionState}
            </span>
          </div>

          <div className="bg-panel border border-border px-3 py-1 rounded-full text-xs text-muted flex items-center space-x-2">
            <span className="font-mono text-white">{history.length > 0 ? (1000 / (Date.now() - history[0].time) * history.length).toFixed(0) : 0} Hz</span>
            <span className="text-border">|</span>
            <span className={calibration.calibrated ? "text-success font-medium" : "text-warning font-medium"}>
              {calibration.calibrated ? 'CALIBRATED' : 'UNCALIBRATED'}
            </span>
          </div>
        </div>
      </div>

      {/* Sensor Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SensorChart 
          title="Accelerometer (Body Frame)" 
          unit="m/s²"
          data={history} 
          keys={['ax', 'ay', 'az']} 
          colors={['#ef4444', '#10b981', '#3b82f6']} 
          minSpan={2.5}
          decimals={1}
        />
        <SensorChart 
          title="Gyroscope (Body Frame)" 
          unit="°/s"
          data={history} 
          keys={['gx', 'gy', 'gz']} 
          colors={['#ef4444', '#10b981', '#3b82f6']} 
          minSpan={10}
          decimals={0}
        />
      </div>

      {/* World Frame & Calibration Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* World Frame ENU Linear Acceleration */}
        <div className="bg-panel border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted tracking-widest uppercase">World ENU Linear Acceleration (Gravity Removed)</h3>
            <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              q ⊗ a_body ⊗ q* - g
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 font-mono text-xs sm:text-sm">
            <div className="bg-background/50 border border-border rounded-lg p-2.5 text-center">
              <span className="text-[10px] text-muted block mb-1">East (a_E)</span>
              <span className="text-red-400 font-bold">{debug.linearAccelWorld.x.toFixed(3)}</span>
              <span className="text-[9px] text-muted block mt-0.5">m/s²</span>
            </div>
            <div className="bg-background/50 border border-border rounded-lg p-2.5 text-center">
              <span className="text-[10px] text-muted block mb-1">North (a_N)</span>
              <span className="text-green-400 font-bold">{debug.linearAccelWorld.y.toFixed(3)}</span>
              <span className="text-[9px] text-muted block mt-0.5">m/s²</span>
            </div>
            <div className="bg-background/50 border border-border rounded-lg p-2.5 text-center">
              <span className="text-[10px] text-muted block mb-1">Up (a_U)</span>
              <span className="text-blue-400 font-bold">{debug.linearAccelWorld.z.toFixed(3)}</span>
              <span className="text-[9px] text-muted block mt-0.5">m/s²</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-muted bg-background/30 rounded p-2 border border-border/50">
            <span>Rolling Accel Variance: <strong className="text-white">{debug.motionVariance.toFixed(4)}</strong> m²/s⁴</span>
            <span>Gravity: <strong className="text-white">9.80665 m/s² [0, 0, -g]</strong></span>
          </div>
        </div>

        {/* Bias Compensation Summary */}
        <div className="bg-panel border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted tracking-widest uppercase">Estimated IMU Biases & Noise</h3>
            <span className={calibration.calibrated ? "text-success text-[10px] font-bold" : "text-warning text-[10px] font-bold"}>
              {calibration.calibrated ? 'ESTIMATED (STATIONARY)' : 'FACTORY ZERO'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 font-mono text-xs">
            <div className="bg-background/50 border border-border rounded-lg p-2.5 space-y-1">
              <span className="text-[10px] text-muted block border-b border-border pb-1">Accel Biases (m/s²)</span>
              <div className="flex justify-between"><span>bx:</span><span className="text-gray-300">{calibration.accelBias.x.toFixed(4)}</span></div>
              <div className="flex justify-between"><span>by:</span><span className="text-gray-300">{calibration.accelBias.y.toFixed(4)}</span></div>
              <div className="flex justify-between"><span>bz:</span><span className="text-gray-300">{calibration.accelBias.z.toFixed(4)}</span></div>
            </div>
            <div className="bg-background/50 border border-border rounded-lg p-2.5 space-y-1">
              <span className="text-[10px] text-muted block border-b border-border pb-1">Gyro Biases (rad/s)</span>
              <div className="flex justify-between"><span>bx:</span><span className="text-gray-300">{calibration.gyroBias.x.toFixed(5)}</span></div>
              <div className="flex justify-between"><span>by:</span><span className="text-gray-300">{calibration.gyroBias.y.toFixed(5)}</span></div>
              <div className="flex justify-between"><span>bz:</span><span className="text-gray-300">{calibration.gyroBias.z.toFixed(5)}</span></div>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-muted font-mono flex justify-between">
            <span>Noise σ_a: {calibration.accelNoiseStd.toFixed(4)} m/s²</span>
            <span>Noise σ_g: {calibration.gyroNoiseStd.toFixed(4)} rad/s</span>
          </div>
        </div>
      </div>

      {/* Raw Values Grid */}
      {latestSensor && (
        <div className="bg-panel border border-border rounded-xl p-4 sm:p-6">
          <h3 className="text-xs font-semibold text-muted tracking-widest uppercase mb-4">Raw Body Feeds vs Calibrated Body Feeds</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs sm:text-sm">
            {/* Accel */}
            <div className="bg-background/50 border border-border rounded-lg p-3">
              <div className="text-muted text-xs uppercase tracking-wider mb-2 border-b border-border pb-1 flex justify-between">
                <span>Acceleration (Raw / Cal)</span>
                <span className="text-[10px]">m/s²</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-red-400">X:</span> 
                  <span className="text-muted">{latestSensor.accel.x.toFixed(2)}</span>
                  <span className="text-white font-bold">{debug.calibratedAccel.x.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Y:</span> 
                  <span className="text-muted">{latestSensor.accel.y.toFixed(2)}</span>
                  <span className="text-white font-bold">{debug.calibratedAccel.y.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">Z:</span> 
                  <span className="text-muted">{latestSensor.accel.z.toFixed(2)}</span>
                  <span className="text-white font-bold">{debug.calibratedAccel.z.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* Gyro */}
            <div className="bg-background/50 border border-border rounded-lg p-3">
              <div className="text-muted text-xs uppercase tracking-wider mb-2 border-b border-border pb-1 flex justify-between">
                <span>Angular Rate (Raw / Cal)</span>
                <span className="text-[10px]">°/s</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-red-400">X:</span> 
                  <span className="text-muted">{((latestSensor.gyro.x * 180) / Math.PI).toFixed(2)}</span>
                  <span className="text-white font-bold">{((debug.calibratedGyro.x * 180) / Math.PI).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Y:</span> 
                  <span className="text-muted">{((latestSensor.gyro.y * 180) / Math.PI).toFixed(2)}</span>
                  <span className="text-white font-bold">{((debug.calibratedGyro.y * 180) / Math.PI).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-400">Z:</span> 
                  <span className="text-muted">{((latestSensor.gyro.z * 180) / Math.PI).toFixed(2)}</span>
                  <span className="text-white font-bold">{((debug.calibratedGyro.z * 180) / Math.PI).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Magnitudes */}
            <div className="bg-background/50 border border-border rounded-lg p-3">
              <div className="text-muted text-xs uppercase tracking-wider mb-2 border-b border-border pb-1 flex justify-between">
                <span>Vector Norms</span>
                <span className="text-[10px]">Total</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-400">|a| norm:</span>
                  <span className="text-white font-bold">{accelMag} m/s²</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-gray-400">|ω| rate:</span>
                  <span className="text-white font-bold">{gyroMag} °/s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface SensorChartProps {
  title: string;
  unit: string;
  data: any[];
  keys: string[];
  colors: string[];
  minSpan?: number;
  decimals?: number;
}

const SensorChart = ({ title, unit, data, keys, colors, minSpan = 2, decimals }: SensorChartProps) => {
  const yDomain = ([dataMin, dataMax]: readonly [number, number]) => {
    const minVal = Number.isFinite(dataMin) ? dataMin : -minSpan;
    const maxVal = Number.isFinite(dataMax) ? dataMax : minSpan;
    return [Math.min(minVal, -minSpan), Math.max(maxVal, minSpan)] as const;
  };

  return (
    <div className="bg-panel border border-border rounded-xl p-3 sm:p-4 h-64 sm:h-72 md:h-80 flex flex-col">
      {/* Chart Header with Axis Legends */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline space-x-1.5">
          <h3 className="text-xs font-semibold text-white tracking-wider uppercase">{title}</h3>
          <span className="text-[10px] text-muted font-mono">({unit})</span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] font-mono">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[0] }} />
            <span className="text-gray-400">X</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[1] }} />
            <span className="text-gray-400">Y</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[2] }} />
            <span className="text-gray-400">Z</span>
          </span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis 
              stroke="#88888e" 
              fontSize={10} 
              width={38} 
              domain={yDomain}
              allowDataOverflow={false}
              tickFormatter={(val: number) => {
                if (Math.abs(val) < 0.001) return '0';
                return decimals !== undefined 
                  ? val.toFixed(decimals) 
                  : (Number.isInteger(val) ? val.toString() : val.toFixed(1));
              }} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f0f11', border: '1px solid #1f1f23', borderRadius: '6px' }}
              labelStyle={{ display: 'none' }}
              itemStyle={{ fontSize: 11, fontFamily: 'monospace' }}
              formatter={(val: any) => [Number(val).toFixed(2), '']}
            />
            <Line type="monotone" dataKey={keys[0]} stroke={colors[0]} dot={false} isAnimationActive={false} strokeWidth={2} />
            <Line type="monotone" dataKey={keys[1]} stroke={colors[1]} dot={false} isAnimationActive={false} strokeWidth={2} />
            <Line type="monotone" dataKey={keys[2]} stroke={colors[2]} dot={false} isAnimationActive={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
