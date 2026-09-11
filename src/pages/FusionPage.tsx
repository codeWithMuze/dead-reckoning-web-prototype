import React, { useState, useEffect } from 'react';
import { useNavStore } from '../store/useNavStore.ts';
import { aiModule } from '../engine/AIModule.ts';
import type { TrainingProgress } from '../engine/ml/MLPTypes.ts';
import {
  Cpu,
  Sparkles,
  Activity,
  Database,
  Download,
  Play,
  AlertTriangle,
  Layers,
  Zap,
  ShieldCheck,
} from 'lucide-react';

export const FusionPage: React.FC = () => {
  const { navState, latestSensor, mlEnabled, setMLEnabled, mlTelemetry } = useNavStore();

  const [isTraining, setIsTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState<TrainingProgress | null>(null);
  const [trainError, setTrainError] = useState<string | null>(null);
  const [datasetCount, setDatasetCount] = useState({
    samples: aiModule.getDatasetSampleCount(),
    sessions: aiModule.getDatasetSessionCount(),
  });

  const refreshDatasetCounts = () => {
    setDatasetCount({
      samples: aiModule.getDatasetSampleCount(),
      sessions: aiModule.getDatasetSessionCount(),
    });
  };

  useEffect(() => {
    refreshDatasetCounts();
  }, [mlTelemetry.totalPredictions]);

  const handleToggleML = () => {
    const nextState = !mlEnabled;
    aiModule.setEnabled(nextState);
    setMLEnabled(nextState);
  };

  const handleTrainOnDevice = async () => {
    setTrainError(null);
    setIsTraining(true);
    setTrainProgress(null);

    try {
      await aiModule.trainOnRecordedSessions(
        { epochs: 40, learningRate: 0.008, batchSize: 8, valSplitRatio: 0.25 },
        (progress) => setTrainProgress(progress)
      );
      refreshDatasetCounts();
    } catch (err: unknown) {
      setTrainError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsTraining(false);
    }
  };

  const handleExportDatasetCSV = () => {
    const csv = aiModule.exportDatasetCSV();
    if (!csv || datasetCount.samples === 0) {
      alert('No labeled dataset samples available. Walk a measured distance field test (TEST-06, TEST-07, or TEST-ML-01) first.');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navisense_ml_features_dataset_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportModelJSON = () => {
    const json = aiModule.exportModelJSON();
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navisense_mlp_model_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleResetPretrained = () => {
    if (confirm('Reset to calibrated baseline pre-trained model weights?')) {
      aiModule.loadPretrainedModel();
      setTrainProgress(null);
      setTrainError(null);
      refreshDatasetCounts();
    }
  };

  const handleClearDataset = () => {
    if (confirm('Clear all recorded training samples from local storage?')) {
      aiModule.clearDataset();
      refreshDatasetCounts();
    }
  };

  const recentPred = mlTelemetry.recentPrediction;
  const features = recentPred?.features;

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 pb-24 md:pb-10 bg-background">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Primary ML Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-panel border border-border rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                AI/ML Intelligent Dead Reckoning
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                SIH 26168
              </span>
            </div>
            <p className="text-xs text-muted">
              On-device Multi-Layer Perceptron (MLP) learning adaptive pedestrian stride error correction from real IMU kinematics.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleML}
              className={`px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shadow-md ${
                mlEnabled
                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                  : 'bg-panel border border-gray-600 text-gray-400 hover:border-gray-500'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${mlEnabled ? 'text-white' : 'text-gray-500'}`} />
              <span>{mlEnabled ? 'ML CORRECTION: ACTIVE' : 'ML CORRECTION: DISABLED'}</span>
            </button>
          </div>
        </div>

        {/* Live Stride Correction Pipeline HUD */}
        <div className="bg-panel border border-border rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Dynamic Stride Estimation HUD
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-muted">Status:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  mlTelemetry.status === 'ACTIVE'
                    ? 'bg-success/20 text-success border border-success/30'
                    : mlTelemetry.status === 'FALLBACK'
                    ? 'bg-warning/20 text-warning border border-warning/30'
                    : 'bg-black/40 text-muted'
                }`}
              >
                {mlTelemetry.status}
              </span>
              <span className="text-muted text-[11px] ml-2">Latency:</span>
              <span className="text-primary font-bold text-[11px]">
                {mlTelemetry.lastInferenceMs < 0.1 ? '< 0.05 ms' : `${mlTelemetry.lastInferenceMs.toFixed(2)} ms`}
              </span>
            </div>
          </div>

          {/* Mathematical Step Equation Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="bg-background/80 border border-border p-3.5 rounded-xl space-y-1">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
                1. Baseline Weinberg Stride (L₀)
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold font-mono text-white">
                  {mlTelemetry.baselineStride.toFixed(3)}
                </span>
                <span className="text-xs text-muted">m</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                L₀ = k · (a_max - a_min)^(1/4)
              </p>
            </div>

            <div className="bg-purple-950/20 border border-purple-500/40 p-3.5 rounded-xl space-y-1">
              <span className="text-[10px] text-purple-300 uppercase font-bold tracking-wider block">
                2. Neural Correction Factor (c)
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold font-mono text-purple-300">
                  {mlTelemetry.correctionFactor.toFixed(4)}
                </span>
                <span className="text-xs text-purple-400">×</span>
              </div>
              <p className="text-[10px] text-purple-400/80 font-mono">
                c = MLP(x), clamped [0.70, 1.30]
              </p>
            </div>

            <div className="bg-background/80 border border-border p-3.5 rounded-xl space-y-1">
              <span className="text-[10px] text-success uppercase font-bold tracking-wider block">
                3. Corrected Stride Length (L_corr)
              </span>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold font-mono text-success">
                  {mlTelemetry.correctedStride.toFixed(3)}
                </span>
                <span className="text-xs text-muted">m</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                L_corr = c · L₀
              </p>
            </div>

            <div className="bg-background/80 border border-border p-3.5 rounded-xl space-y-1">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
                4. Gait Adjustment Delta (ΔL)
              </span>
              <div className="flex items-baseline space-x-1">
                <span
                  className={`text-2xl font-bold font-mono ${
                    mlTelemetry.correctedStride >= mlTelemetry.baselineStride
                      ? 'text-primary'
                      : 'text-warning'
                  }`}
                >
                  {mlTelemetry.correctedStride >= mlTelemetry.baselineStride ? '+' : ''}
                  {(mlTelemetry.correctedStride - mlTelemetry.baselineStride).toFixed(3)}
                </span>
                <span className="text-xs text-muted">m</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono">
                ΔL = (c - 1) · L₀
              </p>
            </div>
          </div>

          {/* Diagnostic Stats */}
          <div className="flex flex-wrap items-center justify-between text-xs font-mono bg-black/30 p-2.5 rounded-xl border border-border/50 text-gray-300 gap-2">
            <div>
              Total Inferences: <span className="text-white font-bold">{mlTelemetry.totalPredictions}</span>
            </div>
            <div>
              Model Confidence: <span className="text-purple-300 font-bold">{(mlTelemetry.confidence * 100).toFixed(0)}%</span>
            </div>
            <div>
              Failsafe Fallbacks: <span className="text-warning font-bold">{mlTelemetry.fallbackCount}</span>
            </div>
            <div>
              Model ID: <span className="text-white font-semibold">{mlTelemetry.modelName}</span>
            </div>
          </div>
        </div>

        {/* Live 8-Dimensional Feature Extraction Vector */}
        <div className="bg-panel border border-border rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Extracted 8-D Kinematic Feature Vector (Per Step)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-muted">Window: 50Hz circular buffer</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <FeatureCard
              name="Accel Mean (ā)"
              val={features ? `${features.accelMagnitudeMean.toFixed(2)} m/s²` : '---'}
              desc="Average dynamic body acceleration"
            />
            <FeatureCard
              name="Accel Var (σ_a²)"
              val={features ? `${features.accelMagnitudeVar.toFixed(3)}` : '---'}
              desc="Energy dispersion across footfall"
            />
            <FeatureCard
              name="Accel Swing (Δa)"
              val={features ? `${features.accelSwing.toFixed(2)} m/s²` : '---'}
              desc="Peak-to-valley acceleration spread"
            />
            <FeatureCard
              name="Gyro Mean (ω̄)"
              val={features ? `${features.gyroMagnitudeMean.toFixed(2)} rad/s` : '---'}
              desc="Mean angular rate of limb rotation"
            />
            <FeatureCard
              name="Gyro Var (σ_ω²)"
              val={features ? `${features.gyroMagnitudeVar.toFixed(3)}` : '---'}
              desc="Rotational turbulence of gait"
            />
            <FeatureCard
              name="Cadence (SPM)"
              val={features ? `${features.cadence.toFixed(0)} steps/min` : '---'}
              desc="Walking frequency"
            />
            <FeatureCard
              name="Step Interval (Δt)"
              val={features ? `${features.stepIntervalSec.toFixed(2)} s` : '---'}
              desc="Period between foot strikes"
            />
            <FeatureCard
              name="Weinberg Stride (L₀)"
              val={features ? `${features.baselineWeinbergStride.toFixed(3)} m` : '---'}
              desc="Deterministic baseline estimate"
            />
          </div>
        </div>

        {/* Model Architecture & Transparency Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-panel border border-border rounded-2xl p-4 sm:p-5 shadow-lg space-y-3">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Neural Architecture Transparency
              </h3>
            </div>
            <div className="space-y-2 text-xs font-mono text-gray-300">
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Topology:</span>
                <span className="text-white font-bold">MLP 8 → 16 → 8 → 1</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Hidden Activations:</span>
                <span className="text-white font-bold">ReLU (Rectified Linear)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Output Activation:</span>
                <span className="text-white font-bold">Linear with Safety Clamp</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Input Normalization:</span>
                <span className="text-white font-bold">Online Z-Score Standardization</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Total Parameters:</span>
                <span className="text-purple-300 font-bold">289 weights & biases</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/40">
                <span className="text-muted">Runtime Engine:</span>
                <span className="text-success font-bold">Pure TypeScript (Zero Cloud Latency)</span>
              </div>
            </div>

            <div className="bg-background/80 border border-border/70 rounded-xl p-3 text-[11px] space-y-1 text-gray-300">
              <div className="flex items-center space-x-1.5 text-primary font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Deterministic Failsafe Policy</span>
              </div>
              <p className="text-muted leading-relaxed">
                If sensor anomalies, NaN values, or extreme outliers occur, the model automatically disengages (c = 1.0) and reverts to deterministic Weinberg PDR without disrupting navigation.
              </p>
            </div>
          </div>

          {/* On-Device Training & Dataset Manager */}
          <div className="bg-panel border border-border rounded-2xl p-4 sm:p-5 shadow-lg space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    On-Device Training & Dataset
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-gray-300 border border-border">
                  {datasetCount.samples} Samples / {datasetCount.sessions} Sessions
                </span>
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Walk standardized distance protocols (e.g. 20m in TEST-06 or TEST-ML-01). The ground-truth distance automatically labels the recorded gait samples for on-device supervised training.
              </p>

              {/* Training Progress HUD */}
              {isTraining && trainProgress && (
                <div className="bg-purple-950/30 border border-purple-500/40 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-purple-300">
                      Training Epoch: {trainProgress.epoch} / {trainProgress.totalEpochs}
                    </span>
                    <span className="text-white font-bold">
                      Train Loss: {trainProgress.trainLoss.toFixed(4)}
                    </span>
                  </div>
                  <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full transition-all duration-150"
                      style={{
                        width: `${(trainProgress.epoch / trainProgress.totalEpochs) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {trainError && (
                <div className="bg-danger/10 border border-danger/40 p-2.5 rounded-xl text-xs font-mono text-danger flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{trainError}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleTrainOnDevice}
                  disabled={isTraining || datasetCount.samples < 10}
                  className={`px-3 py-2 rounded-xl text-xs font-bold font-mono flex items-center justify-center space-x-1.5 cursor-pointer transition-all ${
                    datasetCount.samples >= 10 && !isTraining
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
                      : 'bg-panel border border-border text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isTraining ? 'TRAINING...' : 'TRAIN ON-DEVICE'}</span>
                </button>

                <button
                  onClick={handleExportDatasetCSV}
                  className="px-3 py-2 rounded-xl text-xs font-bold font-mono bg-panel border border-border hover:border-gray-500 text-gray-300 hover:text-white flex items-center justify-center space-x-1.5 cursor-pointer transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  <span>EXPORT DATASET</span>
                </button>
              </div>

              <div className="flex justify-between items-center text-[11px] pt-1">
                <button
                  onClick={handleExportModelJSON}
                  className="text-muted hover:text-white underline cursor-pointer"
                >
                  Export Model Weights (.json)
                </button>
                <div className="space-x-3">
                  <button
                    onClick={handleResetPretrained}
                    className="text-muted hover:text-primary underline cursor-pointer"
                  >
                    Reset Pretrained
                  </button>
                  <button
                    onClick={handleClearDataset}
                    className="text-muted hover:text-danger underline cursor-pointer"
                  >
                    Clear Dataset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Rate Sensor Fusion Architecture Flow */}
        <div className="bg-panel border border-border rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Complete Multi-Rate Sensor Fusion Pipeline
            </h3>
            <p className="text-xs text-muted">
              Loosely-coupled 4-State Extended Kalman Filter ($p_e, p_n, v_e, v_n$) with adaptive ML stride integration
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
            {/* Stage 1 */}
            <div className="bg-background/80 border border-border p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-primary font-bold text-[10px] uppercase">Stage 1: Ingestion</span>
                <span className="text-[10px] text-muted">50Hz / 1Hz</span>
              </div>
              <div className="space-y-1 text-gray-300 text-[11px]">
                <div className="flex items-center justify-between">
                  <span>GPS Fix:</span>
                  <span className={navState.gpsActive ? 'text-success font-bold' : 'text-danger font-bold'}>
                    {navState.gpsActive ? 'LOCKED' : 'DENIED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>IMU Accel:</span>
                  <span className="text-white">
                    {latestSensor ? `|a|=${Math.hypot(latestSensor.accel.x, latestSensor.accel.y, latestSensor.accel.z).toFixed(1)}` : 'WAITING'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>IMU Gyro:</span>
                  <span className="text-white">
                    {latestSensor ? `|ω|=${Math.hypot(latestSensor.gyro.x, latestSensor.gyro.y, latestSensor.gyro.z).toFixed(2)}` : 'WAITING'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage 2 */}
            <div className="bg-background/80 border border-border p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-warning font-bold text-[10px] uppercase">Stage 2: Attitude</span>
                <span className="text-[10px] text-muted">Madgwick</span>
              </div>
              <div className="space-y-1 text-gray-300 text-[11px]">
                <div className="flex items-center justify-between">
                  <span>Heading:</span>
                  <span className="text-white font-bold">{navState.heading.toFixed(1)}°</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Motion State:</span>
                  <span className="text-warning font-bold">{navState.motionState}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>ZUPT Clamping:</span>
                  <span className={navState.motionState === 'STATIONARY' ? 'text-success font-bold' : 'text-muted'}>
                    {navState.motionState === 'STATIONARY' ? 'ENGAGED' : 'FREE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Stage 3 */}
            <div className="bg-purple-950/20 border border-purple-500/40 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-purple-300 font-bold text-[10px] uppercase">Stage 3: ML Stride</span>
                <span className="text-[10px] text-purple-400">Adaptive</span>
              </div>
              <div className="space-y-1 text-gray-300 text-[11px]">
                <div className="flex items-center justify-between">
                  <span>Step Count:</span>
                  <span className="text-white font-bold">{navState.pdr.stepCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cadence:</span>
                  <span className="text-purple-300 font-bold">{navState.pdr.cadence.toFixed(0)} SPM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Stride:</span>
                  <span className="text-success font-bold">{navState.pdr.strideLength.toFixed(3)} m</span>
                </div>
              </div>
            </div>

            {/* Stage 4 */}
            <div className="bg-background/80 border border-success/40 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-success font-bold text-[10px] uppercase">Stage 4: Fused Fix</span>
                <span className="text-[10px] text-muted">4-State EKF</span>
              </div>
              <div className="space-y-1 text-gray-300 text-[11px]">
                <div className="flex items-center justify-between">
                  <span>PDR Distance:</span>
                  <span className="text-white font-bold">{navState.pdr.totalDistance.toFixed(1)} m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Uncertainty (1σ):</span>
                  <span className="text-white font-bold">±{navState.uncertainty.toFixed(1)} m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Nav Mode:</span>
                  <span className="text-success font-bold">{navState.mode}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FeatureCardProps {
  name: string;
  val: string;
  desc: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ name, val, desc }) => (
  <div className="bg-background/80 border border-border/70 p-2.5 rounded-xl space-y-1">
    <div className="flex justify-between items-center text-[10px] text-muted font-semibold">
      <span>{name}</span>
    </div>
    <div className="text-sm font-bold text-white truncate">{val}</div>
    <div className="text-[9px] text-gray-400 truncate">{desc}</div>
  </div>
);
