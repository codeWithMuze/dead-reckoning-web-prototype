/**
 * NeuralRegressor.ts
 * On-device Multi-Layer Perceptron (MLP) for adaptive stride error correction.
 * Implements pure TypeScript matrix feed-forward inference, backpropagation training,
 * and fail-safe bounds clamping.
 * Aligned with SIH Problem Statement 26168.
 */

import type { FeatureVector, MLPModelData, LayerWeights, MLPrediction, TrainingConfig, TrainingProgress, DatasetSample } from './MLPTypes.ts';
import { FeatureExtractor } from './FeatureExtractor.ts';

export class NeuralRegressor {
  private modelData: MLPModelData | null = null;
  private isModelLoaded = false;

  // Safety Clamping Bounds
  private readonly minCorrectionFactor = 0.70;
  private readonly maxCorrectionFactor = 1.30;
  private readonly minStrideMeters = 0.40;
  private readonly maxStrideMeters = 1.20;

  constructor(initialModel?: MLPModelData) {
    if (initialModel) {
      this.loadModelData(initialModel);
    }
  }

  public isLoaded(): boolean {
    return this.isModelLoaded && this.modelData !== null;
  }

  public getModelData(): MLPModelData | null {
    return this.modelData ? JSON.parse(JSON.stringify(this.modelData)) : null;
  }

  public loadModelData(data: MLPModelData): boolean {
    try {
      if (!data || !data.layers || data.layers.length < 2 || !data.normParams) {
        return false;
      }
      // Validate matrix dimensions
      let prevOut = data.architecture.inputDim;
      for (const layer of data.layers) {
        if (!layer.weights || layer.weights.length === 0 || layer.weights[0].length !== prevOut) {
          return false;
        }
        if (!layer.biases || layer.biases.length !== layer.weights.length) {
          return false;
        }
        prevOut = layer.weights.length;
      }
      this.modelData = JSON.parse(JSON.stringify(data));
      this.isModelLoaded = true;
      return true;
    } catch {
      this.isModelLoaded = false;
      return false;
    }
  }

  /**
   * Evaluates the MLP on a single step feature vector.
   * Guaranteed fail-safe: never throws, never returns NaN/Infinity.
   */
  public predict(features: FeatureVector): MLPrediction {
    const startMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const baseline = features.baselineWeinbergStride;

    // Safety check: if no model loaded, return safe baseline immediately
    if (!this.isModelLoaded || !this.modelData) {
      return {
        timestamp: Date.now(),
        correctionFactor: 1.0,
        baselineStride: baseline,
        correctedStride: baseline,
        confidence: 0.5,
        isFallback: true,
        latencyMs: 0.01,
        features,
      };
    }

    try {
      const rawInputs = FeatureExtractor.toArray(features);

      // Validate inputs for NaN or Infinity
      for (let i = 0; i < rawInputs.length; i++) {
        if (!Number.isFinite(rawInputs[i])) {
          return this.createFallback(baseline, features, startMs);
        }
      }

      // 1. Z-Score Normalization: z = (x - μ) / σ
      const { means, stds } = this.modelData.normParams;
      const normalized: number[] = new Array(rawInputs.length);
      let totalZScoreDev = 0;

      for (let i = 0; i < rawInputs.length; i++) {
        const std = stds[i] > 1e-6 ? stds[i] : 1.0;
        const z = (rawInputs[i] - means[i]) / std;
        normalized[i] = Math.max(-5.0, Math.min(5.0, z)); // Clamp extreme z-scores
        totalZScoreDev += Math.abs(z);
      }

      // 2. Feed-Forward Neural Inference
      let currentActivation = normalized;
      const numLayers = this.modelData.layers.length;

      for (let l = 0; l < numLayers; l++) {
        const layer = this.modelData.layers[l];
        const isOutputLayer = l === numLayers - 1;
        const nextActivation: number[] = new Array(layer.weights.length);

        for (let j = 0; j < layer.weights.length; j++) {
          let sum = layer.biases[j];
          const wRow = layer.weights[j];
          for (let k = 0; k < currentActivation.length; k++) {
            sum += wRow[k] * currentActivation[k];
          }
          // Activation function: Linear on output layer, ReLU on hidden layers
          nextActivation[j] = isOutputLayer ? sum : (sum > 0 ? sum : 0);
        }
        currentActivation = nextActivation;
      }

      const rawOutput = currentActivation[0];

      if (!Number.isFinite(rawOutput)) {
        return this.createFallback(baseline, features, startMs);
      }

      // 3. Safety Clamping of Stride Correction Factor
      // Correction factor is restricted to [0.70, 1.30]
      const clampedFactor = Number(Math.max(this.minCorrectionFactor, Math.min(this.maxCorrectionFactor, rawOutput)).toFixed(3));

      // 4. Stride Length Calculation & Hard Human Clamping
      const computedStride = baseline * clampedFactor;
      const clampedStride = Number(Math.max(this.minStrideMeters, Math.min(this.maxStrideMeters, computedStride)).toFixed(3));

      // Confidence score: higher when features are close to distribution mean
      const avgZ = totalZScoreDev / rawInputs.length;
      const confidence = Number(Math.max(0.50, Math.min(0.98, 1.0 - (avgZ * 0.12))).toFixed(2));

      const endMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const latencyMs = Number((endMs - startMs).toFixed(3));

      return {
        timestamp: Date.now(),
        correctionFactor: clampedFactor,
        baselineStride: baseline,
        correctedStride: clampedStride,
        confidence,
        isFallback: false,
        latencyMs: Math.max(0.01, latencyMs),
        features,
      };
    } catch {
      return this.createFallback(baseline, features, startMs);
    }
  }

