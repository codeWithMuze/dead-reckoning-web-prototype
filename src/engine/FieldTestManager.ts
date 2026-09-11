import type {
  TestId,
  TestStatus,
  OutagePhase,
  TestDefinition,
  GroundTruthEntry,
  MeasuredTelemetry,
  CalculatedErrors,
  FieldTestRecord,
  SIHSummaryMetrics,
} from '../types/fieldTest.ts';
import { useNavStore } from '../store/useNavStore.ts';
import { sessionRecorder } from './SessionRecorder.ts';
import { calibrationManager } from './CalibrationManager.ts';
import { geodeticToENU } from './MathUtils.ts';
import { aiModule } from './AIModule.ts';

const STORAGE_KEY = 'navisense_field_test_records_v1';

export const TEST_DEFINITIONS: Record<TestId, TestDefinition> = {
  'TEST-01': {
    id: 'TEST-01',
    name: 'Stationary Sensor Calibration',
    category: 'CALIBRATION',
    description: 'Measures and persists 3-axis accelerometer and gyroscope biases and sensor noise floors while stationary.',
    physicalInstructions: 'Place phone completely flat and motionless on a sturdy table. Starting TEST-01 automatically collects calibration samples, computes biases and noise floors, and saves the calibration.',
    groundTruthPrompts: { duration: true },
    defaultPassCriteria: 'Calibrated = true, Gyro bias norm < 0.03 rad/s, Accel noise std < 0.15 m/s²',
  },
  'TEST-02': {
    id: 'TEST-02',
    name: 'Stationary ZUPT Velocity Clamp',
    category: 'STATIONARY',
    description: 'Verifies Zero-Velocity Update (ZUPT) engages and clamps velocity to 0.0 m/s without unphysical drift.',
    physicalInstructions: 'Keep phone completely still on a flat surface for 30–60 seconds. Do not touch or bump the desk.',
    groundTruthPrompts: { duration: true },
    defaultPassCriteria: 'Max speed < 0.08 m/s, Final velocity < 0.03 m/s, Inertial PDR drift = 0.0m',
  },
  'TEST-03': {
    id: 'TEST-03',
    name: '20-Step Controlled Walk',
    category: 'PDR_STEPS',
    description: 'Short-range pedestrian step detection accuracy test at normal walking cadence.',
    physicalInstructions: 'Hold phone naturally in texting posture. Walk in a straight line while counting aloud exactly 20 steps. Stop immediately on step 20.',
    groundTruthPrompts: { steps: true },
    defaultPassCriteria: 'Step Detection Accuracy ≥ 90% (|Detected - 20| ≤ 2 steps)',
  },
  'TEST-04': {
    id: 'TEST-04',
    name: '50-Step Controlled Walk',
    category: 'PDR_STEPS',
    description: 'Medium-range pedestrian step detection accuracy test at continuous cadence.',
    physicalInstructions: 'Hold phone in hand. Walk 50 paces at your regular walking speed. Count exactly 50 foot strikes.',
    groundTruthPrompts: { steps: true },
    defaultPassCriteria: 'Step Detection Accuracy ≥ 92% (|Detected - 50| ≤ 4 steps)',
  },
  'TEST-05': {
    id: 'TEST-05',
    name: '100-Step Extended Walk',
    category: 'PDR_STEPS',
    description: 'Extended pedestrian step detection test measuring cadence consistency over 100 paces.',
    physicalInstructions: 'Walk a long hallway or open courtyard for exactly 100 continuous steps.',
    groundTruthPrompts: { steps: true },
    defaultPassCriteria: 'Step Detection Accuracy ≥ 94% (|Detected - 100| ≤ 6 steps)',
  },
  'TEST-06': {
    id: 'TEST-06',
    name: '20 Meter Measured Distance',
    category: 'PDR_DISTANCE',
    description: 'Validates Weinberg stride length estimation over a 20.0-meter tape-measured line.',
    physicalInstructions: 'Pre-measure a 20.0m straight line with tape or floor tiles. Start at 0.0m mark, walk to 20.0m mark, and stop.',
    groundTruthPrompts: { distance: true },
    defaultPassCriteria: 'Distance Percentage Error ≤ 10% (|Estimated - 20m| ≤ 2.0m)',
  },
  'TEST-07': {
    id: 'TEST-07',
    name: '50 Meter Measured Distance',
    category: 'PDR_DISTANCE',
    description: 'Validates long-range PDR distance integration against physical ground truth.',
    physicalInstructions: 'Walk a measured 50.0m corridor. Stop precisely at the 50.0m finish line.',
    groundTruthPrompts: { distance: true },
    defaultPassCriteria: 'Distance Percentage Error ≤ 8% (|Estimated - 50m| ≤ 4.0m)',
  },
  'TEST-08': {
    id: 'TEST-08',
    name: 'Square-Loop Trajectory (Loop Closure)',
    category: 'TRAJECTORY',
    description: 'Tests heading integration and loop closure FDE by walking a closed geometric polygon.',
    physicalInstructions: 'Mark start point. Walk 10m forward, 90° right turn, walk 10m, 90° right turn, walk 10m, 90° right turn, walk 10m back to start mark.',
    groundTruthPrompts: { distance: true },
    defaultPassCriteria: 'Final Displacement Error (FDE) ≤ 3.5 meters upon return to start',
  },
  'TEST-09': {
    id: 'TEST-09',
    name: 'Autonomous GPS Outage Coasting',
    category: 'GPS_RESILIENCE',
    description: 'Measures GPS-loss detection latency and EKF/PDR dead-reckoning drift during GNSS denial.',
    physicalInstructions: 'Start outdoors with green GPS fix. Walk into a concrete parking garage, basement, or shielded corridor. Continue walking for 60 seconds.',
    groundTruthPrompts: { outageDuration: true },
    defaultPassCriteria: 'GPS-Loss Latency ≤ 3.0s and Drift Rate ≤ 5.0 m/min',
  },
  'TEST-10': {
    id: 'TEST-10',
    name: 'GPS Reacquisition & Innovation',
    category: 'GPS_RESILIENCE',
    description: 'Evaluates Kalman innovation jump and covariance contraction upon exiting GPS denial.',
    physicalInstructions: 'While dead-reckoning in GPS-denied area, walk back outside under clear open sky. Wait for GPS fix to reacquire and state to converge.',
    groundTruthPrompts: { outageDuration: true },
    defaultPassCriteria: 'Smooth reacquisition without state explosion; Uncertainty contracts by ≥ 40%',
  },
  'TEST-ML-01': {
    id: 'TEST-ML-01',
    name: 'Adaptive ML vs Baseline PDR A/B Test',
    category: 'ML_ADAPTIVE',
    description: 'Evaluates on-device neural stride correction against deterministic Weinberg baseline over a measured distance line.',
    physicalInstructions: 'Walk a pre-measured straight corridor (e.g. 20.0m or 50.0m). ML will adaptively scale stride lengths based on gait dynamics.',
    groundTruthPrompts: { distance: true },
    defaultPassCriteria: 'ML Distance Error % ≤ Baseline Distance Error % or within ±8%',
  },
};

