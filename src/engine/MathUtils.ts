/**
 * Convert degrees to radians
 */
export const degToRad = (deg: number) => deg * (Math.PI / 180);

/**
 * Creates a rotation matrix from Euler angles (Z, X, Y ordering for phone axes)
 * alpha: Z axis (heading)
 * beta: X axis (pitch)
 * gamma: Y axis (roll)
 */
export const getRotationMatrix = (alpha: number, beta: number, gamma: number) => {
  const a = degToRad(alpha);
  const b = degToRad(beta);
  const g = degToRad(gamma);

  const cA = Math.cos(a);
  const sA = Math.sin(a);
  const cB = Math.cos(b);
  const sB = Math.sin(b);
  const cG = Math.cos(g);
  const sG = Math.sin(g);

  // Z-X-Y rotation matrix applied to column vectors
  return [
    [
      cA * cG - sA * sB * sG,
      -sA * cB,
      cA * sG + sA * sB * cG
    ],
    [
      sA * cG + cA * sB * sG,
      cA * cB,
      sA * sG - cA * sB * cG
    ],
    [
      -cB * sG,
      sB,
      cB * cG
    ]
  ];
};

/**
 * Multiply 3x3 matrix by 3x1 vector
 */
export const multiplyMatrixVector = (matrix: number[][], vector: number[]) => {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2]
  ];
};

// Earth radius in meters
const R_EARTH = 6378137;

/**
 * Updates latitude and longitude given a displacement in meters North/East
 */
export const offsetPosition = (lat: number, lon: number, dn: number, de: number) => {
  const dLat = dn / R_EARTH;
  const dLon = de / (R_EARTH * Math.cos(Math.PI * lat / 180));

  return {
    latitude: lat + dLat * (180 / Math.PI),
    longitude: lon + dLon * (180 / Math.PI)
  };
};

/**
 * Simple 1D Kalman Filter update step
 */
export const updateKF1D = (x: number, P: number, z: number, R: number) => {
  const K = P / (P + R);
  const xNew = x + K * (z - x);
  const PNew = (1 - K) * P;
  return { x: xNew, P: PNew };
};
