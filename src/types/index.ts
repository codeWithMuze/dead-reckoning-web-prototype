export interface SensorSample {
  timestamp: number;
  accel: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
  mag?: { x: number; y: number; z: number };
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

export interface Position2D {
  latitude: number;
  longitude: number;
}

export interface Velocity2D {
  vn: number; // Velocity North (m/s)
  ve: number; // Velocity East (m/s)
}

export interface EKFState {
  position: Position2D;
  velocity: Velocity2D;
  uncertaintyRadius: number;
}

export type NavigationMode = 'IDLE' | 'CALIBRATING' | 'GPS_AIDED' | 'GPS_DEGRADED' | 'GPS_DENIED' | 'REACQUIRING' | 'ERROR';

export interface CalibrationData {
  accelBias: { x: number; y: number; z: number };
  gyroBias: { x: number; y: number; z: number };
  calibrated: boolean;
  samples: number;
}

export interface ModelPrediction {
  timestamp: number;
  driftConfidence: number;
  suggestedCorrection: { dx: number; dy: number };
  motionState: 'STATIONARY' | 'WALKING' | 'VEHICLE' | 'UNKNOWN';
}

export interface NavigationState {
  timestamp: number;
  mode: NavigationMode;
  gps: GPSMeasurement | null;
  estimatedPosition: Position2D | null;
  estimatedVelocity: Velocity2D;
  orientation: OrientationState | null;
  uncertainty: number;
  distanceTraveled: number;
  heading: number;
  isDemoMode: boolean;
  gpsActive: boolean;
}
