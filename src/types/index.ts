export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface SensorSample {
  timestamp: number;
  accel: Vector3D;
  gyro: Vector3D;
  mag?: Vector3D;
}

export interface OrientationState {
  alpha: number; // Z-axis rotation
  beta: number;  // X-axis rotation
  gamma: number; // Y-axis rotation
  absolute: boolean;
}

export interface GPSMeasurement {
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  speed: number | null;
  heading: number | null;
}

export interface GPSReceiverInfo {
  status: 'AVAILABLE' | 'WAITING' | 'ERROR' | 'UNAVAILABLE';
  accuracy: number | null;
  lastHardwareFixTime: number | null;
}

export interface Position2D {
  latitude: number;
  longitude: number;
}

export interface Velocity2D {
  vn: number; // Velocity North (m/s)
  ve: number; // Velocity East (m/s)
}

export type NavigationMode = 'IDLE' | 'CALIBRATING' | 'GPS_AIDED' | 'GPS_DEGRADED' | 'GPS_DENIED' | 'REACQUIRING' | 'ERROR';
export type MotionState = 'STATIONARY' | 'WALKING' | 'VEHICLE' | 'UNKNOWN';
export type HeadingType = 'ABSOLUTE' | 'RELATIVE';

export interface CalibrationData {
  accelBias: Vector3D;
  gyroBias: Vector3D;
  accelNoiseStd: number;
  gyroNoiseStd: number;
  calibrated: boolean;
  samples: number;
  calibratedAt?: number;
}

export interface StepEvent {
  timestamp: number;
  stepNumber: number;
  strideLength: number; // in meters
  cadence: number; // steps per minute
  headingDeg: number; // walking heading in degrees
  displacement: { dE: number; dN: number }; // delta East and North in meters
}

export interface PDRState {
  stepCount: number;
  cadence: number; // steps/min
  lastStepTime: number;
  strideLength: number; // in meters
  totalDistance: number; // in meters
  weinbergK: number;
  localPos: { east: number; north: number }; // metric offset from origin
  geodeticPos: Position2D | null;
}

export interface EKFTelemetry {
  state: [number, number, number, number]; // [posEast, posNorth, velEast, velNorth]
  uncertainty1Sigma: number; // 1-sigma uncertainty radius in meters (68%)
  uncertainty2Sigma: number; // 2-sigma uncertainty radius in meters (95%)
  pDiag: [number, number, number, number]; // diagonal of covariance matrix P
  lastInnovation: [number, number] | null;
  lastUpdateType: 'INIT' | 'PREDICT' | 'ZUPT' | 'GPS' | 'STEP';
}

export interface DebugTelemetry {
  rawAccel: Vector3D;
  calibratedAccel: Vector3D;
  linearAccelWorld: Vector3D;
  gravityVectorWorld: Vector3D;
  rawGyro: Vector3D;
  calibratedGyro: Vector3D;
  quaternion: Quaternion;
  headingDeg: number;
  headingType: HeadingType;
  motionState: MotionState;
  motionVariance: number;
  pdrLocalPos: { east: number; north: number };
  gpsLocalPos: { east: number; north: number } | null;
  ekfLocalPos: { east: number; north: number };
  gpsAgeMs: number;
}

export interface SessionRecordFrame {
  timestamp: number;
  gps: { lat: number; lon: number; accuracy: number } | null;
  rawAccel: Vector3D;
  calibratedAccel: Vector3D;
  rawGyro: Vector3D;
  quaternion: Quaternion;
  heading: number;
  motionState: MotionState;
  stepEvent: StepEvent | null;
  mlPrediction?: import('../engine/ml/MLPTypes').MLPrediction | null;
  pdrPos: { east: number; north: number };
  ekfPos: { east: number; north: number };
}

export interface ModelPrediction {
  timestamp: number;
  driftConfidence: number;
  suggestedCorrection: { dx: number; dy: number };
  motionState: MotionState;
}

export type { MLTelemetry, MLPrediction, FeatureVector } from '../engine/ml/MLPTypes';

export interface NavigationState {
  timestamp: number;
  mode: NavigationMode;
  origin: Position2D | null;
  gps: GPSMeasurement | null;
  estimatedPosition: Position2D | null;
  estimatedVelocity: Velocity2D;
  orientation: OrientationState | null;
  quaternion: Quaternion;
  heading: number;
  headingType: HeadingType;
  motionState: MotionState;
  uncertainty: number; // 1-sigma radius (meters)
  uncertainty2Sigma: number; // 2-sigma radius (meters)
  distanceTraveled: number;
  isDemoMode: boolean;
  gpsActive: boolean;
  gpsInputEnabled: boolean;
  gpsReceiver: GPSReceiverInfo;
  mlEnabled: boolean;
  mlTelemetry?: import('../engine/ml/MLPTypes').MLTelemetry;
  pdr: PDRState;
  ekf: EKFTelemetry;
  debug: DebugTelemetry;
}

