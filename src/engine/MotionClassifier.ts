import type { MotionState, Vector3D } from '../types';
import { calcStats } from './MathUtils.ts';

export class MotionClassifier {
  private accelNormWindow: number[] = [];
  private gyroNormWindow: number[] = [];
  private readonly windowSize = 25; // ~0.5 seconds at 50Hz

  private currentState: MotionState = 'UNKNOWN';
  private stationaryConfirmCount = 0;
  private walkingConfirmCount = 0;
  private readonly debounceFrames = 8; // Debounce threshold

  // Variance thresholds (calibrated for smartphone IMUs)
  private readonly stationaryAccelVarThreshold = 0.08; // m²/s⁴
  private readonly stationaryGyroVarThreshold = 0.04; // rad²/s²
  private readonly walkingAccelVarThreshold = 0.35; // m²/s⁴

  public update(accel: Vector3D, gyro: Vector3D): { state: MotionState; variance: number } {
    const aNorm = Math.sqrt(accel.x * accel.x + accel.y * accel.y + accel.z * accel.z);
    const gNorm = Math.sqrt(gyro.x * gyro.x + gyro.y * gyro.y + gyro.z * gyro.z);

    this.accelNormWindow.push(aNorm);
    this.gyroNormWindow.push(gNorm);

    if (this.accelNormWindow.length > this.windowSize) {
      this.accelNormWindow.shift();
      this.gyroNormWindow.shift();
    }

    if (this.accelNormWindow.length < 10) {
      return { state: this.currentState, variance: 0 };
    }

    const accelStats = calcStats(this.accelNormWindow);
    const gyroStats = calcStats(this.gyroNormWindow);

    let candidateState: MotionState = 'UNKNOWN';

    if (
      accelStats.variance < this.stationaryAccelVarThreshold &&
      gyroStats.variance < this.stationaryGyroVarThreshold
    ) {
      candidateState = 'STATIONARY';
    } else if (accelStats.variance > this.walkingAccelVarThreshold) {
      candidateState = 'WALKING';
    } else {
      candidateState = 'UNKNOWN';
    }

    // Hysteresis Debouncing
    if (candidateState === 'STATIONARY') {
      this.stationaryConfirmCount++;
      this.walkingConfirmCount = 0;
      if (this.stationaryConfirmCount >= this.debounceFrames) {
        this.currentState = 'STATIONARY';
      }
    } else if (candidateState === 'WALKING') {
      this.walkingConfirmCount++;
      this.stationaryConfirmCount = 0;
      if (this.walkingConfirmCount >= this.debounceFrames) {
        this.currentState = 'WALKING';
      }
    } else {
      this.stationaryConfirmCount = Math.max(0, this.stationaryConfirmCount - 1);
      this.walkingConfirmCount = Math.max(0, this.walkingConfirmCount - 1);
    }

    return {
      state: this.currentState,
      variance: Number(accelStats.variance.toFixed(4)),
    };
  }

  public getState(): MotionState {
    return this.currentState;
  }

  public reset() {
    this.accelNormWindow = [];
    this.gyroNormWindow = [];
    this.currentState = 'UNKNOWN';
    this.stationaryConfirmCount = 0;
    this.walkingConfirmCount = 0;
  }
}
