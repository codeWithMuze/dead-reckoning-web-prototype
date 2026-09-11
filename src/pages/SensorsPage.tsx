import { useEffect, useState } from 'react';
import { useNavStore } from '../store/useNavStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

export const SensorsPage = () => {
  const { latestSensor, calibration } = useNavStore();
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!latestSensor) return;
    setHistory(prev => {
      const newHist = [...prev, {
        time: latestSensor.timestamp,
        ax: latestSensor.accel.x,
        ay: latestSensor.accel.y,
        az: latestSensor.accel.z,
        gx: latestSensor.gyro.x,
        gy: latestSensor.gyro.y,
        gz: latestSensor.gyro.z,
      }];
      if (newHist.length > 50) return newHist.slice(newHist.length - 50); // Keep last 50 points
      return newHist;
    });
  }, [latestSensor]);

  const accelMag = latestSensor 
    ? Math.sqrt(latestSensor.accel.x**2 + latestSensor.accel.y**2 + latestSensor.accel.z**2).toFixed(2)
    : '0.00';
  const gyroMag = latestSensor
    ? Math.sqrt(latestSensor.gyro.x**2 + latestSensor.gyro.y**2 + latestSensor.gyro.z**2).toFixed(2)
    : '0.00';

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">Sensor Telemetry</h2>
          <p className="text-xs text-muted">Real-time IMU streams & dynamic orientation</p>
        </div>
        <div className="bg-panel border border-border px-3 py-1 rounded-full text-xs text-muted flex items-center space-x-2">
          <span className="font-mono text-white">{history.length > 0 ? (1000 / (Date.now() - history[0].time) * history.length).toFixed(0) : 0} Hz</span>
          <span className="text-border">|</span>
          <span className={calibration.calibrated ? "text-success font-medium" : "text-warning font-medium"}>
            {calibration.calibrated ? 'CALIBRATED' : 'UNCALIBRATED'}
          </span>
        </div>
      </div>

      {/* Sensor Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <SensorChart 
          title="Accelerometer" 
          unit="m/s²"
          data={history} 
          keys={['ax', 'ay', 'az']} 
          colors={['#ef4444', '#10b981', '#3b82f6']} 
        />
        <SensorChart 
          title="Gyroscope" 
          unit="°/s"
          data={history} 
          keys={['gx', 'gy', 'gz']} 
          colors={['#ef4444', '#10b981', '#3b82f6']} 
        />
      </div>

      {/* Raw Values Grid */}
      {latestSensor && (
        <div className="bg-panel border border-border rounded-xl p-4 sm:p-6">
          <h3 className="text-xs font-semibold text-muted tracking-widest uppercase mb-4">Raw IMU Feeds</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs sm:text-sm">
            {/* Accel */}
            <div className="bg-background/50 border border-border rounded-lg p-3">
              <div className="text-muted text-xs uppercase tracking-wider mb-2 border-b border-border pb-1 flex justify-between">
                <span>Acceleration</span>
                <span className="text-[10px]">m/s²</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-red-400">X:</span> <span>{latestSensor.accel.x.toFixed(3)}</span></div>
                <div className="flex justify-between"><span className="text-green-400">Y:</span> <span>{latestSensor.accel.y.toFixed(3)}</span></div>
                <div className="flex justify-between"><span className="text-blue-400">Z:</span> <span>{latestSensor.accel.z.toFixed(3)}</span></div>
              </div>
            </div>

            {/* Gyro */}
            <div className="bg-background/50 border border-border rounded-lg p-3">
              <div className="text-muted text-xs uppercase tracking-wider mb-2 border-b border-border pb-1 flex justify-between">
                <span>Angular Rate</span>
                <span className="text-[10px]">°/s</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span className="text-red-400">X (Pitch):</span> <span>{latestSensor.gyro.x.toFixed(3)}</span></div>
                <div className="flex justify-between"><span className="text-green-400">Y (Roll):</span> <span>{latestSensor.gyro.y.toFixed(3)}</span></div>
                <div className="flex justify-between"><span className="text-blue-400">Z (Yaw):</span> <span>{latestSensor.gyro.z.toFixed(3)}</span></div>
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

const SensorChart = ({ title, unit, data, keys, colors }: any) => (
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
          <YAxis stroke="#88888e" fontSize={10} width={36} tickFormatter={(val) => val.toFixed(1)} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f0f11', border: '1px solid #1f1f23', borderRadius: '6px' }}
            labelStyle={{ display: 'none' }}
            itemStyle={{ fontSize: 11, fontFamily: 'monospace' }}
          />
          <Line type="monotone" dataKey={keys[0]} stroke={colors[0]} dot={false} isAnimationActive={false} strokeWidth={2} />
          <Line type="monotone" dataKey={keys[1]} stroke={colors[1]} dot={false} isAnimationActive={false} strokeWidth={2} />
          <Line type="monotone" dataKey={keys[2]} stroke={colors[2]} dot={false} isAnimationActive={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);