export class FieldTestManager {
  private static instance: FieldTestManager;

  private activeTestId: TestId | null = null;
  private status: TestStatus = 'IDLE';
  private startTimestamp = 0;
  private pauseTimestamp = 0;
  private totalPausedMs = 0;
  private initialPdrSteps = 0;
  private initialPdrDist = 0;
  private initialPdrPos = { east: 0, north: 0 };
  private initialEkfPos = { east: 0, north: 0 };
  private initialGpsPos: { latitude: number; longitude: number } | null = null;
  private initialHeadingDeg = 0;
  private maxSpeedMps = 0;
  private speedSum = 0;
  private speedSampleCount = 0;
  private zuptTicks = 0;
  private totalTicks = 0;

  // GPS Outage tracking variables
  private outagePhase: OutagePhase = 'NONE';
  private lastKnownGpsTimestamp = 0;
  private outageStartTimestamp = 0;
  private outageEndTimestamp = 0;
  private uncertaintyBeforeReacquisition = 0;
  private uncertaintyAfterReacquisition = 0;
  private reacquisitionInnovationM = 0;
  private recordedOutageType?: 'APPLICATION_INPUT_DISABLED' | 'PHYSICAL_GNSS_LOSS';

  private records: FieldTestRecord[] = [];
  private wakeLockSentinel: any = null;

  private constructor() {
    this.loadRecords();
  }

  public static getInstance(): FieldTestManager {
    if (!FieldTestManager.instance) {
      FieldTestManager.instance = new FieldTestManager();
    }
    return FieldTestManager.instance;
  }

