/**
 * AIModule.ts
 * Real on-device AI/ML integration coordinator for NaviSense.
 * Aligned with SIH Problem Statement 26168.
 * Connects 50Hz feature extraction, MLP neural regression, fallback protection,
 * and session-labeled training directly to the live navigation pipeline.
 */

import { NeuralRegressor } from './ml/NeuralRegressor';
import { FeatureExtractor } from './ml/FeatureExtractor';
import { PRETRAINED_STRIDE_MODEL } from './ml/pretrained_model';
import type { FeatureVector, MLPModelData, MLPrediction, MLTelemetry, DatasetSample, TrainingConfig, TrainingProgress } from './ml/MLPTypes';
import type { SensorSample, StepEvent } from '../types';
import { useNavStore } from '../store/useNavStore';

const STORAGE_MODEL_KEY = 'navisense_ml_model_v1';
const STORAGE_DATASET_KEY = 'navisense_ml_dataset_v1';

export class AIModule {
  private static instance: AIModule;

  private regressor: NeuralRegressor;
  private featureExtractor = new FeatureExtractor();
  private mlEnabled = false;

  private totalPredictions = 0;
  private fallbackCount = 0;
  private lastPrediction: MLPrediction | null = null;
  private datasetSamples: DatasetSample[] = [];

  private constructor() {
    this.regressor = new NeuralRegressor(PRETRAINED_STRIDE_MODEL);
    this.loadCustomModelFromStorage();
    this.loadDatasetFromStorage();
  }

  public static getInstance(): AIModule {
    if (!AIModule.instance) {
      AIModule.instance = new AIModule();
    }
    return AIModule.instance;
  }

  public isEnabled(): boolean {
    return this.mlEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.mlEnabled = enabled;
    try {
      useNavStore.getState().setMLEnabled(enabled);
      this.syncTelemetry();
    } catch {}
  }

  public isModelLoaded(): boolean {
    return this.regressor.isLoaded();
  }

  public getModelData(): MLPModelData | null {
    return this.regressor.getModelData();
  }

  /**
   * Continuous 50Hz sensor stream intake.
   * Feeds the internal circular buffer for dynamic feature extraction.
   */
  public feedSensorSample(sample: SensorSample) {
    this.featureExtractor.feedSample(sample.accel, sample.gyro, sample.timestamp);
  }

  /**
   * Main inference entry point called when StepDetector detects a step.
   * @param stepEvent The discrete step event containing Weinberg stride and cadence
   * @param accelSwing Dynamic vertical acceleration swing (a_max - a_min)
   * @returns MLPrediction containing scalar correction factor and corrected stride
   */
  public evaluateStep(stepEvent: StepEvent, accelSwing: number): MLPrediction {
    // 1. Extract physically meaningful 8-D feature vector
    const features: FeatureVector = this.featureExtractor.extractFeatures(
      stepEvent.timestamp,
      stepEvent.cadence,
      stepEvent.strideLength,
      accelSwing
    );

    // 2. If ML is disabled by user, return safe identity factor
    if (!this.mlEnabled) {
      const pred: MLPrediction = {
        timestamp: stepEvent.timestamp,
        correctionFactor: 1.0,
        baselineStride: stepEvent.strideLength,
        correctedStride: stepEvent.strideLength,
        confidence: 1.0,
        isFallback: false,
        latencyMs: 0.01,
        features,
      };
      this.lastPrediction = pred;
      this.syncTelemetry();
      return pred;
    }

    // 3. Run on-device neural regression
    const pred = this.regressor.predict(features);
    this.totalPredictions++;

    if (pred.isFallback) {
      this.fallbackCount++;
    }

    this.lastPrediction = pred;
    this.syncTelemetry();

    return pred;
  }

  private syncTelemetry() {
    try {
      const model = this.regressor.getModelData();
      const status: MLTelemetry['status'] = !this.isModelLoaded()
        ? 'NO_MODEL'
        : !this.mlEnabled
        ? 'STANDBY'
        : (this.lastPrediction?.isFallback ? 'FALLBACK' : 'ACTIVE');

      useNavStore.getState().updateMLTelemetry({
        mlEnabled: this.mlEnabled,
        status,
        modelName: model?.modelName || 'None',
        correctionFactor: this.lastPrediction?.correctionFactor || 1.0,
        baselineStride: this.lastPrediction?.baselineStride || 0.70,
        correctedStride: this.lastPrediction?.correctedStride || 0.70,
        confidence: this.lastPrediction?.confidence || 0.5,
        lastInferenceMs: this.lastPrediction?.latencyMs || 0.01,
        totalPredictions: this.totalPredictions,
        fallbackCount: this.fallbackCount,
        recentPrediction: this.lastPrediction,
      });
    } catch {}
  }

