import type { StepEvent } from '../types';

export class StepDetector {
  private stepCount = 0;
  private lastStepTimestamp = 0;
  private cadence = 0; // steps per minute
  private totalDistanceMeters = 0;

  // Weinberg Stride Model parameter (calibrated for adult walking, ~0.42)
  private weinbergK = 0.42;

  // Signal processing buffers
  private filteredAccel = 0;
  private prevFilteredAccel = 0;
  private prevSlope = 0;

  // Window min/max tracking for Weinberg fourth-root swing
  private windowAccelMin = 999;
  private windowAccelMax = -999;

  // Timing thresholds
  private readonly minStepIntervalMs = 330; // Max 3.0 Hz walking cadence
  private readonly maxStepIntervalMs = 2500; // Reset cadence if idle > 2.5s
  private readonly minPeakValleySwing = 1.2; // Minimum m/s² dynamic swing to reject noise

  // Lowpass/Bandpass filter coefficients (~1.5Hz center frequency at 50Hz)
  // Simple discrete exponential smoothing for pedestrian band
  private readonly alphaFilter = 0.25;

  constructor(weinbergK = 0.42) {
    this.weinbergK = weinbergK;
  }

  public setWeinbergK(k: number) {
    this.weinbergK = Math.max(0.2, Math.min(0.8, k));
  }

  public getWeinbergK(): number {
    return this.weinbergK;
  }

  public getStepCount(): number {
    return this.stepCount;
  }

  public getCadence(): number {
    return this.cadence;
  }

  public getTotalDistance(): number {
    return this.totalDistanceMeters;
  }

  public reset() {
    this.stepCount = 0;
    this.lastStepTimestamp = 0;
    this.cadence = 0;
    this.totalDistanceMeters = 0;
    this.filteredAccel = 0;
    this.prevFilteredAccel = 0;
    this.prevSlope = 0;
    this.windowAccelMin = 999;
    this.windowAccelMax = -999;
  }

  /**
   * Processes a dynamic vertical acceleration sample (m/s²).
   * @param verticalAccel Dynamic acceleration along Earth Up-axis (+Z in ENU)
   * @param timestampMs Monotonic or high-res timestamp in milliseconds
   * @param headingDeg Current walking yaw heading in degrees [0, 360)
   * @returns StepEvent if a step was detected on this sample, otherwise null.
   */
  public processSample(verticalAccel: number, timestampMs: number, headingDeg: number): StepEvent | null {
    // 1. Apply digital low-pass filtering to isolate human walking cadence
    this.filteredAccel = this.filteredAccel + this.alphaFilter * (verticalAccel - this.filteredAccel);

    // Track min and max for Weinberg stride calculation
    if (this.filteredAccel < this.windowAccelMin) this.windowAccelMin = this.filteredAccel;
    if (this.filteredAccel > this.windowAccelMax) this.windowAccelMax = this.filteredAccel;

    // 2. Slope & Zero-Crossing / Peak Detection
    const currentSlope = this.filteredAccel - this.prevFilteredAccel;
    let stepDetected = false;

    // A peak occurs when slope transitions from positive to negative
    if (this.prevSlope > 0 && currentSlope <= 0) {
      // Check refractory period (minimum time between footsteps)
      const elapsedSinceLast = timestampMs - this.lastStepTimestamp;

      if (elapsedSinceLast >= this.minStepIntervalMs) {
        // Check dynamic acceleration swing threshold (reject small hand tremors)
        const accelSwing = this.windowAccelMax - this.windowAccelMin;

        if (accelSwing >= this.minPeakValleySwing && this.filteredAccel > 0.3) {
          stepDetected = true;
        }
      }
    }

    this.prevSlope = currentSlope;
    this.prevFilteredAccel = this.filteredAccel;

    if (!stepDetected) {
      // Check cadence timeout: if no step for 2.5s, cadence decays to 0
      if (timestampMs - this.lastStepTimestamp > this.maxStepIntervalMs) {
        this.cadence = 0;
      }
      return null;
    }

    // Step Confirmed!
    this.stepCount++;
    const stepDt = timestampMs - (this.lastStepTimestamp || (timestampMs - 600));
    this.lastStepTimestamp = timestampMs;

    // Update Cadence (steps per minute)
    if (stepDt > 0 && stepDt < this.maxStepIntervalMs) {
      const instantCadence = 60000 / stepDt;
      this.cadence = Math.round(this.cadence === 0 ? instantCadence : this.cadence * 0.7 + instantCadence * 0.3);
    } else {
      this.cadence = 100; // Default nominal walking cadence
    }

    // 3. Weinberg Stride Length Estimation:
    // L = k * (a_max - a_min)^(1/4)
    const accelSwing = Math.max(0.5, this.windowAccelMax - this.windowAccelMin);
    const rawStride = this.weinbergK * Math.pow(accelSwing, 0.25);
    // Clamp stride between realistic human bounds (0.4m to 1.1m)
    const strideLength = Number(Math.max(0.4, Math.min(1.1, rawStride)).toFixed(3));

    // Reset window min/max for next step
    this.windowAccelMin = this.filteredAccel;
    this.windowAccelMax = this.filteredAccel;

    this.totalDistanceMeters += strideLength;

    // 4. Calculate discrete local metric displacement:
    // In local ENU: Heading θ is clockwise from North:
    // ΔEast = L * sin(θ)
    // ΔNorth = L * cos(θ)
    const headingRad = headingDeg * (Math.PI / 180);
    const dE = Number((strideLength * Math.sin(headingRad)).toFixed(4));
    const dN = Number((strideLength * Math.cos(headingRad)).toFixed(4));

    return {
      timestamp: timestampMs,
      stepNumber: this.stepCount,
      strideLength,
      cadence: this.cadence,
      headingDeg,
      displacement: { dE, dN },
    };
  }
}