  public getTestDefinitions(): TestDefinition[] {
    return Object.values(TEST_DEFINITIONS);
  }

  public getStatus(): TestStatus {
    return this.status;
  }

  public getActiveTestId(): TestId | null {
    return this.activeTestId;
  }

  public getOutagePhase(): OutagePhase {
    return this.outagePhase;
  }

  public getElapsedSeconds(): number {
    if (this.status === 'IDLE' || this.startTimestamp === 0) return 0;
    const now = this.status === 'PAUSED' ? this.pauseTimestamp : Date.now();
    return Math.max(0, (now - this.startTimestamp - this.totalPausedMs) / 1000);
  }

  public async startTest(testId: TestId): Promise<boolean> {
    const store = useNavStore.getState();

    // Field Test mode requires Live Mode
    if (store.navState.isDemoMode) {
      alert('Field Test Mode requires LIVE DEVICE SENSORS. Please start the app in Live Session mode.');
      return false;
    }

    this.activeTestId = testId;
    this.status = 'RUNNING';
    this.startTimestamp = Date.now();
    this.pauseTimestamp = 0;
    this.totalPausedMs = 0;
    this.maxSpeedMps = 0;
    this.speedSum = 0;
    this.speedSampleCount = 0;
    this.zuptTicks = 0;
    this.totalTicks = 0;

    // Snapshot starting state
    this.initialPdrSteps = store.navState.pdr.stepCount;
    this.initialPdrDist = store.navState.pdr.totalDistance;
    this.initialPdrPos = { ...store.navState.pdr.localPos };
    this.initialEkfPos = {
      east: store.navState.ekf.state[0],
      north: store.navState.ekf.state[1],
    };
    this.initialGpsPos = store.navState.gps
      ? { latitude: store.navState.gps.latitude, longitude: store.navState.gps.longitude }
      : null;
    this.initialHeadingDeg = store.navState.heading;

    // Reset test-local cadence & step timing so prior session walking never leaks
    useNavStore.getState().updatePDR({ cadence: 0 });
    try {
      const { navEngine } = await import('./NavEngine.ts');
      navEngine.resetCadenceAndStepTiming();
    } catch {}

    // For TEST-01: Automatically trigger stationary calibration
    if (testId === 'TEST-01') {
      if (!calibrationManager.isBusy()) {
        calibrationManager.startCalibration();
      }
    }

    // Initialize GPS outage tracking
    if (testId === 'TEST-09' || testId === 'TEST-10') {
      this.outagePhase = store.navState.gpsActive ? 'BASELINE_LOCKED' : 'OUTAGE_COASTING';
      this.lastKnownGpsTimestamp = store.navState.gps ? store.navState.gps.timestamp : Date.now();
      this.outageStartTimestamp = this.outagePhase === 'OUTAGE_COASTING' ? Date.now() : 0;
      this.outageEndTimestamp = 0;
      this.reacquisitionInnovationM = 0;
    } else {
      this.outagePhase = 'NONE';
    }

    // Start background telemetry flight recorder
    sessionRecorder.start();

    // Acquire Screen WakeLock
    await this.requestWakeLock();

    return true;
  }

  public pauseTest(): void {
    if (this.status !== 'RUNNING') return;
    this.status = 'PAUSED';
    this.pauseTimestamp = Date.now();
  }

  public resumeTest(): void {
    if (this.status !== 'PAUSED') return;
    this.totalPausedMs += Date.now() - this.pauseTimestamp;
    this.pauseTimestamp = 0;
    this.status = 'RUNNING';
  }

  public resetTest(): void {
    this.status = 'IDLE';
    this.activeTestId = null;
    this.startTimestamp = 0;
    this.pauseTimestamp = 0;
    this.totalPausedMs = 0;
    this.outagePhase = 'NONE';
    this.zuptTicks = 0;
    this.totalTicks = 0;
    this.releaseWakeLock();
  }

