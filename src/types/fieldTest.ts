export type TestId =
  | 'TEST-01'
  | 'TEST-02'
  | 'TEST-03'
  | 'TEST-04'
  | 'TEST-05'
  | 'TEST-06'
  | 'TEST-07'
  | 'TEST-08'
  | 'TEST-09'
  | 'TEST-10';

export type TestStatus = 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED';

export type OutagePhase = 'NONE' | 'BASELINE_LOCKED' | 'OUTAGE_COASTING' | 'REACQUIRED';

export interface TestDefinition {
  id: TestId;
  name: string;
  category: 'CALIBRATION' | 'STATIONARY' | 'PDR_STEPS' | 'PDR_DISTANCE' | 'TRAJECTORY' | 'GPS_RESILIENCE';
  description: string;
  physicalInstructions: string;
  groundTruthPrompts: {
    steps?: boolean;
    distance?: boolean;
    heading?: boolean;
    duration?: boolean;
    outageDuration?: boolean;
  };
  defaultPassCriteria: string;
}

export interface GroundTruthEntry {
  trueSteps?: number;
  trueDistanceMeters?: number;
  trueHeadingDeg?: number;
  knownDurationSec?: number;
  knownOutageDurationSec?: number;
}

export interface MeasuredTelemetry {
  steps: number;
  cadence: number;
  distanceMeters: number;
  pdrStartPos: { east: number; north: number };
  pdrEndPos: { east: number; north: number };
  pdrDisplacementMeters: number; // Inertial / PDR movement
  ekfStartPos: { east: number; north: number };
  ekfEndPos: { east: number; north: number };
  gpsStartPos?: { latitude: number; longitude: number } | null;
  gpsEndPos?: { latitude: number; longitude: number } | null;
  gpsDisplacementMeters?: number | null; // GPS-induced position movement
  startHeadingDeg: number;
  endHeadingDeg: number;
  maxSpeedMps: number;
  meanSpeedMps: number;
  finalVelocityMps?: number;
  zuptActivationPct?: number; // % of time ZUPT was active
  gyroBiasNorm?: number; // rad/s
  accelNoiseStd?: number; // m/s²
  gyroNoiseStd?: number; // rad/s
  finalUncertainty1Sigma: number;
  finalUncertainty2Sigma: number;
  fdeMeters: number; // Final Displacement Error of EKF
  gpsOutageLatencyMs?: number;
  measuredOutageDurationSec?: number;
  gpsReacquisitionInnovationM?: number;
  uncertaintyBeforeReacquisitionM?: number;
  uncertaintyAfterReacquisitionM?: number;
  outageType?: 'APPLICATION_INPUT_DISABLED' | 'PHYSICAL_GNSS_LOSS';
}

export interface CalculatedErrors {
  stepError?: number; // |meas - true|
  stepAccuracyPct?: number; // max(0, 1 - err/true) * 100
  distanceErrorMeters?: number;
  distanceErrorPct?: number;
  finalDisplacementErrorMeters?: number; // FDE
  driftRateMPerMin?: number;
  inertialDriftMPerMin?: number; // Drift rate from pure PDR/inertial displacement
  gpsWanderMeters?: number; // Movement induced by GPS noise
  gyroBiasNorm?: number;
  accelNoiseStd?: number;
  gyroNoiseStd?: number;
  headingErrorDeg?: number;
  headingDriftRateDegPerMin?: number;
  gpsOutageLatencyMs?: number;
  gpsReacquisitionInnovationM?: number;
  uncertaintyBeforeM?: number;
  uncertaintyAfterM?: number;
}

export interface FieldTestRecord {
  recordId: string;
  testId: TestId;
  testName: string;
  timestamp: number;
  formattedDate: string;
  device: string;
  browser: string;
  durationSec: number;
  samplingRateHz: number;
  calibrationState: string;
  outageType?: 'APPLICATION_INPUT_DISABLED' | 'PHYSICAL_GNSS_LOSS';
  groundTruth: GroundTruthEntry;
  measured: MeasuredTelemetry;
  errors: CalculatedErrors;
  passed: boolean;
  passCriteria: string;
  notes?: string;
}

export interface SIHSummaryMetrics {
  totalTrials: number;
  completedTests: Record<TestId, number>;
  meanStepAccuracyPct: number | null;
  meanDistanceErrorPct: number | null;
  meanFdeMeters: number | null;
  meanDriftRateMPerMin: number | null;
  meanHeadingDriftDegPerMin: number | null;
  meanGpsOutageLatencyMs: number | null;
  hasMeasurements: boolean;
}
