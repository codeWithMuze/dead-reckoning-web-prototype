/**
 * MLPTypes.ts
 * Type definitions for the on-device Multi-Layer Perceptron (MLP)
 * adaptive stride and dead-reckoning error correction module.
 * Aligned with SIH Problem Statement 26168.
 */

export interface FeatureVector {
  accelMagnitudeMean: number;    // Mean of ||a|| over step window (~500ms) [m/s²]
  accelMagnitudeVar: number;     // Variance of ||a|| (gait dynamic intensity) [m²/s⁴]
  accelSwing: number;            // Peak-to-valley vertical dynamic swing (a_max - a_min) [m/s²]
  gyroMagnitudeMean: number;     // Mean angular velocity ||ω|| [rad/s]
  gyroMagnitudeVar: number;      // Variance of angular velocity (turning/instability) [rad²/s²]
  cadence: number;               // Instantaneous walking cadence [steps/min]
  stepIntervalSec: number;       // Duration of step interval Δt [seconds]
  baselineWeinbergStride: number;// Deterministic Weinberg stride length L_0 [meters]
}

export const FEATURE_NAMES: (keyof FeatureVector)[] = [
  'accelMagnitudeMean',
  'accelMagnitudeVar',
  'accelSwing',
  'gyroMagnitudeMean',
  'gyroMagnitudeVar',
  'cadence',
  'stepIntervalSec',
  'baselineWeinbergStride',
];

export interface FeatureNormParams {
  means: number[];  // Length 8
  stds: number[];   // Length 8
}

export interface LayerWeights {
  weights: number[][]; // [outputs x inputs]
  biases: number[];    // [outputs]
}

export interface MLPModelData {
  modelName: string;
  version: string;
  trainedAt: number;
  architecture: {
    inputDim: number;
    hiddenDims: number[];
    outputDim: number;
  };
  normParams: FeatureNormParams;
  layers: LayerWeights[];
  trainingMetrics?: {
    trainLoss: number;
    valLoss: number;
    testMae: number;
    testRmse: number;
    sampleCount: number;
    sessionCount: number;
  };
}

export interface MLPrediction {
  timestamp: number;
  correctionFactor: number;   // Scalar multiplier c (clamped to [0.70, 1.30])
  baselineStride: number;     // Deterministic Weinberg stride L_0 [m]
  correctedStride: number;    // L_corrected = clamp(L_0 * c, 0.40, 1.20) [m]
  confidence: number;         // Reliability score [0.0 - 1.0]
  isFallback: boolean;        // True if safe fallback was triggered
  latencyMs: number;          // On-device inference execution time [ms]
  features: FeatureVector;    // Raw input features evaluated
}

export interface MLTelemetry {
  mlEnabled: boolean;
  status: 'ACTIVE' | 'STANDBY' | 'FALLBACK' | 'NO_MODEL';
  modelName: string;
  correctionFactor: number;
  baselineStride: number;
  correctedStride: number;
  confidence: number;
  lastInferenceMs: number;
  totalPredictions: number;
  fallbackCount: number;
  recentPrediction: MLPrediction | null;
}

export interface DatasetSample {
  sessionId: string;
  timestamp: number;
  features: FeatureVector;
  groundTruthStrideMeters: number;
  targetCorrectionFactor: number; // groundTruthStride / baselineStride
}

export interface SessionDataset {
  datasetId: string;
  createdAt: number;
  totalSamples: number;
  totalSessions: number;
  sessions: {
    sessionId: string;
    protocol: string;
    groundTruthDistanceM: number;
    measuredBaselineDistanceM: number;
    stepCount: number;
    targetCorrectionFactor: number;
    samples: DatasetSample[];
  }[];
}

export interface TrainingConfig {
  epochs: number;
  learningRate: number;
  batchSize: number;
  valSplitRatio: number; // e.g. 0.25
  l2Reg?: number;
}

export interface TrainingProgress {
  epoch: number;
  totalEpochs: number;
  trainLoss: number;
  valLoss: number;
  isComplete: boolean;
}