  private createFallback(baseline: number, features: FeatureVector, startMs: number): MLPrediction {
    const endMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return {
      timestamp: Date.now(),
      correctionFactor: 1.0,
      baselineStride: baseline,
      correctedStride: baseline,
      confidence: 0.3,
      isFallback: true,
      latencyMs: Number(Math.max(0.01, endMs - startMs).toFixed(3)),
      features,
    };
  }

  /**
   * Initializes a fresh MLP architecture with random He/Xavier initialization.
   */
  public static createArchitecture(inputDim = 8, hiddenDims = [16, 8], outputDim = 1): MLPModelData {
    const layers: LayerWeights[] = [];
    const layerDims = [inputDim, ...hiddenDims, outputDim];

    for (let l = 0; l < layerDims.length - 1; l++) {
      const fanIn = layerDims[l];
      const fanOut = layerDims[l + 1];
      const isOutputLayer = l === layerDims.length - 2;
      // He (Kaiming) initialization for hidden layers; smaller std and bias = 1.0 for output layer
      const std = isOutputLayer ? Math.sqrt(0.05 / fanIn) : Math.sqrt(2.0 / fanIn);

      const weights: number[][] = [];
      const biases: number[] = new Array(fanOut).fill(isOutputLayer ? 1.0 : 0.01);

      for (let i = 0; i < fanOut; i++) {
        const row: number[] = [];
        for (let j = 0; j < fanIn; j++) {
          // Box-Muller Gaussian sample
          const u1 = Math.random() || 1e-6;
          const u2 = Math.random() || 1e-6;
          const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
          row.push(Number((z * std).toFixed(4)));
        }
        weights.push(row);
      }
      layers.push({ weights, biases });
    }

    return {
      modelName: 'NaviSense-MLP-AdaptiveStride',
      version: '1.0.0',
      trainedAt: Date.now(),
      architecture: { inputDim, hiddenDims, outputDim },
      normParams: {
        means: new Array(inputDim).fill(0),
        stds: new Array(inputDim).fill(1),
      },
      layers,
    };
  }

