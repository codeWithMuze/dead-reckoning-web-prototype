import type { Quaternion, Vector3D, HeadingType } from '../types';
import {
  IDENTITY_QUATERNION,
  quatNormalize,
  quatPropagateGyro,
  quatRotateVector,
  quatFromEulerW3C,
  quatGetYawHeading,
} from './Quaternion.ts';

export class AttitudeEstimator {
  private q: Quaternion = IDENTITY_QUATERNION;
  private headingType: HeadingType = 'RELATIVE';
  private hasInitializedFromOrientation = false;

  // Complementary filter gains
  // Beta factor determines how aggressively accelerometer tilt corrects roll/pitch
  private readonly tiltCorrectionGain = 0.02;

  constructor() {}

  public reset() {
    this.q = IDENTITY_QUATERNION;
    this.headingType = 'RELATIVE';
    this.hasInitializedFromOrientation = false;
  }

  public getQuaternion(): Quaternion {
    return { ...this.q };
  }

  public getHeadingType(): HeadingType {
    return this.headingType;
  }

  public getHeadingDeg(): number {
    return quatGetYawHeading(this.q);
  }

  /**
   * Called when browser orientation event is received.
   * Initializes initial attitude or gently guides yaw if absolute reference exists.
   */
  public handleOrientationEvent(alphaDeg: number, betaDeg: number, gammaDeg: number, absolute: boolean) {
    if (absolute) {
      this.headingType = 'ABSOLUTE';
    }

    if (!this.hasInitializedFromOrientation) {
      // First orientation sample: initialize attitude directly
      this.q = quatFromEulerW3C(alphaDeg, betaDeg, gammaDeg);
      this.hasInitializedFromOrientation = true;
      return;
    }

    // Continuous gentle heading correction from orientation reference (0.01 blend to prevent jumps)
    const targetQ = quatFromEulerW3C(alphaDeg, betaDeg, gammaDeg);
    // Spherical/linear blend towards target attitude for long-term yaw drift mitigation
    this.q = quatNormalize({
      w: this.q.w * 0.99 + targetQ.w * 0.01,
      x: this.q.x * 0.99 + targetQ.x * 0.01,
      y: this.q.y * 0.99 + targetQ.y * 0.01,
      z: this.q.z * 0.99 + targetQ.z * 0.01,
    });
  }

  /**
   * Main attitude update called at high frequency (50Hz) with calibrated gyro and accel.
   * 1. Propagates attitude using gyroscope rates: q_{k+1} = q_k ⊗ Δq(ω)
   * 2. When quasi-stationary (magnitude ~ 9.8m/s²), aligns pitch & roll with gravity.
   */
  public update(calibratedGyroRadSec: Vector3D, calibratedAccel: Vector3D, dt: number, isStationary: boolean): Quaternion {
    // 1. Gyroscope propagation
    this.q = quatPropagateGyro(this.q, calibratedGyroRadSec, dt);

    // 2. Accelerometer Tilt Stabilization (Complementary pitch/roll leveling)
    // Only perform leveling when motion acceleration is minimal (close to 1G)
    const accelNorm = Math.sqrt(
      calibratedAccel.x * calibratedAccel.x +
      calibratedAccel.y * calibratedAccel.y +
      calibratedAccel.z * calibratedAccel.z
    );

    // Check if acceleration is dominated by gravity (between 8.8 and 10.8 m/s²)
    if (isStationary || (accelNorm > 8.8 && accelNorm < 10.8)) {
      // Measured gravity unit vector in body frame
      const invNorm = 1 / accelNorm;
      const ax = calibratedAccel.x * invNorm;
      const ay = calibratedAccel.y * invNorm;
      const az = calibratedAccel.z * invNorm;

      // In world ENU, gravity points down: [0, 0, -1]
      // Rotate world gravity into body frame: g_body_est = q* ⊗ [0, 0, -1] ⊗ q
      const gx_est = 2 * (this.q.x * this.q.z - this.q.w * this.q.y);
      const gy_est = 2 * (this.q.y * this.q.z + this.q.w * this.q.x);
      const gz_est = this.q.w * this.q.w - this.q.x * this.q.x - this.q.y * this.q.y + this.q.z * this.q.z;

      // Error is cross product between measured gravity direction [-ax, -ay, -az] and estimated gravity
      const ex = (ay * -gz_est - az * -gy_est);
      const ey = (az * -gx_est - ax * -gz_est);
      const ez = (ax * -gy_est - ay * -gx_est);

      // Correction quaternion from tilt error
      const correctionAngle = this.tiltCorrectionGain * dt;
      const deltaQ: Quaternion = {
        w: 1.0,
        x: ex * correctionAngle,
        y: ey * correctionAngle,
        z: ez * correctionAngle,
      };

      this.q = quatNormalize({
        w: this.q.w + deltaQ.x * this.q.x,
        x: this.q.x + deltaQ.w * this.q.x + deltaQ.x * this.q.w,
        y: this.q.y + deltaQ.w * this.q.y + deltaQ.y * this.q.w,
        z: this.q.z + deltaQ.w * this.q.z + deltaQ.z * this.q.w,
      });
    }

    return this.q;
  }

  /**
   * Transforms body-frame acceleration vector into World (ENU) frame:
   * a_W = q ⊗ a_B ⊗ q*
   */
  public transformBodyToWorld(bodyAccel: Vector3D): Vector3D {
    return quatRotateVector(this.q, bodyAccel);
  }
}
