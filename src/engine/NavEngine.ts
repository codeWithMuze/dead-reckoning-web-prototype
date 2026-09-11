import { useNavStore } from '../store/useNavStore';
import { enuToGeodetic, geodeticToENU } from './MathUtils';
import { AttitudeEstimator } from './AttitudeEstimator';
import { calibrationManager } from './CalibrationManager';
import { MotionClassifier } from './MotionClassifier';
import { StepDetector } from './StepDetector';
import { NavigationEKF } from './NavigationEKF';
import { sessionRecorder } from './SessionRecorder';
import { fieldTestManager } from './FieldTestManager.ts';
import type { SensorSample, GPSMeasurement, Position2D, Vector3D } from '../types';

export class NavEngine {
  private static instance: NavEngine;

  private isRunning = false;
  private lastUpdateTimestamp = 0;

  // Submodules
  private attitudeEstimator = new AttitudeEstimator();
  private motionClassifier = new MotionClassifier();
  private stepDetector = new StepDetector(0.42);
  private ekf = new NavigationEKF();

  // Local Metric Reference Origin
  private origin: Position2D | null = null;
  private pdrLocalPos = { east: 0, north: 0 };

  private constructor() {}

  public static getInstance(): NavEngine {
    if (!NavEngine.instance) {
      NavEngine.instance = new NavEngine();
    }
    return NavEngine.instance;
  }

  public start() {
    this.isRunning = true;
    this.lastUpdateTimestamp = 0;
  }

  public stop() {
    this.isRunning = false;
  }

  public setWeinbergK(k: number) {
    this.stepDetector.setWeinbergK(k);
    useNavStore.getState().updatePDR({ weinbergK: this.stepDetector.getWeinbergK() });
  }

  public resetOrigin(lat: number, lon: number) {
    this.origin = { latitude: lat, longitude: lon };
    this.pdrLocalPos = { east: 0, north: 0 };
    this.stepDetector.reset();
    this.ekf.reset(0, 0);

    const store = useNavStore.getState();
    store.updateNavState({
      origin: this.origin,
      estimatedPosition: { latitude: lat, longitude: lon },
      estimatedVelocity: { vn: 0, ve: 0 },
      distanceTraveled: 0,
      mode: 'GPS_AIDED',
    });
    store.updatePDR({
      stepCount: 0,
      cadence: 0,
      totalDistance: 0,
      localPos: { east: 0, north: 0 },
      geodeticPos: { latitude: lat, longitude: lon },
    });
    store.updateEKF(this.ekf.getTelemetry());
  }

  public handleOrientation(alpha: number, beta: number, gamma: number, absolute: boolean) {
    this.attitudeEstimator.handleOrientationEvent(alpha, beta, gamma, absolute);
    useNavStore.getState().updateNavState({
      orientation: { alpha, beta, gamma, absolute },
      heading: this.attitudeEstimator.getHeadingDeg(),
      headingType: this.attitudeEstimator.getHeadingType(),
      quaternion: this.attitudeEstimator.getQuaternion(),
    });
  }

  public handleGPS(gps: GPSMeasurement) {
    const store = useNavStore.getState();
    const currentMode = store.navState.mode;

    // First GPS Fix establishes the session origin
    if (!this.origin) {
      this.resetOrigin(gps.latitude, gps.longitude);
    }

    if (currentMode === 'IDLE' || currentMode === 'CALIBRATING') return;

    // Convert GPS Geodetic into Local ENU Metric Coordinates
    const origin = this.origin!;
    const { east: gpsEast, north: gpsNorth } = geodeticToENU(
      gps.latitude,
      gps.longitude,
      origin.latitude,
      origin.longitude
    );

    // EKF Measurement Update
    this.ekf.updateGPS(gpsEast, gpsNorth, gps.accuracy);

    // Mode state transition
    let newMode = currentMode;
    if (gps.accuracy > 15.0) {
      newMode = 'GPS_DEGRADED';
    } else if (currentMode === 'GPS_DENIED') {
      newMode = 'REACQUIRING';
      setTimeout(() => {
        if (useNavStore.getState().navState.mode === 'REACQUIRING') {
          useNavStore.getState().updateNavState({ mode: 'GPS_AIDED' });
        }
      }, 1000);
    } else if (currentMode !== 'REACQUIRING') {
      newMode = 'GPS_AIDED';
    }

    store.addGpsPoint(gps.latitude, gps.longitude);

    // Convert EKF position back to geodetic for map display
    const ekfPos = this.ekf.getPosition();
    const ekfGeodetic = enuToGeodetic(ekfPos.east, ekfPos.north, origin.latitude, origin.longitude);
    store.addFusedPoint(ekfGeodetic.latitude, ekfGeodetic.longitude);

    const ekfTelemetry = this.ekf.getTelemetry();
    store.updateNavState({
      gps,
      gpsActive: true,
      mode: newMode,
      estimatedPosition: ekfGeodetic,
      estimatedVelocity: { vn: this.ekf.getVelocity().vn, ve: this.ekf.getVelocity().ve },
      uncertainty: ekfTelemetry.uncertainty1Sigma,
      uncertainty2Sigma: ekfTelemetry.uncertainty2Sigma,
    });
    store.updateEKF(ekfTelemetry);
    store.updateDebug({
      gpsLocalPos: { east: Number(gpsEast.toFixed(2)), north: Number(gpsNorth.toFixed(2)) },
      gpsAgeMs: 0,
    });
  }

