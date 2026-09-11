import { create } from 'zustand';
import type { NavigationState, CalibrationData, SensorSample, ModelPrediction, PDRState, EKFTelemetry, DebugTelemetry } from '../types';
import { IDENTITY_QUATERNION } from '../engine/Quaternion.ts';
import { calibrationManager } from '../engine/CalibrationManager.ts';

interface NavStore {
  navState: NavigationState;
  calibration: CalibrationData;
  latestSensor: SensorSample | null;
  modelPrediction: ModelPrediction | null;
  gpsTrail: [number, number][]; // [lat, lon]
  drTrail: [number, number][];   // PDR trajectory
  fusedTrail: [number, number][]; // EKF trajectory
  gpsInputEnabled: boolean;
  mlEnabled: boolean;
  mlTelemetry: import('../types').MLTelemetry;
  setGpsInputEnabled: (enabled: boolean) => void;
  setMLEnabled: (enabled: boolean) => void;
  updateMLTelemetry: (partial: Partial<import('../types').MLTelemetry>) => void;
  updateGPSReceiver: (info: Partial<import('../types').GPSReceiverInfo>) => void;
  updateNavState: (partial: Partial<NavigationState>) => void;
  updateCalibration: (cal: CalibrationData) => void;
  updateSensor: (sample: SensorSample) => void;
  updateModelPrediction: (pred: ModelPrediction) => void;
  updatePDR: (partial: Partial<PDRState>) => void;
  updateEKF: (partial: Partial<EKFTelemetry>) => void;
  updateDebug: (partial: Partial<DebugTelemetry>) => void;
  addGpsPoint: (lat: number, lon: number) => void;
  addDrPoint: (lat: number, lon: number) => void;
  addFusedPoint: (lat: number, lon: number) => void;
  resetTrails: () => void;
}

const initialMLTelemetry: import('../types').MLTelemetry = {
  mlEnabled: false,
  status: 'STANDBY',
  modelName: 'NaviSense-MLP-AdaptiveStride',
  correctionFactor: 1.0,
  baselineStride: 0.70,
  correctedStride: 0.70,
  confidence: 0.95,
  lastInferenceMs: 0.05,
  totalPredictions: 0,
  fallbackCount: 0,
  recentPrediction: null,
};

const initialPDR: PDRState = {
  stepCount: 0,
  cadence: 0,
  lastStepTime: 0,
  strideLength: 0,
  totalDistance: 0,
  weinbergK: 0.42,
  localPos: { east: 0, north: 0 },
  geodeticPos: null,
};

const initialEKF: EKFTelemetry = {
  state: [0, 0, 0, 0],
  uncertainty1Sigma: 2.0,
  uncertainty2Sigma: 4.0,
  pDiag: [4, 4, 0.25, 0.25],
  lastInnovation: null,
  lastUpdateType: 'INIT',
};

const initialDebug: DebugTelemetry = {
  rawAccel: { x: 0, y: 0, z: 0 },
  calibratedAccel: { x: 0, y: 0, z: 0 },
  linearAccelWorld: { x: 0, y: 0, z: 0 },
  gravityVectorWorld: { x: 0, y: 0, z: -9.81 },
  rawGyro: { x: 0, y: 0, z: 0 },
  calibratedGyro: { x: 0, y: 0, z: 0 },
  quaternion: IDENTITY_QUATERNION,
  headingDeg: 0,
  headingType: 'RELATIVE',
  motionState: 'UNKNOWN',
  motionVariance: 0,
  pdrLocalPos: { east: 0, north: 0 },
  gpsLocalPos: null,
  ekfLocalPos: { east: 0, north: 0 },
  gpsAgeMs: 0,
};

const initialNavState: NavigationState = {
  timestamp: 0,
  mode: 'IDLE',
  origin: null,
  gps: null,
  estimatedPosition: null,
  estimatedVelocity: { vn: 0, ve: 0 },
  orientation: null,
  quaternion: IDENTITY_QUATERNION,
  heading: 0,
  headingType: 'RELATIVE',
  motionState: 'UNKNOWN',
  uncertainty: 2.0,
  uncertainty2Sigma: 4.0,
  distanceTraveled: 0,
  isDemoMode: false,
  gpsActive: false,
  gpsInputEnabled: true,
  gpsReceiver: {
    status: 'WAITING',
    accuracy: null,
    lastHardwareFixTime: null,
    errorMessage: null,
  },
  mlEnabled: false,
  mlTelemetry: initialMLTelemetry,
  pdr: initialPDR,
  ekf: initialEKF,
  debug: initialDebug,
};

export const useNavStore = create<NavStore>((set) => ({
  navState: initialNavState,
  calibration: calibrationManager.getCalibration(),
  latestSensor: null,
  modelPrediction: null,
  gpsTrail: [],
  drTrail: [],
  fusedTrail: [],
  gpsInputEnabled: true,
  mlEnabled: false,
  mlTelemetry: initialMLTelemetry,
  setGpsInputEnabled: (enabled) =>
    set((state) => ({
      gpsInputEnabled: enabled,
      navState: {
        ...state.navState,
        gpsInputEnabled: enabled,
      },
    })),
  setMLEnabled: (enabled) =>
    set((state) => ({
      mlEnabled: enabled,
      mlTelemetry: {
        ...state.mlTelemetry,
        mlEnabled: enabled,
        status: enabled ? 'ACTIVE' : 'STANDBY',
      },
      navState: {
        ...state.navState,
        mlEnabled: enabled,
        mlTelemetry: {
          ...state.mlTelemetry,
          mlEnabled: enabled,
          status: enabled ? 'ACTIVE' : 'STANDBY',
        },
      },
    })),
  updateMLTelemetry: (partial) =>
    set((state) => {
      const updated = { ...state.mlTelemetry, ...partial };
      return {
        mlTelemetry: updated,
        navState: {
          ...state.navState,
          mlTelemetry: updated,
        },
      };
    }),
  updateGPSReceiver: (info) =>
    set((state) => ({
      navState: {
        ...state.navState,
        gpsReceiver: {
          ...state.navState.gpsReceiver,
          ...info,
        },
      },
    })),
  updateNavState: (partial) => set((state) => ({ navState: { ...state.navState, ...partial } })),
  updateCalibration: (cal) => set({ calibration: cal }),
  updateSensor: (sample) => set({ latestSensor: sample }),
  updateModelPrediction: (pred) => set({ modelPrediction: pred }),
  updatePDR: (partial) =>
    set((state) => ({
      navState: {
        ...state.navState,
        pdr: { ...state.navState.pdr, ...partial },
      },
    })),
  updateEKF: (partial) =>
    set((state) => ({
      navState: {
        ...state.navState,
        ekf: { ...state.navState.ekf, ...partial },
      },
    })),
  updateDebug: (partial) =>
    set((state) => ({
      navState: {
        ...state.navState,
        debug: { ...state.navState.debug, ...partial },
      },
    })),
  addGpsPoint: (lat, lon) => set((state) => ({ gpsTrail: [...state.gpsTrail, [lat, lon]] })),
  addDrPoint: (lat, lon) => set((state) => ({ drTrail: [...state.drTrail, [lat, lon]] })),
  addFusedPoint: (lat, lon) => set((state) => ({ fusedTrail: [...state.fusedTrail, [lat, lon]] })),
  resetTrails: () => set({ gpsTrail: [], drTrail: [], fusedTrail: [] }),
}));

