/**
 * FeatureExtractor.ts
 * Extracts physically meaningful, normalized gait and motion features
 * from 50Hz IMU buffers for on-device ML stride error prediction.
 */

import type { Vector3D } from '../../types/index.ts';
import type { FeatureVector } from './MLPTypes.ts';
import { calcStats } from '../MathUtils.ts';

export interface IMUBufferSample {
  accel: Vector3D;
  gyro: Vector3D;
  timestamp: number;
}

export class FeatureExtractor {
  private buffer: IMUBufferSample[] = [];
  private readonly maxBufferSize = 150; // ~3 seconds at 50Hz
  private lastStepTimestamp = 0;

  constructor() {}

  public feedSample(accel: Vector3D, gyro: Vector3D, timestamp: number) {
    this.buffer.push({
      accel: { ...accel },
      gyro: { ...gyro },
      timestamp,
    });

    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  public reset() {
    this.buffer = [];
    this.lastStepTimestamp = 0;
  }

  /**
   * Extracts an 8-dimensional FeatureVector for a detected footstep.
   */
  public extractFeatures(
    stepTimestamp: number,
    cadence: number,
    baselineStride: number,
    accelSwing: number
  ): FeatureVector {
    const stepIntervalSec = this.lastStepTimestamp > 0
      ? Math.max(0.25, Math.min(2.0, (stepTimestamp - this.lastStepTimestamp) / 1000.0))
      : 0.60; // Nominal 600ms default
    this.lastStepTimestamp = stepTimestamp;

    // Filter buffer for samples within this step window (last ~0.6s)
    const windowCutoff = stepTimestamp - Math.round(stepIntervalSec * 1000);
    const stepSamples = this.buffer.filter((s) => s.timestamp >= windowCutoff);
    const samplesToProcess = stepSamples.length >= 8 ? stepSamples : this.buffer.slice(-25);

    // Compute norms
    const aNorms: number[] = [];
    const gNorms: number[] = [];

    for (let i = 0; i < samplesToProcess.length; i++) {
      const a = samplesToProcess[i].accel;
      const g = samplesToProcess[i].gyro;
      aNorms.push(Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z));
      gNorms.push(Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z));
    }

    const aStats = calcStats(aNorms);
    const gStats = calcStats(gNorms);

    // Clean and clamp features to physically realistic human limits
    const safeAccelMean = Number.isFinite(aStats.mean) ? Math.max(1.0, Math.min(25.0, aStats.mean)) : 9.81;
    const safeAccelVar = Number.isFinite(aStats.variance) ? Math.max(0.01, Math.min(30.0, aStats.variance)) : 1.5;
    const safeSwing = Number.isFinite(accelSwing) ? Math.max(0.5, Math.min(20.0, accelSwing)) : 2.5;
    const safeGyroMean = Number.isFinite(gStats.mean) ? Math.max(0.0, Math.min(10.0, gStats.mean)) : 0.5;
    const safeGyroVar = Number.isFinite(gStats.variance) ? Math.max(0.001, Math.min(15.0, gStats.variance)) : 0.2;
    const safeCadence = Number.isFinite(cadence) ? Math.max(30, Math.min(220, cadence)) : 100;
    const safeBaselineStride = Number.isFinite(baselineStride) ? Math.max(0.40, Math.min(1.10, baselineStride)) : 0.70;

    return {
      accelMagnitudeMean: Number(safeAccelMean.toFixed(3)),
      accelMagnitudeVar: Number(safeAccelVar.toFixed(3)),
      accelSwing: Number(safeSwing.toFixed(3)),
      gyroMagnitudeMean: Number(safeGyroMean.toFixed(3)),
      gyroMagnitudeVar: Number(safeGyroVar.toFixed(3)),
      cadence: Math.round(safeCadence),
      stepIntervalSec: Number(stepIntervalSec.toFixed(3)),
      baselineWeinbergStride: Number(safeBaselineStride.toFixed(3)),
    };
  }

  /**
   * Converts a FeatureVector into an array of 8 numbers matching FEATURE_NAMES ordering.
   */
  public static toArray(features: FeatureVector): number[] {
    return [
      features.accelMagnitudeMean,
      features.accelMagnitudeVar,
      features.accelSwing,
      features.gyroMagnitudeMean,
      features.gyroMagnitudeVar,
      features.cadence,
      features.stepIntervalSec,
      features.baselineWeinbergStride,
    ];
  }

  public static vectorToArray(features: FeatureVector): number[] {
    return FeatureExtractor.toArray(features);
  }
}