  public handleIMU(sample: SensorSample) {
    const store = useNavStore.getState();

    // Feed calibration manager if calibration is active
    if (calibrationManager.isBusy()) {
      calibrationManager.feedSample(sample.accel, sample.gyro);
      return;
    }

    store.updateSensor(sample);

    if (!this.isRunning || store.navState.mode === 'IDLE' || store.navState.mode === 'CALIBRATING') return;

    // Time delta verification
    if (this.lastUpdateTimestamp === 0) {
      this.lastUpdateTimestamp = sample.timestamp;
      return;
    }

    const dt = (sample.timestamp - this.lastUpdateTimestamp) / 1000.0;
    this.lastUpdateTimestamp = sample.timestamp;

    // Outlier / negative dt rejection
    if (dt <= 0.0001 || dt > 0.5) return;

    // 1. Calibration Bias Subtraction
    const cal = calibrationManager.getCalibration();
    const calibratedAccel: Vector3D = {
      x: sample.accel.x - cal.accelBias.x,
      y: sample.accel.y - cal.accelBias.y,
      z: sample.accel.z - cal.accelBias.z,
    };

    const calibratedGyro: Vector3D = {
      x: sample.gyro.x - cal.gyroBias.x,
      y: sample.gyro.y - cal.gyroBias.y,
      z: sample.gyro.z - cal.gyroBias.z,
    };

    // 2. Motion Classification (STATIONARY vs WALKING)
    const { state: motionState, variance: motionVariance } = this.motionClassifier.update(
      calibratedAccel,
      calibratedGyro
    );

    // 3. Attitude Propagation & Tilt Leveling via Quaternions
    const q = this.attitudeEstimator.update(
      calibratedGyro,
      calibratedAccel,
      dt,
      motionState === 'STATIONARY'
    );
    const headingDeg = this.attitudeEstimator.getHeadingDeg();

    // 4. Gravity Compensation & Coordinate Transformation
    // Rotate body acceleration to World ENU frame: a_W = q ⊗ a_B ⊗ q*
    const worldAccel = this.attitudeEstimator.transformBodyToWorld(calibratedAccel);

    // If accelerometer measures including gravity (~9.8m/s² vertical norm), subtract Earth gravity
    const accelNorm = Math.sqrt(
      calibratedAccel.x * calibratedAccel.x +
      calibratedAccel.y * calibratedAccel.y +
      calibratedAccel.z * calibratedAccel.z
    );

    let linearAccelWorld: Vector3D;
    let gravityVectorWorld: Vector3D;

    if (accelNorm > 5.0) {
      // Raw accelerometer contains gravity: subtract gravity [0, 0, -9.80665] in ENU
      linearAccelWorld = {
        x: worldAccel.x,
        y: worldAccel.y,
        z: worldAccel.z - 9.80665,
      };
      gravityVectorWorld = { x: 0, y: 0, z: -9.80665 };
    } else {
      // Browser pre-filtered linear acceleration
      linearAccelWorld = { ...worldAccel };
      gravityVectorWorld = { x: 0, y: 0, z: 0 };
    }

    // 5. Zero-Velocity Update (ZUPT)
    if (motionState === 'STATIONARY') {
      this.ekf.updateZUPT(0.05);
    } else {
      // EKF Prediction Step with dynamic acceleration
      this.ekf.predict(dt, linearAccelWorld.x, linearAccelWorld.y, cal.accelNoiseStd || 0.2);
    }

    // 6. Pedestrian Step Detection & Weinberg Stride Estimation
    // Uses vertical dynamic acceleration (+Z in ENU)
    const stepEvent = this.stepDetector.processSample(linearAccelWorld.z, sample.timestamp, headingDeg);

    if (stepEvent && this.origin) {
      // Propagate discrete PDR local metric position:
      this.pdrLocalPos.east += stepEvent.displacement.dE;
      this.pdrLocalPos.north += stepEvent.displacement.dN;

      // Update EKF with PDR step constraint
      this.ekf.updatePDRStep(this.pdrLocalPos.east, this.pdrLocalPos.north, 0.7);

      // Convert PDR local position to geodetic coordinates
      const pdrGeodetic = enuToGeodetic(
        this.pdrLocalPos.east,
        this.pdrLocalPos.north,
        this.origin.latitude,
        this.origin.longitude
      );

      store.addDrPoint(pdrGeodetic.latitude, pdrGeodetic.longitude);
      store.updatePDR({
        stepCount: this.stepDetector.getStepCount(),
        cadence: this.stepDetector.getCadence(),
        lastStepTime: stepEvent.timestamp,
        strideLength: stepEvent.strideLength,
        totalDistance: Number(this.stepDetector.getTotalDistance().toFixed(1)),
        localPos: { ...this.pdrLocalPos },
        geodeticPos: pdrGeodetic,
      });
    }

    // 7. GPS Outage Detection (Age > 4000ms triggers GPS_DENIED)
    const now = Date.now();
    const gpsAge = store.navState.gps ? now - store.navState.gps.timestamp : Infinity;

    if (gpsAge > 4000 && store.navState.mode === 'GPS_AIDED') {
      store.updateNavState({ mode: 'GPS_DENIED', gpsActive: false });
    }

    // 8. Update Store and UI Telemetry
    const ekfTelemetry = this.ekf.getTelemetry();
    const ekfPos = this.ekf.getPosition();
    const vel = this.ekf.getVelocity();

    let estimatedGeodetic = store.navState.estimatedPosition;
    if (this.origin) {
      estimatedGeodetic = enuToGeodetic(ekfPos.east, ekfPos.north, this.origin.latitude, this.origin.longitude);
      
      // If in GPS_DENIED mode, append EKF dead reckoning point to fused trail
      if (store.navState.mode === 'GPS_DENIED') {
        store.addFusedPoint(estimatedGeodetic.latitude, estimatedGeodetic.longitude);
      }
    }

    store.updateNavState({
      estimatedPosition: estimatedGeodetic,
      estimatedVelocity: { vn: vel.vn, ve: vel.ve },
      uncertainty: ekfTelemetry.uncertainty1Sigma,
      uncertainty2Sigma: ekfTelemetry.uncertainty2Sigma,
      quaternion: q,
      heading: headingDeg,
      headingType: this.attitudeEstimator.getHeadingType(),
      motionState,
      distanceTraveled: this.stepDetector.getTotalDistance(),
    });
    store.updateEKF(ekfTelemetry);

    store.updateDebug({
      rawAccel: sample.accel,
      calibratedAccel,
      linearAccelWorld,
      gravityVectorWorld,
      rawGyro: sample.gyro,
      calibratedGyro,
      quaternion: q,
      headingDeg,
      headingType: this.attitudeEstimator.getHeadingType(),
      motionState,
      motionVariance,
      pdrLocalPos: { east: Number(this.pdrLocalPos.east.toFixed(2)), north: Number(this.pdrLocalPos.north.toFixed(2)) },
      ekfLocalPos: { east: Number(ekfPos.east.toFixed(2)), north: Number(ekfPos.north.toFixed(2)) },
      gpsAgeMs: gpsAge === Infinity ? 0 : gpsAge,
    });

    // 9. Field Test State Machine Tick
    fieldTestManager.handleTick(
      store.navState.gpsActive,
      Math.hypot(vel.ve, vel.vn),
      ekfTelemetry.uncertainty1Sigma,
      ekfPos
    );

    // 10. Session Recording Frame
    sessionRecorder.recordFrame({
      timestamp: sample.timestamp,
      gps: store.navState.gps ? { lat: store.navState.gps.latitude, lon: store.navState.gps.longitude, accuracy: store.navState.gps.accuracy } : null,
      rawAccel: sample.accel,
      calibratedAccel,
      rawGyro: sample.gyro,
      quaternion: q,
      heading: headingDeg,
      motionState,
      stepEvent,
      pdrPos: { ...this.pdrLocalPos },
      ekfPos: { ...ekfPos },
    });
  }
}

export const navEngine = NavEngine.getInstance();
