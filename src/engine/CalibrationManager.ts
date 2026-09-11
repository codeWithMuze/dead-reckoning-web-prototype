import type { CalibrationData, Vector3D } from '../types';
import { calcStats } from './MathUtils.ts';
import { useNavStore } from '../store/useNavStore.ts';

const STORAGE_KEY = 'navisense_calibration_v1';

export class CalibrationManager {
  private static instance: CalibrationManager;

  private isCalibrating = false;
  private samplesCollected: { accel: Vector3D; gyro: Vector3D }[] = [];
  private targetSamples = 120; // ~2.4 seconds at 50Hz
  private onProgressCallback: ((progress: number) => void) | null = null;
  private onCompleteCallback: ((data: CalibrationData) => void) | null = null;

  private currentCalibration: CalibrationData = {
    accelBias: { x: 0, y: 0, z: 0 },
    gyroBias: { x: 0, y: 0, z: 0 },
    accelNoiseStd: 0.05,
    gyroNoiseStd: 0.02,
    calibrated: false,
    samples: 0,
  };

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): CalibrationManager {
    if (!CalibrationManager.instance) {
      CalibrationManager.instance = new CalibrationManager();
    }
    return CalibrationManager.instance;
  }

  public getCalibration(): CalibrationData {
    return this.currentCalibration;
  }

  public isBusy(): boolean {
    return this.isCalibrating;
  }

  public startCalibration(
    onProgress?: (progress: number) => void,
    onComplete?: (data: CalibrationData) => void
  ) {
    this.isCalibrating = true;
    this.samplesCollected = [];
    this.onProgressCallback = onProgress || null;
    this.onCompleteCallback = onComplete || null;
  }

  public cancelCalibration() {
    this.isCalibrating = false;
    this.samplesCollected = [];
  }

  public feedSample(rawAccel: Vector3D, rawGyro: Vector3D): boolean {
    if (!this.isCalibrating) return false;

    this.samplesCollected.push({ accel: { ...rawAccel }, gyro: { ...rawGyro } });
    const progress = Math.min(100, Math.round((this.samplesCollected.length / this.targetSamples) * 100));

    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }

    if (this.samplesCollected.length >= this.targetSamples) {
      this.finishCalibration();
      return true;
    }

    return false;
  }

  private finishCalibration() {
    this.isCalibrating = false;

    const axList = this.samplesCollected.map((s) => s.accel.x);
    const ayList = this.samplesCollected.map((s) => s.accel.y);
    const azList = this.samplesCollected.map((s) => s.accel.z);

    const gxList = this.samplesCollected.map((s) => s.gyro.x);
    const gyList = this.samplesCollected.map((s) => s.gyro.y);
    const gzList = this.samplesCollected.map((s) => s.gyro.z);

    const statAx = calcStats(axList);
    const statAy = calcStats(ayList);
    const statAz = calcStats(azList);

    const statGx = calcStats(gxList);
    const statGy = calcStats(gyList);
    const statGz = calcStats(gzList);

    // If device measures including gravity (~9.8m/s² on Z when flat), subtract 9.80665 from Z bias
    let biasZ = statAz.mean;
    if (Math.abs(statAz.mean) > 5.0) {
      // Resting on flat surface
      biasZ = statAz.mean > 0 ? statAz.mean - 9.80665 : statAz.mean + 9.80665;
    }

    const accelNoiseStd = Math.max(0.01, (statAx.std + statAy.std + statAz.std) / 3);
    const gyroNoiseStd = Math.max(0.005, (statGx.std + statGy.std + statGz.std) / 3);

    this.currentCalibration = {
      accelBias: {
        x: Number(statAx.mean.toFixed(4)),
        y: Number(statAy.mean.toFixed(4)),
        z: Number(biasZ.toFixed(4)),
      },
      gyroBias: {
        x: Number(statGx.mean.toFixed(4)),
        y: Number(statGy.mean.toFixed(4)),
        z: Number(statGz.mean.toFixed(4)),
      },
      accelNoiseStd: Number(accelNoiseStd.toFixed(4)),
      gyroNoiseStd: Number(gyroNoiseStd.toFixed(4)),
      calibrated: true,
      samples: this.samplesCollected.length,
      calibratedAt: Date.now(),
    };

    this.saveToStorage();

    try {
      useNavStore.getState().updateCalibration(this.currentCalibration);
    } catch {
      // store may not be initialized yet
    }

    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.currentCalibration);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentCalibration));
    } catch {
      // Storage unavailable or disabled
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.calibrated) {
          this.currentCalibration = parsed;
          try {
            useNavStore.getState().updateCalibration(this.currentCalibration);
          } catch {}
        }
      }
    } catch {
      // Fallback to default uncalibrated state
    }
  }

  public resetCalibration() {
    this.currentCalibration = {
      accelBias: { x: 0, y: 0, z: 0 },
      gyroBias: { x: 0, y: 0, z: 0 },
      accelNoiseStd: 0.05,
      gyroNoiseStd: 0.02,
      calibrated: false,
      samples: 0,
    };
    try {
      useNavStore.getState().updateCalibration(this.currentCalibration);
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const calibrationManager = CalibrationManager.getInstance();