  /**
   * Trains the MLP model on a session-labeled dataset using Mini-Batch Gradient Descent with Momentum.
   */
  public static async trainOnDataset(
    samples: DatasetSample[],
    config: TrainingConfig,
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<{ model: MLPModelData; metrics: NonNullable<MLPModelData['trainingMetrics']> }> {
    if (samples.length < 10) {
      throw new Error('Insufficient samples for training. Need at least 10 labeled steps.');
    }

    // 1. Session-based Train / Validation Split
    const sessions = Array.from(new Set(samples.map((s) => s.sessionId)));
    let trainSamples: DatasetSample[] = [];
    let valSamples: DatasetSample[] = [];

    if (sessions.length >= 2) {
      const valSessionCount = Math.max(1, Math.floor(sessions.length * config.valSplitRatio));
      const valSessions = new Set(sessions.slice(-valSessionCount));
      trainSamples = samples.filter((s) => !valSessions.has(s.sessionId));
      valSamples = samples.filter((s) => valSessions.has(s.sessionId));
    } else {
      // Single session fallback: 80/20 sequential split
      const splitIdx = Math.floor(samples.length * (1.0 - config.valSplitRatio));
      trainSamples = samples.slice(0, splitIdx);
      valSamples = samples.slice(splitIdx);
    }

    if (trainSamples.length === 0 || valSamples.length === 0) {
      trainSamples = samples;
      valSamples = samples;
    }

    // 2. Compute Normalization Parameters from Training Set Only
    const numFeatures = 8;
    const means: number[] = new Array(numFeatures).fill(0);
    const stds: number[] = new Array(numFeatures).fill(0);

    for (const sample of trainSamples) {
      const arr = FeatureExtractor.toArray(sample.features);
      for (let f = 0; f < numFeatures; f++) {
        means[f] += arr[f];
      }
    }
    for (let f = 0; f < numFeatures; f++) {
      means[f] /= trainSamples.length;
    }

    for (const sample of trainSamples) {
      const arr = FeatureExtractor.toArray(sample.features);
      for (let f = 0; f < numFeatures; f++) {
        stds[f] += (arr[f] - means[f]) * (arr[f] - means[f]);
      }
    }
    for (let f = 0; f < numFeatures; f++) {
      stds[f] = Math.sqrt(stds[f] / (trainSamples.length > 1 ? trainSamples.length - 1 : 1));
      if (stds[f] < 1e-4) stds[f] = 1.0;
    }

    // Initialize Architecture
    const modelData = NeuralRegressor.createArchitecture(numFeatures, [16, 8], 1);
    modelData.normParams = {
      means: means.map((m) => Number(m.toFixed(4))),
      stds: stds.map((s) => Number(s.toFixed(4))),
    };

    // Pre-normalize dataset
    const normalize = (s: DatasetSample) => {
      const raw = FeatureExtractor.toArray(s.features);
      return raw.map((x, i) => Math.max(-5.0, Math.min(5.0, (x - means[i]) / stds[i])));
    };

    const trainX = trainSamples.map(normalize);
    const trainY = trainSamples.map((s) => s.targetCorrectionFactor);
    const valX = valSamples.map(normalize);
    const valY = valSamples.map((s) => s.targetCorrectionFactor);

    // Momentum velocity buffers
    const vW: number[][][] = modelData.layers.map((l) => l.weights.map((row) => new Array(row.length).fill(0)));
    const vB: number[][] = modelData.layers.map((l) => new Array(l.biases.length).fill(0));
    const momentum = 0.9;
    const lr = config.learningRate;

    let bestValLoss = Infinity;
    let finalTrainLoss = 0;
    let finalValLoss = 0;

    // 3. Training Loop
    for (let epoch = 1; epoch <= config.epochs; epoch++) {
      let epochTrainLoss = 0;

      // Shuffle training set indices
      const indices = Array.from({ length: trainX.length }, (_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }

      // Mini-batch updates
      for (let b = 0; b < indices.length; b += config.batchSize) {
        const batchIdxs = indices.slice(b, b + config.batchSize);
        const gradW: number[][][] = modelData.layers.map((l) => l.weights.map((row) => new Array(row.length).fill(0)));
        const gradB: number[][] = modelData.layers.map((l) => new Array(l.biases.length).fill(0));

        for (const idx of batchIdxs) {
          const x = trainX[idx];
          const yTarget = trainY[idx];

          // Forward pass storing activations
          const a0 = x;
          const z1: number[] = new Array(16);
          const a1: number[] = new Array(16);
          for (let j = 0; j < 16; j++) {
            let sum = modelData.layers[0].biases[j];
            for (let k = 0; k < a0.length; k++) sum += modelData.layers[0].weights[j][k] * a0[k];
            z1[j] = sum;
            a1[j] = sum > 0 ? sum : 0;
          }

          const z2: number[] = new Array(8);
          const a2: number[] = new Array(8);
          for (let j = 0; j < 8; j++) {
            let sum = modelData.layers[1].biases[j];
            for (let k = 0; k < a1.length; k++) sum += modelData.layers[1].weights[j][k] * a1[k];
            z2[j] = sum;
            a2[j] = sum > 0 ? sum : 0;
          }

          // Output (Linear)
          let yPred = modelData.layers[2].biases[0];
          for (let k = 0; k < a2.length; k++) yPred += modelData.layers[2].weights[0][k] * a2[k];

          const err = yPred - yTarget;
          epochTrainLoss += 0.5 * err * err;

          // Backward pass
          // Layer 2 gradients (Output)
          const delta2 = err; // dL/dz2 = err * 1.0 (linear derivative)
          gradB[2][0] += delta2;
          for (let k = 0; k < a2.length; k++) gradW[2][0][k] += delta2 * a2[k];

          // Layer 1 gradients
          const delta1: number[] = new Array(8);
          for (let k = 0; k < 8; k++) {
            const dRelu = z2[k] > 0 ? 1 : 0;
            delta1[k] = (delta2 * modelData.layers[2].weights[0][k]) * dRelu;
            gradB[1][k] += delta1[k];
            for (let j = 0; j < a1.length; j++) gradW[1][k][j] += delta1[k] * a1[j];
          }

          // Layer 0 gradients
          for (let j = 0; j < 16; j++) {
            const dRelu = z1[j] > 0 ? 1 : 0;
            let sum = 0;
            for (let k = 0; k < 8; k++) sum += delta1[k] * modelData.layers[1].weights[k][j];
            const delta0 = sum * dRelu;
            gradB[0][j] += delta0;
            for (let i = 0; i < a0.length; i++) gradW[0][j][i] += delta0 * a0[i];
          }
        }

        // Apply Momentum SGD updates
        const batchScale = 1.0 / batchIdxs.length;
        for (let l = 0; l < modelData.layers.length; l++) {
          for (let j = 0; j < modelData.layers[l].weights.length; j++) {
            vB[l][j] = momentum * vB[l][j] - lr * (gradB[l][j] * batchScale);
            modelData.layers[l].biases[j] += vB[l][j];

            for (let k = 0; k < modelData.layers[l].weights[j].length; k++) {
              vW[l][j][k] = momentum * vW[l][j][k] - lr * (gradW[l][j][k] * batchScale);
              modelData.layers[l].weights[j][k] += vW[l][j][k];
            }
          }
        }
      }

      finalTrainLoss = epochTrainLoss / trainSamples.length;

      // Validation evaluation
      let epochValLoss = 0;
      for (let i = 0; i < valX.length; i++) {
        const x = valX[i];
        // Forward pass
        const a1 = modelData.layers[0].biases.map((b, j) => {
          const s = x.reduce((acc, val, k) => acc + modelData.layers[0].weights[j][k] * val, b);
          return s > 0 ? s : 0;
        });
        const a2 = modelData.layers[1].biases.map((b, j) => {
          const s = a1.reduce((acc, val, k) => acc + modelData.layers[1].weights[j][k] * val, b);
          return s > 0 ? s : 0;
        });
        const pred = a2.reduce((acc, val, k) => acc + modelData.layers[2].weights[0][k] * val, modelData.layers[2].biases[0]);
        const err = pred - valY[i];
        epochValLoss += 0.5 * err * err;
      }
      finalValLoss = epochValLoss / valSamples.length;

      if (finalValLoss < bestValLoss) {
        bestValLoss = finalValLoss;
      }

      if (onProgress && (epoch % 2 === 0 || epoch === config.epochs)) {
        onProgress({
          epoch,
          totalEpochs: config.epochs,
          trainLoss: Number(finalTrainLoss.toFixed(5)),
          valLoss: Number(finalValLoss.toFixed(5)),
          isComplete: epoch === config.epochs,
        });
        // Yield to browser event loop so UI can animate progress bar and loss
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
    }

    // Compute Test MAE and RMSE on validation set
    let sumAbsErr = 0;
    let sumSqErr = 0;
    for (let i = 0; i < valX.length; i++) {
      const x = valX[i];
      const a1 = modelData.layers[0].biases.map((b, j) => {
        const s = x.reduce((acc, val, k) => acc + modelData.layers[0].weights[j][k] * val, b);
        return s > 0 ? s : 0;
      });
      const a2 = modelData.layers[1].biases.map((b, j) => {
        const s = a1.reduce((acc, val, k) => acc + modelData.layers[1].weights[j][k] * val, b);
        return s > 0 ? s : 0;
      });
      const pred = a2.reduce((acc, val, k) => acc + modelData.layers[2].weights[0][k] * val, modelData.layers[2].biases[0]);
      const absErr = Math.abs(pred - valY[i]);
      sumAbsErr += absErr;
      sumSqErr += absErr * absErr;
    }

    const testMae = Number((sumAbsErr / valSamples.length).toFixed(4));
    const testRmse = Number(Math.sqrt(sumSqErr / valSamples.length).toFixed(4));

    const metrics = {
      trainLoss: Number(finalTrainLoss.toFixed(5)),
      valLoss: Number(finalValLoss.toFixed(5)),
      testMae,
      testRmse,
      sampleCount: samples.length,
      sessionCount: sessions.length,
    };

    modelData.modelName = `NaviSense-MLP-OnDevice (${samples.length} steps)`;
    modelData.trainingMetrics = metrics;

    return { model: modelData, metrics };
  }
}
