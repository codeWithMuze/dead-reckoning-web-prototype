// Earth radius in meters (WGS-84 mean equational radius)
export const R_EARTH = 6378137;

/**
 * Convert degrees to radians
 */
export const degToRad = (deg: number): number => deg * (Math.PI / 180);

/**
 * Convert radians to degrees
 */
export const radToDeg = (rad: number): number => rad * (180 / Math.PI);

/**
 * Converts Geodetic (Lat, Lon) into Local Tangent Plane (ENU: East, North in meters)
 * relative to a fixed local origin (lat0, lon0).
 */
export function geodeticToENU(
  latDeg: number,
  lonDeg: number,
  originLatDeg: number,
  originLonDeg: number
): { east: number; north: number } {
  const dLatRad = degToRad(latDeg - originLatDeg);
  const dLonRad = degToRad(lonDeg - originLonDeg);
  const meanLatRad = degToRad((latDeg + originLatDeg) * 0.5);

  const north = dLatRad * R_EARTH;
  const east = dLonRad * R_EARTH * Math.cos(meanLatRad);

  return { east, north };
}

/**
 * Converts Local Tangent Plane (ENU: East, North in meters) back to Geodetic (Lat, Lon)
 * relative to local origin (lat0, lon0).
 */
export function enuToGeodetic(
  eastMeters: number,
  northMeters: number,
  originLatDeg: number,
  originLonDeg: number
): { latitude: number; longitude: number } {
  const originLatRad = degToRad(originLatDeg);

  const dLatDeg = radToDeg(northMeters / R_EARTH);
  const dLonDeg = radToDeg(eastMeters / (R_EARTH * Math.cos(originLatRad)));

  return {
    latitude: originLatDeg + dLatDeg,
    longitude: originLonDeg + dLonDeg,
  };
}

/**
 * Updates latitude and longitude given a displacement in meters North/East
 */
export const offsetPosition = (lat: number, lon: number, dn: number, de: number) => {
  return enuToGeodetic(de, dn, lat, lon);
};

/**
 * Multiply 3x3 matrix by 3x1 vector
 */
export const multiplyMatrixVector = (matrix: number[][], vector: number[]): number[] => {
  return [
    matrix[0][0] * vector[0] + matrix[0][1] * vector[1] + matrix[0][2] * vector[2],
    matrix[1][0] * vector[0] + matrix[1][1] * vector[1] + matrix[1][2] * vector[2],
    matrix[2][0] * vector[0] + matrix[2][1] * vector[1] + matrix[2][2] * vector[2],
  ];
};

/**
 * Calculates mean and standard deviation of an array of numbers
 */
export function calcStats(values: number[]): { mean: number; variance: number; std: number } {
  if (values.length === 0) return { mean: 0, variance: 0, std: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / (values.length > 1 ? values.length - 1 : 1);
  return {
    mean,
    variance,
    std: Math.sqrt(variance),
  };
}

