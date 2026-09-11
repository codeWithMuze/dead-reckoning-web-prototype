import { create } from 'zustand';
import type { NavigationState, CalibrationData, SensorSample, ModelPrediction } from '../types';

interface NavStore {
  navState: NavigationState;
  calibration: CalibrationData;
  latestSensor: SensorSample | null;
  modelPrediction: ModelPrediction | null;
  gpsTrail: [number, number][]; // [lat, lon]
  drTrail: [number, number][];
  fusedTrail: [number, number][];
  updateNavState: (partial: Partial<NavigationState>) => void;
  updateCalibration: (cal: CalibrationData) => void;
  updateSensor: (sample: SensorSample) => void;
  updateModelPrediction: (pred: ModelPrediction) => void;
  addGpsPoint: (lat: number, lon: number) => void;
  addDrPoint: (lat: number, lon: number) => void;
  addFusedPoint: (lat: number, lon: number) => void;
  resetTrails: () => void;
}

const initialNavState: NavigationState = {
  timestamp: 0,
  mode: 'IDLE',
  gps: null,
  estimatedPosition: null,
  estimatedVelocity: { vn: 0, ve: 0 },
  orientation: null,
  uncertainty: 0,
  distanceTraveled: 0,
  heading: 0,
  isDemoMode: false,
  gpsActive: false,
};

export const useNavStore = create<NavStore>((set) => ({
  navState: initialNavState,
  calibration: { accelBias: { x: 0, y: 0, z: 0 }, gyroBias: { x: 0, y: 0, z: 0 }, calibrated: false, samples: 0 },
  latestSensor: null,
  modelPrediction: null,
  gpsTrail: [],
  drTrail: [],
  fusedTrail: [],
  updateNavState: (partial) => set((state) => ({ navState: { ...state.navState, ...partial } })),
  updateCalibration: (cal) => set({ calibration: cal }),
  updateSensor: (sample) => set({ latestSensor: sample }),
  updateModelPrediction: (pred) => set({ modelPrediction: pred }),
  addGpsPoint: (lat, lon) => set((state) => ({ gpsTrail: [...state.gpsTrail, [lat, lon]] })),
  addDrPoint: (lat, lon) => set((state) => ({ drTrail: [...state.drTrail, [lat, lon]] })),
  addFusedPoint: (lat, lon) => set((state) => ({ fusedTrail: [...state.fusedTrail, [lat, lon]] })),
  resetTrails: () => set({ gpsTrail: [], drTrail: [], fusedTrail: [] }),
}));
