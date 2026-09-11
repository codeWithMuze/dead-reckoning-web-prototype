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
      if (newHist.length > 50) return newHist.slice(newHist.length - 50); // Keep last 50 points (roughly 1 sec at 50Hz)
      return newHist;
    });
  }, [latestSensor]);

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-white">Sensor Telemetry</h2>
        <div className="bg-panel border border-border px-3 py-1 rounded-full text-xs text-muted flex space-x-2">
          <span>{history.length > 0 ? (1000 / (Date.now() - history[0].time) * history.length).toFixed(0) : 0} Hz</span>
          <span className="text-border">|</span>
          <span className={calibration.calibrated ? "text-success" : "text-warning"}>
            {calibration.calibrated ? 'CALIBRATED' : 'UNCALIBRATED'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SensorChart title="Accelerometer (m/s²)" data={history} keys={['ax', 'ay', 'az']} colors={['#ef4444', '#10b981', '#3b82f6']} />
        <SensorChart title="Gyroscope (°/s)" data={history} keys={['gx', 'gy', 'gz']} colors={['#ef4444', '#10b981', '#3b82f6']} />
      </div>

      {latestSensor && (
        <div className="bg-panel border border-border rounded-lg p-6">
          <h3 className="text-sm font-semibold text-muted tracking-widest mb-4">RAW VALUES</h3>
          <div className="grid grid-cols-3 gap-6 font-mono text-sm">
            <div>
              <div className="text-muted mb-2 border-b border-border pb-1">Accel</div>
              <div className="text-red-400">X: {latestSensor.accel.x.toFixed(3)}</div>
              <div className="text-green-400">Y: {latestSensor.accel.y.toFixed(3)}</div>
              <div className="text-blue-400">Z: {latestSensor.accel.z.toFixed(3)}</div>
              <div className="mt-2 text-white font-bold">
                |a|: {Math.sqrt(latestSensor.accel.x**2 + latestSensor.accel.y**2 + latestSensor.accel.z**2).toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-muted mb-2 border-b border-border pb-1">Gyro</div>
              <div className="text-red-400">X: {latestSensor.gyro.x.toFixed(3)}</div>
              <div className="text-green-400">Y: {latestSensor.gyro.y.toFixed(3)}</div>
              <div className="text-blue-400">Z: {latestSensor.gyro.z.toFixed(3)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SensorChart = ({ title, data, keys, colors }: any) => (
  <div className="bg-panel border border-border rounded-lg p-4 h-80 flex flex-col">
    <h3 className="text-xs font-semibold text-muted tracking-widest mb-4 uppercase">{title}</h3>
    <div className="flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
          <XAxis dataKey="time" hide />
          <YAxis stroke="#88888e" fontSize={10} tickFormatter={(val) => val.toFixed(1)} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f0f11', border: '1px solid #1f1f23', borderRadius: '4px' }}
            labelStyle={{ display: 'none' }}
            itemStyle={{ fontSize: 12, fontFamily: 'monospace' }}
          />
          <Line type="monotone" dataKey={keys[0]} stroke={colors[0]} dot={false} isAnimationActive={false} strokeWidth={2} />
          <Line type="monotone" dataKey={keys[1]} stroke={colors[1]} dot={false} isAnimationActive={false} strokeWidth={2} />
          <Line type="monotone" dataKey={keys[2]} stroke={colors[2]} dot={false} isAnimationActive={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);
