import type { Quaternion, Vector3D } from '../types';

export const IDENTITY_QUATERNION: Quaternion = { w: 1, x: 0, y: 0, z: 0 };

/**
 * Normalizes a quaternion to unit length.
 */
export function quatNormalize(q: Quaternion): Quaternion {
  const norm = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
  if (norm < 1e-12) return IDENTITY_QUATERNION;
  const inv = 1 / norm;
  return {
    w: q.w * inv,
    x: q.x * inv,
    y: q.y * inv,
    z: q.z * inv,
  };
}

/**
 * Quaternion multiplication (Hamilton product: q1 ⊗ q2).
 * Represents applying rotation q2 first, then q1.
 */
export function quatMultiply(q1: Quaternion, q2: Quaternion): Quaternion {
  return {
    w: q1.w * q2.w - q1.x * q2.x - q1.y * q2.y - q1.z * q2.z,
    x: q1.w * q2.x + q1.x * q2.w + q1.y * q2.z - q1.z * q2.y,
    y: q1.w * q2.y - q1.x * q2.z + q1.y * q2.w + q1.z * q2.x,
    z: q1.w * q2.z + q1.x * q2.y - q1.y * q2.x + q1.z * q2.w,
  };
}

/**
 * Quaternion conjugate (q* = [w, -x, -y, -z]).
 * For unit quaternions, this is the inverse rotation.
 */
export function quatConjugate(q: Quaternion): Quaternion {
  return { w: q.w, x: -q.x, y: -q.y, z: -q.z };
}

/**
 * Rotates a 3D vector from Body frame into World (ENU) frame:
 * v_W = q ⊗ [0, v_B] ⊗ q*
 */
export function quatRotateVector(q: Quaternion, v: Vector3D): Vector3D {
  // Optimized Rodrigues formula for quaternion-vector rotation
  const vx = v.x, vy = v.y, vz = v.z;
  const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

  // t = 2 * (q_xyz × v)
  const tx = 2 * (qy * vz - qz * vy);
  const ty = 2 * (qz * vx - qx * vz);
  const tz = 2 * (qx * vy - qy * vx);

  // v_rot = v + qw * t + (q_xyz × t)
  return {
    x: vx + qw * tx + (qy * tz - qz * ty),
    y: vy + qw * ty + (qz * tx - qx * tz),
    z: vz + qw * tz + (qx * ty - qy * tx),
  };
}

/**
 * Rotates a 3D vector from World (ENU) frame into Body frame:
 * v_B = q* ⊗ [0, v_W] ⊗ q
 */
export function quatRotateVectorInverse(q: Quaternion, v: Vector3D): Vector3D {
  return quatRotateVector(quatConjugate(q), v);
}

/**
 * Converts unit quaternion to a 3x3 Direction Cosine Matrix (DCM) R_b^w.
 * Rows/Columns map: v_W = R * v_B.
 */
export function quatToRotationMatrix(q: Quaternion): number[][] {
  const { w, x, y, z } = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;

  return [
    [1 - (yy + zz), xy - wz, xz + wy],
    [xy + wz, 1 - (xx + zz), yz - wx],
    [xz - wy, yz + wx, 1 - (xx + yy)],
  ];
}

/**
 * Constructs a quaternion from W3C Euler angles (alpha, beta, gamma in degrees).
 * Z-X-Y rotation sequence matching mobile browser device orientation standard.
 */
export function quatFromEulerW3C(alphaDeg: number, betaDeg: number, gammaDeg: number): Quaternion {
  const rad = Math.PI / 180;
  // Compass azimuth alpha is clockwise from North towards East.
  // In right-handed ENU (Z=Up), clockwise rotation around +Z has negative sign (-alpha).
  const a = -alphaDeg * rad;
  const b = betaDeg * rad;
  const g = gammaDeg * rad;

  const cA = Math.cos(a * 0.5), sA = Math.sin(a * 0.5);
  const cB = Math.cos(b * 0.5), sB = Math.sin(b * 0.5);
  const cG = Math.cos(g * 0.5), sG = Math.sin(g * 0.5);

  // q = q_z(a) * q_x(b) * q_y(g)
  const qZ: Quaternion = { w: cA, x: 0, y: 0, z: sA };
  const qX: Quaternion = { w: cB, x: sB, y: 0, z: 0 };
  const qY: Quaternion = { w: cG, x: 0, y: sG, z: 0 };

  return quatNormalize(quatMultiply(quatMultiply(qZ, qX), qY));
}

/**
 * Propagates quaternion forward in time using measured angular rate (rad/s).
 * Uses closed-form exponential map for rotational kinematics:
 * q(t + dt) = q(t) ⊗ [cos(|ω|dt/2), (ω/|ω|) * sin(|ω|dt/2)]
 */
export function quatPropagateGyro(q: Quaternion, omegaRadSec: Vector3D, dt: number): Quaternion {
  const wx = omegaRadSec.x;
  const wy = omegaRadSec.y;
  const wz = omegaRadSec.z;
  const normSq = wx * wx + wy * wy + wz * wz;

  if (normSq < 1e-10) {
    // Zero / negligible angular rate: no rotation
    return q;
  }

  const norm = Math.sqrt(normSq);
  const halfAngle = 0.5 * norm * dt;
  const sinFactor = Math.sin(halfAngle) / norm;

  const deltaQ: Quaternion = {
    w: Math.cos(halfAngle),
    x: wx * sinFactor,
    y: wy * sinFactor,
    z: wz * sinFactor,
  };

  return quatNormalize(quatMultiply(q, deltaQ));
}

/**
 * Extracts yaw heading in degrees clockwise from North [0, 360).
 * Projects phone longitudinal axis (Y-axis) into the horizontal (East-North) plane.
 */
export function quatGetYawHeading(q: Quaternion): number {
  // Body longitudinal forward axis is [0, 1, 0] in phone frame
  const forwardWorld = quatRotateVector(q, { x: 0, y: 1, z: 0 });
  
  // Angle clockwise from North (+Y) towards East (+X)
  // atan2(East, North)
  let headingRad = Math.atan2(forwardWorld.x, forwardWorld.y);
  let headingDeg = headingRad * (180 / Math.PI);
  if (headingDeg < 0) headingDeg += 360;
  return headingDeg;
}