  /**
   * Adds a ground-truth labeled sample from a completed Field Test (e.g. TEST-06 or TEST-07).
   */
  public recordLabeledSession(
    sessionId: string,
    featuresList: FeatureVector[],
    groundTruthDistanceMeters: number,
    baselineDistanceMeters: number
  ) {
    if (featuresList.length === 0 || baselineDistanceMeters <= 0.01) return;

    // Ground truth stride correction factor for this trial
    const targetFactor = Number(Math.max(0.70, Math.min(1.30, groundTruthDistanceMeters / baselineDistanceMeters)).toFixed(4));
    const avgGtStride = Number((groundTruthDistanceMeters / featuresList.length).toFixed(3));

    for (let i = 0; i < featuresList.length; i++) {
      const f = featuresList[i];
      this.datasetSamples.push({
        sessionId,
        timestamp: Date.now() - (featuresList.length - i) * 600,
        features: f,
        groundTruthStrideMeters: avgGtStride,
        targetCorrectionFactor: targetFactor,
      });
    }

    this.saveDatasetToStorage();
  }

  public getDatasetSampleCount(): number {
    return this.datasetSamples.length;
  }

  public getDatasetSessionCount(): number {
    return new Set(this.datasetSamples.map((s) => s.sessionId)).size;
  }

  public clearDataset() {
    this.datasetSamples = [];
    try {
      localStorage.removeItem(STORAGE_DATASET_KEY);
    } catch {}
  }

  /**
   * Trains the on-device MLP on real recorded sessions.
   */
  public async trainOnRecordedSessions(
    config: TrainingConfig = { epochs: 35, learningRate: 0.008, batchSize: 8, valSplitRatio: 0.25 },
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<NonNullable<MLPModelData['trainingMetrics']>> {
    if (this.datasetSamples.length < 10) {
      throw new Error(
        `INSUFFICIENT DATA FOR TRAINING. Found ${this.datasetSamples.length} steps across ${this.getDatasetSessionCount()} sessions. At least 10 labeled steps are required.`
      );
    }

    const { model, metrics } = NeuralRegressor.trainOnDataset(this.datasetSamples, config, onProgress);
    this.regressor.loadModelData(model);
    this.saveCustomModelToStorage(model);
    this.syncTelemetry();

    return metrics;
  }

  public loadPretrainedModel() {
    this.regressor.loadModelData(PRETRAINED_STRIDE_MODEL);
    try {
      localStorage.removeItem(STORAGE_MODEL_KEY);
    } catch {}
    this.syncTelemetry();
  }

  public loadCustomModel(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      const success = this.regressor.loadModelData(parsed);
      if (success) {
        this.saveCustomModelToStorage(parsed);
        this.syncTelemetry();
      }
      return success;
    } catch {
      return false;
    }
  }

  public exportModelJSON(): string {
    const data = this.regressor.getModelData();
    return JSON.stringify(data, null, 2);
  }

  public exportDatasetCSV(): string {
    const headers = [
      'session_id',
      'timestamp',
      'accel_mean',
      'accel_var',
      'accel_swing',
      'gyro_mean',
      'gyro_var',
      'cadence',
      'step_interval_s',
      'baseline_stride_m',
      'gt_stride_m',
      'target_correction_factor',
    ];

    const rows = this.datasetSamples.map((s) => [
      s.sessionId,
      s.timestamp,
      s.features.accelMagnitudeMean,
      s.features.accelMagnitudeVar,
      s.features.accelSwing,
      s.features.gyroMagnitudeMean,
      s.features.gyroMagnitudeVar,
      s.features.cadence,
      s.features.stepIntervalSec,
      s.features.baselineWeinbergStride,
      s.groundTruthStrideMeters,
      s.targetCorrectionFactor,
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  private saveCustomModelToStorage(model: MLPModelData) {
    try {
      localStorage.setItem(STORAGE_MODEL_KEY, JSON.stringify(model));
    } catch {}
  }

  private loadCustomModelFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_MODEL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.layers) {
          this.regressor.loadModelData(parsed);
        }
      }
    } catch {}
  }

  private saveDatasetToStorage() {
    try {
      localStorage.setItem(STORAGE_DATASET_KEY, JSON.stringify(this.datasetSamples.slice(-2000)));
    } catch {}
  }

  private loadDatasetFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_DATASET_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.datasetSamples = parsed;
        }
      }
    } catch {}
  }
}

export const aiModule = AIModule.getInstance();
