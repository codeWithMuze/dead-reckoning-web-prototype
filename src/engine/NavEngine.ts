import { useNavStore } from '../store/useNavStore';
import { getRotationMatrix, multiplyMatrixVector, offsetPosition } from './MathUtils';
import type { SensorSample, GPSMeasurement, OrientationState } from '../types';

export class NavEngine {
  private static instance: NavEngine;

  private isRunning = false;
  private lastUpdate = 0;
  
  // EKF state variables
  private lat = 0;
  private lon = 0;
  private vn = 0;
  private ve = 0;
  private P = 1; // Uncertainty

  // Sensors
  private orientation: OrientationState | null = null;
  

  private constructor() {}

  static getInstance() {
    if (!NavEngine.instance) {
      NavEngine.instance = new NavEngine();
    }
    return NavEngine.instance;
  }

  public start() {
    this.isRunning = true;
    this.lastUpdate = Date.now();
  }

  public stop() {
    this.isRunning = false;
  }

  public resetPosition(lat: number, lon: number) {
    this.lat = lat;
    this.lon = lon;
    this.vn = 0;
    this.ve = 0;
    this.P = 1; // reset uncertainty
    
    const store = useNavStore.getState();
    store.updateNavState({
      estimatedPosition: { latitude: lat, longitude: lon },
      estimatedVelocity: { vn: 0, ve: 0 },
      uncertainty: this.P
    });
  }

  public setDemoPosition(lat: number, lon: number, vn: number, ve: number, heading: number) {
    this.lat = lat;
    this.lon = lon;
    this.vn = vn;
    this.ve = ve;

    const store = useNavStore.getState();
    store.updateNavState({
      estimatedPosition: { latitude: lat, longitude: lon },
      estimatedVelocity: { vn, ve },
      heading,
      uncertainty: this.P,
    });

    if (store.navState.mode === 'GPS_DENIED' || store.navState.mode === 'GPS_DEGRADED') {
      store.addDrPoint(lat, lon);
    }
    store.addFusedPoint(lat, lon);
  }

  public handleOrientation(alpha: number, beta: number, gamma: number, absolute: boolean) {
    this.orientation = { alpha, beta, gamma, absolute };
    useNavStore.getState().updateNavState({ orientation: this.orientation });
  }

  public handleGPS(gps: GPSMeasurement) {
    const store = useNavStore.getState();
    const mode = store.navState.mode;

    // First GPS lock
    if (this.lat === 0 && this.lon === 0) {
      this.resetPosition(gps.latitude, gps.longitude);
      store.updateNavState({ mode: 'GPS_AIDED' });
    }

    if (mode === 'IDLE' || mode === 'CALIBRATING') return;

    // If we're getting GPS, correct the position (simplified EKF update)
    if (gps.accuracy < 20) { 
      const K = this.P / (this.P + gps.accuracy); // Kalman gain
      this.lat = this.lat + K * (gps.latitude - this.lat);
      this.lon = this.lon + K * (gps.longitude - this.lon);
      this.P = (1 - K) * this.P;

      store.addGpsPoint(gps.latitude, gps.longitude);
      store.addFusedPoint(this.lat, this.lon);

      if (mode === 'GPS_DENIED' || mode === 'GPS_DEGRADED') {
         store.updateNavState({ mode: 'GPS_AIDED' });
      }
    }
    
    // Update store
    store.updateNavState({ gps, gpsActive: true, estimatedPosition: { latitude: this.lat, longitude: this.lon }, uncertainty: this.P });
  }

  public handleIMU(sample: SensorSample) {
    const store = useNavStore.getState();
    store.updateSensor(sample);

    if (store.navState.isDemoMode) return;

    if (!this.isRunning || store.navState.mode === 'IDLE' || store.navState.mode === 'CALIBRATING') return;
    if (this.lat === 0 && this.lon === 0) return; // Wait for initial GPS

    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000.0;
    this.lastUpdate = now;

    if (dt > 1) return; // Prevent huge jumps if app is backgrounded

    // If GPS is inactive for 5 seconds, switch to GPS_DENIED
    const gpsAge = store.navState.gps ? now - store.navState.gps.timestamp : Infinity;
    if (gpsAge > 5000 && !store.navState.isDemoMode) { // In demo mode, we might control this manually
      store.updateNavState({ mode: 'GPS_DENIED', gpsActive: false });
    } else if (store.navState.isDemoMode && store.navState.mode === 'GPS_DENIED') {
      store.updateNavState({ gpsActive: false });
    }

    // Dead Reckoning Step
    // 1. Get calibrated accel
    const cal = store.calibration;
    const ax = sample.accel.x - cal.accelBias.x;
    const ay = sample.accel.y - cal.accelBias.y;
    const az = sample.accel.z - cal.accelBias.z;

    let worldAccel = { n: 0, e: 0 };

    if (this.orientation) {
      // Rotate accel vector to world frame
      const R = getRotationMatrix(this.orientation.alpha, this.orientation.beta, this.orientation.gamma);
      const accelVector = [ax, ay, az];
      const worldVec = multiplyMatrixVector(R, accelVector);
      
      // Assume ENU frame depending on device orientation implementation.
      // Usually X=East, Y=North, Z=Up
      worldAccel.e = worldVec[0];
      worldAccel.n = worldVec[1]; 
    } else {
      // Fallback: assume device is flat pointing north
      worldAccel.n = ay;
      worldAccel.e = ax;
    }

    // Basic Pedestrian Dead Reckoning (Damping/Friction model to prevent runaway prototype)
    // A real IMU diverges exponentially. For prototype, we apply high friction if acceleration is low
    const magnitude = Math.sqrt(ax*ax + ay*ay + az*az);
    const isMoving = magnitude > 0.5; // threshold

    if (isMoving) {
      this.vn += worldAccel.n * dt;
      this.ve += worldAccel.e * dt;
      // Damping
      this.vn *= 0.95;
      this.ve *= 0.95;
    } else {
      // Zero Velocity Update (ZUPT)
      this.vn *= 0.8;
      this.ve *= 0.8;
    }

    // Update Position
    if (store.navState.mode === 'GPS_DENIED' || store.navState.mode === 'GPS_DEGRADED') {
      const newPos = offsetPosition(this.lat, this.lon, this.vn * dt, this.ve * dt);
      this.lat = newPos.latitude;
      this.lon = newPos.longitude;
      
      // Increase uncertainty
      this.P += 0.5 * dt;

      store.addDrPoint(this.lat, this.lon);
      store.addFusedPoint(this.lat, this.lon);
    }

    // Update UI
    store.updateNavState({
      estimatedPosition: { latitude: this.lat, longitude: this.lon },
      estimatedVelocity: { vn: this.vn, ve: this.ve },
      uncertainty: this.P,
      heading: this.orientation ? this.orientation.alpha : 0
    });
  }
}

export const navEngine = NavEngine.getInstance();