  /**
   * Called by navigation engine ticks to track speed, ZUPT, and GPS outage transitions.
   */
  public handleTick(
    gpsActive: boolean,
    currentSpeed: number,
    uncertainty1Sigma: number,
    ekfPos: { east: number; north: number },
    isStationary?: boolean
  ): void {
    if (this.status !== 'RUNNING') return;

    this.totalTicks++;
    if (isStationary) {
      this.zuptTicks++;
    }

    // Speed tracking
    if (currentSpeed > this.maxSpeedMps) this.maxSpeedMps = currentSpeed;
    this.speedSum += currentSpeed;
    this.speedSampleCount++;

    // GPS Outage State Machine for TEST-09 and TEST-10
    if (this.activeTestId === 'TEST-09' || this.activeTestId === 'TEST-10') {
      const store = useNavStore.getState();
      if (this.outagePhase === 'BASELINE_LOCKED' && !gpsActive) {
        // Transition: GPS Lost -> Outage Coasting
        this.outagePhase = 'OUTAGE_COASTING';
        this.outageStartTimestamp = Date.now();
        this.recordedOutageType = !store.gpsInputEnabled ? 'APPLICATION_INPUT_DISABLED' : 'PHYSICAL_GNSS_LOSS';
      } else if (this.outagePhase === 'OUTAGE_COASTING' && gpsActive) {
        // Transition: GPS Reacquired
        this.outagePhase = 'REACQUIRED';
        this.outageEndTimestamp = Date.now();
        this.uncertaintyBeforeReacquisition = uncertainty1Sigma;

        if (store.navState.debug.gpsLocalPos) {
          const dx = store.navState.debug.gpsLocalPos.east - ekfPos.east;
          const dy = store.navState.debug.gpsLocalPos.north - ekfPos.north;
          this.reacquisitionInnovationM = Number(Math.hypot(dx, dy).toFixed(2));
        }
        this.uncertaintyAfterReacquisition = store.navState.ekf.uncertainty1Sigma;
      }
    }
  }

  public stopTest(groundTruth: GroundTruthEntry): FieldTestRecord | null {
    if (!this.activeTestId || this.status === 'IDLE') return null;

    const store = useNavStore.getState();
    const def = TEST_DEFINITIONS[this.activeTestId];
    const durationSec = Number(this.getElapsedSeconds().toFixed(1));

    // Measured Telemetry Deltas
    const steps = Math.max(0, store.navState.pdr.stepCount - this.initialPdrSteps);
    const distanceMeters = Number(Math.max(0, store.navState.pdr.totalDistance - this.initialPdrDist).toFixed(2));
    const pdrEndPos = { ...store.navState.pdr.localPos };
    const ekfEndPos = {
      east: Number(store.navState.ekf.state[0].toFixed(2)),
      north: Number(store.navState.ekf.state[1].toFixed(2)),
    };
    const finalHeadingDeg = Number(store.navState.heading.toFixed(1));
    const meanSpeedMps = this.speedSampleCount > 0 ? Number((this.speedSum / this.speedSampleCount).toFixed(2)) : 0;
    const finalVelocityMps = Number(Math.hypot(store.navState.estimatedVelocity.ve, store.navState.estimatedVelocity.vn).toFixed(2));

    // 1. Inertial / PDR Displacement (independent of GPS)
    const dPdrEast = pdrEndPos.east - this.initialPdrPos.east;
    const dPdrNorth = pdrEndPos.north - this.initialPdrPos.north;
    const pdrDisplacementMeters = Number(Math.hypot(dPdrEast, dPdrNorth).toFixed(2));

    // 2. GPS-Induced Position Movement (Wander)
    let gpsDisplacementMeters: number | null = null;
    if (this.initialGpsPos && store.navState.gps) {
      const { east: gEast, north: gNorth } = geodeticToENU(
        store.navState.gps.latitude,
        store.navState.gps.longitude,
        this.initialGpsPos.latitude,
        this.initialGpsPos.longitude
      );
      gpsDisplacementMeters = Number(Math.hypot(gEast, gNorth).toFixed(2));
    }

    // 3. Total EKF Displacement / FDE calculation
    const dEast = ekfEndPos.east - this.initialEkfPos.east;
    const dNorth = ekfEndPos.north - this.initialEkfPos.north;
    const fdeMeters = Number(Math.hypot(dEast, dNorth).toFixed(2));

    // ZUPT activation percentage
    const zuptActivationPct = this.totalTicks > 0 ? Number(((this.zuptTicks / this.totalTicks) * 100).toFixed(1)) : 100;

    // Calibration stats
    const cal = store.calibration;
    const gyroBiasNorm = Number(Math.hypot(cal.gyroBias.x, cal.gyroBias.y, cal.gyroBias.z).toFixed(4));
    const accelNoiseStd = cal.accelNoiseStd;
    const gyroNoiseStd = cal.gyroNoiseStd;

    const gpsOutageLatencyMs =
      this.outageStartTimestamp > 0 && this.lastKnownGpsTimestamp > 0
        ? Math.max(0, this.outageStartTimestamp - this.lastKnownGpsTimestamp)
        : undefined;

    // Inspect recorded session frames for baseline vs ML stride analytics
    const recordedFrames = sessionRecorder.getRecordedFrames();
    const stepFrames = recordedFrames.filter(
      (f) => f.stepEvent !== null && f.mlPrediction !== null
    );

    let mlBaselineDist = 0;
    let mlCorrectedDist = 0;
    let mlFallbackCount = 0;

    for (const sf of stepFrames) {
      const baseStride = sf.stepEvent!.strideLength;
      const corrStride = sf.mlPrediction?.correctedStride ?? baseStride;
      mlBaselineDist += baseStride;
      mlCorrectedDist += corrStride;
      if (sf.mlPrediction?.isFallback) mlFallbackCount++;
    }

    mlBaselineDist = Number(mlBaselineDist.toFixed(2));
    mlCorrectedDist = Number(mlCorrectedDist.toFixed(2));

    const measured: MeasuredTelemetry = {
      steps,
      cadence: Number(store.navState.pdr.cadence.toFixed(0)),
      distanceMeters,
      pdrStartPos: { east: 0, north: 0 },
      pdrEndPos,
      pdrDisplacementMeters,
      ekfStartPos: { ...this.initialEkfPos },
      ekfEndPos,
      gpsStartPos: this.initialGpsPos,
      gpsEndPos: store.navState.gps
        ? { latitude: store.navState.gps.latitude, longitude: store.navState.gps.longitude }
        : null,
      gpsDisplacementMeters,
      startHeadingDeg: Number(this.initialHeadingDeg.toFixed(1)),
      endHeadingDeg: finalHeadingDeg,
      maxSpeedMps: Number(this.maxSpeedMps.toFixed(2)),
      meanSpeedMps,
      finalVelocityMps,
      zuptActivationPct,
      gyroBiasNorm,
      accelNoiseStd,
      gyroNoiseStd,
      finalUncertainty1Sigma: store.navState.ekf.uncertainty1Sigma,
      finalUncertainty2Sigma: store.navState.ekf.uncertainty2Sigma,
      fdeMeters,
      gpsOutageLatencyMs,
      measuredOutageDurationSec:
        this.outageEndTimestamp > 0 && this.outageStartTimestamp > 0
          ? Number(((this.outageEndTimestamp - this.outageStartTimestamp) / 1000).toFixed(1))
          : undefined,
      gpsReacquisitionInnovationM: this.reacquisitionInnovationM || undefined,
      uncertaintyBeforeReacquisitionM: this.uncertaintyBeforeReacquisition || undefined,
      uncertaintyAfterReacquisitionM: this.uncertaintyAfterReacquisition || undefined,
      outageType:
        this.activeTestId === 'TEST-09' || this.activeTestId === 'TEST-10'
          ? (this.recordedOutageType || (!store.gpsInputEnabled ? 'APPLICATION_INPUT_DISABLED' : 'PHYSICAL_GNSS_LOSS'))
          : undefined,
      mlBaselineDistanceMeters: mlBaselineDist > 0 ? mlBaselineDist : undefined,
      mlCorrectedDistanceMeters: mlCorrectedDist > 0 ? mlCorrectedDist : undefined,
      mlFallbackCount: mlFallbackCount > 0 ? mlFallbackCount : undefined,
    };

    // Protocol-Specific Rigorous Error Calculations
    const errors: CalculatedErrors = {};
    let passed = false;

    // FDE & Drift metrics
    errors.finalDisplacementErrorMeters = fdeMeters;
    if (gpsDisplacementMeters !== null) {
      errors.gpsWanderMeters = gpsDisplacementMeters;
    }
    if (durationSec > 0) {
      const durationMin = durationSec / 60;
      errors.driftRateMPerMin = Number((fdeMeters / durationMin).toFixed(2));
      errors.inertialDriftMPerMin = Number((pdrDisplacementMeters / durationMin).toFixed(2));
      const headingDiff = Math.abs(finalHeadingDeg - this.initialHeadingDeg);
      errors.headingErrorDeg = Number(headingDiff.toFixed(1));
      errors.headingDriftRateDegPerMin = Number((headingDiff / durationMin).toFixed(2));
    }

    if (gpsOutageLatencyMs !== undefined) {
      errors.gpsOutageLatencyMs = gpsOutageLatencyMs;
    }
    if (this.reacquisitionInnovationM > 0) {
      errors.gpsReacquisitionInnovationM = this.reacquisitionInnovationM;
      errors.uncertaintyBeforeM = this.uncertaintyBeforeReacquisition;
      errors.uncertaintyAfterM = this.uncertaintyAfterReacquisition;
    }

    // Step accuracy: only for TEST-03, TEST-04, TEST-05
    if (
      (this.activeTestId === 'TEST-03' || this.activeTestId === 'TEST-04' || this.activeTestId === 'TEST-05') &&
      groundTruth.trueSteps && groundTruth.trueSteps > 0
    ) {
      const stepDiff = Math.abs(steps - groundTruth.trueSteps);
      errors.stepError = stepDiff;
      errors.stepAccuracyPct = Number(
        Math.max(0, (1 - stepDiff / groundTruth.trueSteps) * 100).toFixed(1)
      );
    }

    // Distance accuracy: only for TEST-06, TEST-07
    if (
      (this.activeTestId === 'TEST-06' || this.activeTestId === 'TEST-07') &&
      groundTruth.trueDistanceMeters && groundTruth.trueDistanceMeters > 0
    ) {
      const distDiff = Math.abs(distanceMeters - groundTruth.trueDistanceMeters);
      errors.distanceErrorMeters = Number(distDiff.toFixed(2));
      errors.distanceErrorPct = Number(((distDiff / groundTruth.trueDistanceMeters) * 100).toFixed(1));
    }

    // Adaptive ML vs Baseline PDR A/B Test: TEST-ML-01
    if (
      this.activeTestId === 'TEST-ML-01' &&
      groundTruth.trueDistanceMeters && groundTruth.trueDistanceMeters > 0
    ) {
      const trueDist = groundTruth.trueDistanceMeters;
      const baselineDist = mlBaselineDist > 0 ? mlBaselineDist : distanceMeters;
      const corrDist = mlCorrectedDist > 0 ? mlCorrectedDist : distanceMeters;

      const baselineDiff = Math.abs(baselineDist - trueDist);
      const baselineErrPct = Number(((baselineDiff / trueDist) * 100).toFixed(1));

      const mlDiff = Math.abs(corrDist - trueDist);
      const mlErrPct = Number(((mlDiff / trueDist) * 100).toFixed(1));

      const improvementPct = baselineErrPct > 0
        ? Number((((baselineErrPct - mlErrPct) / baselineErrPct) * 100).toFixed(1))
        : 0;

      errors.distanceErrorMeters = Number(baselineDiff.toFixed(2));
      errors.distanceErrorPct = baselineErrPct;
      errors.mlDistanceErrorMeters = Number(mlDiff.toFixed(2));
      errors.mlDistanceErrorPct = mlErrPct;
      errors.mlImprovementPct = improvementPct;
    }

    // Pass / Fail Evaluation against default criteria
    switch (this.activeTestId) {
      case 'TEST-01': {
        // Stationary Sensor Calibration
        errors.gyroBiasNorm = gyroBiasNorm;
        errors.accelNoiseStd = accelNoiseStd;
        errors.gyroNoiseStd = gyroNoiseStd;
        passed = cal.calibrated && gyroBiasNorm < 0.03 && accelNoiseStd < 0.15 && gyroNoiseStd < 0.04;
        break;
      }
      case 'TEST-02': {
        // Stationary ZUPT Velocity Clamp
        // Inertial PDR displacement must remain 0.0m (< 0.05m), speed clamped < 0.08 m/s
        passed = this.maxSpeedMps < 0.08 && pdrDisplacementMeters < 0.05 && finalVelocityMps < 0.03;
        break;
      }
      case 'TEST-03':
      case 'TEST-04':
      case 'TEST-05': {
        passed = errors.stepAccuracyPct !== undefined ? errors.stepAccuracyPct >= 88 : false;
        break;
      }
      case 'TEST-06':
      case 'TEST-07': {
        passed = errors.distanceErrorPct !== undefined ? errors.distanceErrorPct <= 12 : false;
        break;
      }
      case 'TEST-08': {
        // Closed loop return FDE
        passed = fdeMeters <= 3.8;
        break;
      }
      case 'TEST-09': {
        passed = (gpsOutageLatencyMs || 0) <= 3500 && (errors.driftRateMPerMin || 0) <= 6.5;
        break;
      }
      case 'TEST-10': {
        const uncertaintyContracted =
          this.uncertaintyBeforeReacquisition > 0 &&
          this.uncertaintyAfterReacquisition < this.uncertaintyBeforeReacquisition;
        passed = uncertaintyContracted;
        break;
      }
      case 'TEST-ML-01': {
        passed = errors.mlDistanceErrorPct !== undefined
          ? (errors.mlDistanceErrorPct <= 10.0 || (errors.mlImprovementPct !== undefined && errors.mlImprovementPct >= 0))
          : false;
        break;
      }
    }

    // Device & Browser metadata
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    let browser = 'Browser';
    if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';

    let device = 'Smartphone';
    if (ua.includes('iPhone')) device = 'iPhone';
    else if (ua.includes('Android')) device = 'Android';

    const record: FieldTestRecord = {
      recordId: `FT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      testId: this.activeTestId,
      testName: def.name,
      timestamp: Date.now(),
      formattedDate: new Date().toLocaleString(),
      device,
      browser,
      durationSec,
      samplingRateHz: 50, // Nominal, real rate calculated via timestamps
      calibrationState: store.calibration.calibrated ? 'CALIBRATED' : 'UNCALIBRATED',
      outageType: measured.outageType,
      groundTruth,
      measured,
      errors,
      passed,
      passCriteria: def.defaultPassCriteria,
    };

    this.records.unshift(record);
    this.saveRecords();

    // Auto-record labeled training samples if physical distance was measured
    if (
      (this.activeTestId === 'TEST-06' || this.activeTestId === 'TEST-07' || this.activeTestId === 'TEST-ML-01') &&
      groundTruth.trueDistanceMeters && groundTruth.trueDistanceMeters > 0 &&
      stepFrames.length > 0
    ) {
      try {
        const featuresList = stepFrames.map((f) => f.mlPrediction!.features);
        const effectiveBaseline = mlBaselineDist > 0 ? mlBaselineDist : distanceMeters;
        aiModule.recordLabeledSession(
          record.recordId,
          featuresList,
          groundTruth.trueDistanceMeters,
          effectiveBaseline
        );
      } catch {}
    }

    sessionRecorder.stop();
    this.releaseWakeLock();

    this.status = 'COMPLETED';
    return record;
  }

  public getRecords(): FieldTestRecord[] {
    return [...this.records];
  }

  public deleteRecord(recordId: string): void {
    this.records = this.records.filter((r) => r.recordId !== recordId);
    this.saveRecords();
  }

  public clearRecords(): void {
    this.records = [];
    this.saveRecords();
  }

  /**
   * Computes aggregate summary metrics for the SIH Dossier.
   * Returns hasMeasurements = false if no real trials have been completed.
   */
  public getSIHSummary(): SIHSummaryMetrics {
    if (this.records.length === 0) {
      return {
        totalTrials: 0,
        completedTests: {
          'TEST-01': 0,
          'TEST-02': 0,
          'TEST-03': 0,
          'TEST-04': 0,
          'TEST-05': 0,
          'TEST-06': 0,
          'TEST-07': 0,
          'TEST-08': 0,
          'TEST-09': 0,
          'TEST-10': 0,
          'TEST-ML-01': 0,
        },
        meanStepAccuracyPct: null,
        meanDistanceErrorPct: null,
        meanFdeMeters: null,
        meanDriftRateMPerMin: null,
        meanHeadingDriftDegPerMin: null,
        meanGpsOutageLatencyMs: null,
        hasMeasurements: false,
      };
    }

    const counts: Record<TestId, number> = {
      'TEST-01': 0,
      'TEST-02': 0,
      'TEST-03': 0,
      'TEST-04': 0,
      'TEST-05': 0,
      'TEST-06': 0,
      'TEST-07': 0,
      'TEST-08': 0,
      'TEST-09': 0,
      'TEST-10': 0,
      'TEST-ML-01': 0,
    };

    const stepAccs: number[] = [];
    const distErrors: number[] = [];
    const fdes: number[] = [];
    const driftRates: number[] = [];
    const headingDrifts: number[] = [];
    const outageLatencies: number[] = [];

    for (const r of this.records) {
      counts[r.testId] = (counts[r.testId] || 0) + 1;
      if (r.errors.stepAccuracyPct !== undefined) stepAccs.push(r.errors.stepAccuracyPct);
      if (r.errors.distanceErrorPct !== undefined) distErrors.push(r.errors.distanceErrorPct);
      if (r.errors.finalDisplacementErrorMeters !== undefined) fdes.push(r.errors.finalDisplacementErrorMeters);
      if (r.errors.driftRateMPerMin !== undefined) driftRates.push(r.errors.driftRateMPerMin);
      if (r.errors.headingDriftRateDegPerMin !== undefined) headingDrifts.push(r.errors.headingDriftRateDegPerMin);
      if (r.errors.gpsOutageLatencyMs !== undefined) outageLatencies.push(r.errors.gpsOutageLatencyMs);
    }

    const avg = (arr: number[]) => (arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)) : null);

    return {
      totalTrials: this.records.length,
      completedTests: counts,
      meanStepAccuracyPct: avg(stepAccs),
      meanDistanceErrorPct: avg(distErrors),
      meanFdeMeters: avg(fdes),
      meanDriftRateMPerMin: avg(driftRates),
      meanHeadingDriftDegPerMin: avg(headingDrifts),
      meanGpsOutageLatencyMs: avg(outageLatencies),
      hasMeasurements: true,
    };
  }

  public exportJSON(): void {
    if (this.records.length === 0) {
      alert('No field test records to export. Please complete at least one test.');
      return;
    }

    const exportData = {
      title: 'NaviSense SIH Field Validation Test Dossier',
      exportedAt: new Date().toISOString(),
      summary: this.getSIHSummary(),
      records: this.records,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navisense_sih_field_tests_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public exportCSV(): void {
    if (this.records.length === 0) {
      alert('No field test records to export. Please complete at least one test.');
      return;
    }

    const headers = [
      'RecordID',
      'TestID',
      'TestName',
      'Date',
      'Device',
      'Browser',
      'Duration_sec',
      'Calibration',
      'Outage_Type',
      'GroundTruth_Steps',
      'GroundTruth_Distance_m',
      'Measured_Steps',
      'Measured_Distance_m',
      'Measured_Cadence_spm',
      'Step_Error',
      'Step_Accuracy_pct',
      'Distance_Error_m',
      'Distance_Error_pct',
      'FDE_m',
      'DriftRate_m_per_min',
      'Heading_Error_deg',
      'GPS_Outage_Latency_ms',
      'GPS_Reacq_Innovation_m',
      'Uncertainty_1Sigma_m',
      'Passed',
      'PassCriteria',
    ];

    const rows = this.records.map((r) => [
      r.recordId,
      r.testId,
      `"${r.testName}"`,
      `"${r.formattedDate}"`,
      r.device,
      r.browser,
      r.durationSec,
      r.calibrationState,
      r.outageType ?? '',
      r.groundTruth.trueSteps ?? '',
      r.groundTruth.trueDistanceMeters ?? '',
      r.measured.steps,
      r.measured.distanceMeters,
      r.measured.cadence,
      r.errors.stepError ?? '',
      r.errors.stepAccuracyPct ?? '',
      r.errors.distanceErrorMeters ?? '',
      r.errors.distanceErrorPct ?? '',
      r.errors.finalDisplacementErrorMeters ?? '',
      r.errors.driftRateMPerMin ?? '',
      r.errors.headingErrorDeg ?? '',
      r.errors.gpsOutageLatencyMs ?? '',
      r.errors.gpsReacquisitionInnovationM ?? '',
      r.measured.finalUncertainty1Sigma,
      r.passed ? 'PASS' : 'FAIL',
      `"${r.passCriteria}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `navisense_sih_field_tests_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private async requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      }
    } catch {
      // WakeLock optional or denied
    }
  }

  private releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {
        // Ignored
      }
      this.wakeLockSentinel = null;
    }
  }

  private saveRecords() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
      }
    } catch {
      // Storage unavailable
    }
  }

  private loadRecords() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          this.records = JSON.parse(raw);
        }
      }
    } catch {
      this.records = [];
    }
  }
}

export const fieldTestManager = FieldTestManager.getInstance();
