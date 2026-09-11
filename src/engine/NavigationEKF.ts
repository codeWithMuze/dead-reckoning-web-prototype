import type { EKFTelemetry } from '../types';

export class NavigationEKF {
  // State: [posEast (m), posNorth (m), velEast (m/s), velNorth (m/s)]
  private x: [number, number, number, number] = [0, 0, 0, 0];

  // Covariance matrix P (4x4)
  private P: number[][] = [
    [4.0, 0.0, 0.0, 0.0],   // PosEast variance (m²)
    [0.0, 4.0, 0.0, 0.0],   // PosNorth variance (m²)
    [0.0, 0.0, 0.25, 0.0],  // VelEast variance (m²/s²)
    [0.0, 0.0, 0.0, 0.25],  // VelNorth variance (m²/s²)
  ];

  // Process noise baselines
  private readonly defaultAccelNoiseStd = 0.2; // m/s²
  private lastInnovation: [number, number] | null = null;
  private lastUpdateType: 'INIT' | 'PREDICT' | 'ZUPT' | 'GPS' | 'STEP' = 'INIT';

  constructor() {}

  public reset(initEast = 0, initNorth = 0) {
    this.x = [initEast, initNorth, 0, 0];
    this.P = [
      [4.0, 0.0, 0.0, 0.0],
      [0.0, 4.0, 0.0, 0.0],
      [0.0, 0.0, 0.25, 0.0],
      [0.0, 0.0, 0.0, 0.25],
    ];
    this.lastInnovation = null;
    this.lastUpdateType = 'INIT';
  }

  public getState(): [number, number, number, number] {
    return [...this.x];
  }

  public getPosition(): { east: number; north: number } {
    return { east: this.x[0], north: this.x[1] };
  }

  public getVelocity(): { ve: number; vn: number } {
    return { ve: this.x[2], vn: this.x[3] };
  }

  public getTelemetry(): EKFTelemetry {
    // 1-sigma positional uncertainty radius: sqrt(Var(E) + Var(N))
    const varE = Math.max(0, this.P[0][0]);
    const varN = Math.max(0, this.P[1][1]);
    const r1Sigma = Math.sqrt(varE + varN);

    return {
      state: [...this.x],
      uncertainty1Sigma: Number(r1Sigma.toFixed(2)),
      uncertainty2Sigma: Number((2 * r1Sigma).toFixed(2)),
      pDiag: [
        Number(this.P[0][0].toFixed(3)),
        Number(this.P[1][1].toFixed(3)),
        Number(this.P[2][2].toFixed(3)),
        Number(this.P[3][3].toFixed(3)),
      ],
      lastInnovation: this.lastInnovation ? [Number(this.lastInnovation[0].toFixed(2)), Number(this.lastInnovation[1].toFixed(2))] : null,
      lastUpdateType: this.lastUpdateType,
    };
  }

  /**
   * EKF Prediction Step:
   * x_{k|k-1} = F * x_{k-1} + B * u
   * P_{k|k-1} = F * P_{k-1} * F^T + Q
   */
  public predict(dt: number, aEastMps2: number, aNorthMps2: number, accelNoiseStd = this.defaultAccelNoiseStd) {
    if (dt <= 0 || dt > 1.0) return;

    const dt2 = 0.5 * dt * dt;

    // State propagation
    this.x[0] += this.x[2] * dt + dt2 * aEastMps2;
    this.x[1] += this.x[3] * dt + dt2 * aNorthMps2;
    this.x[2] += aEastMps2 * dt;
    this.x[3] += aNorthMps2 * dt;

    // Process noise matrix Q (continuous white noise acceleration model)
    const qA = accelNoiseStd * accelNoiseStd;
    const q11 = 0.25 * dt * dt * dt * dt * qA + 0.001;
    const q13 = 0.5 * dt * dt * dt * qA;
    const q33 = dt * dt * qA;

    // F * P * F^T calculation
    const p = this.P;
    const newP = [
      [
        p[0][0] + 2 * dt * p[0][2] + dt * dt * p[2][2] + q11,
        p[0][1] + dt * (p[0][3] + p[2][1]) + dt * dt * p[2][3],
        p[0][2] + dt * p[2][2] + q13,
        p[0][3] + dt * p[2][3],
      ],
      [
        p[1][0] + dt * (p[1][2] + p[3][0]) + dt * dt * p[3][2],
        p[1][1] + 2 * dt * p[1][3] + dt * dt * p[3][3] + q11,
        p[1][2] + dt * p[3][2],
        p[1][3] + dt * p[3][3] + q13,
      ],
      [
        p[2][0] + dt * p[2][2] + q13,
        p[2][1] + dt * p[2][3],
        p[2][2] + q33,
        p[2][3],
      ],
      [
        p[3][0] + dt * p[3][2],
        p[3][1] + dt * p[3][3] + q13,
        p[3][2],
        p[3][3] + q33,
      ],
    ];

    this.P = newP;
    this.lastUpdateType = 'PREDICT';
  }

  /**
   * ZUPT: Zero-Velocity Update Step
   * When the stationary classifier detects stationary state, velocity is updated with z = [0, 0]
   * H = [[0, 0, 1, 0], [0, 0, 0, 1]]
   */
  public updateZUPT(velocityNoiseStd = 0.05) {
    const R = velocityNoiseStd * velocityNoiseStd;

    // Measurement residual: z - H*x = [0 - vE, 0 - vN]
    const y0 = 0.0 - this.x[2];
    const y1 = 0.0 - this.x[3];

    // S = H * P * H^T + R = [[P22 + R, P23], [P32, P33 + R]]
    const S00 = this.P[2][2] + R;
    const S01 = this.P[2][3];
    const S10 = this.P[3][2];
    const S11 = this.P[3][3] + R;

    const det = S00 * S11 - S01 * S10;
    if (Math.abs(det) < 1e-12) return;

    const invDet = 1 / det;
    const invS00 = S11 * invDet;
    const invS01 = -S01 * invDet;
    const invS10 = -S10 * invDet;
    const invS11 = S00 * invDet;

    // K = P * H^T * inv(S) (4x2 matrix)
    const K: number[][] = [];
    for (let i = 0; i < 4; i++) {
      const PH0 = this.P[i][2];
      const PH1 = this.P[i][3];
      K.push([
        PH0 * invS00 + PH1 * invS10,
        PH0 * invS01 + PH1 * invS11,
      ]);
    }

    // State update: x = x + K * y
    for (let i = 0; i < 4; i++) {
      this.x[i] += K[i][0] * y0 + K[i][1] * y1;
    }

    // Covariance update: P = (I - K * H) * P
    this.applyMeasurementCovarianceUpdate(K, [2, 3]);

    this.lastInnovation = [y0, y1];
    this.lastUpdateType = 'ZUPT';
  }

  /**
   * PDR Step Constraint Update:
   * When PDR detects a discrete step, constrain EKF position toward PDR prediction
   */
  public updatePDRStep(pdrEast: number, pdrNorth: number, stepNoiseStd = 0.8) {
    this.updatePositionMeasurement(pdrEast, pdrNorth, stepNoiseStd, 'STEP');
  }

  /**
   * GPS Metric Measurement Update:
   * Converts GPS to local ENU and updates positions:
   * H = [[1, 0, 0, 0], [0, 1, 0, 0]]
   */
  public updateGPS(gpsEast: number, gpsNorth: number, accuracyMeters: number) {
    const measNoise = Math.max(1.5, accuracyMeters);
    this.updatePositionMeasurement(gpsEast, gpsNorth, measNoise, 'GPS');
  }

  private updatePositionMeasurement(
    zEast: number,
    zNorth: number,
    noiseStd: number,
    updateType: 'GPS' | 'STEP'
  ) {
    const R = noiseStd * noiseStd;

    // Innovation y = z - H * x
    const y0 = zEast - this.x[0];
    const y1 = zNorth - this.x[1];

    // Outlier rejection (chi-squared gate for GPS jumps > 50m when uncertainty is tight)
    const innovationDist = Math.sqrt(y0 * y0 + y1 * y1);
    const uncertaintyRadius = Math.sqrt(this.P[0][0] + this.P[1][1]);
    if (updateType === 'GPS' && innovationDist > 50.0 && uncertaintyRadius < 10.0) {
      // Reject wild GPS glitch
      return;
    }

    // S = H * P * H^T + R = [[P00 + R, P01], [P10, P11 + R]]
    const S00 = this.P[0][0] + R;
    const S01 = this.P[0][1];
    const S10 = this.P[1][0];
    const S11 = this.P[1][1] + R;

    const det = S00 * S11 - S01 * S10;
    if (Math.abs(det) < 1e-12) return;

    const invDet = 1 / det;
    const invS00 = S11 * invDet;
    const invS01 = -S01 * invDet;
    const invS10 = -S10 * invDet;
    const invS11 = S00 * invDet;

    // K = P * H^T * inv(S) (4x2 matrix)
    const K: number[][] = [];
    for (let i = 0; i < 4; i++) {
      const PH0 = this.P[i][0];
      const PH1 = this.P[i][1];
      K.push([
        PH0 * invS00 + PH1 * invS10,
        PH0 * invS01 + PH1 * invS11,
      ]);
    }

    // State update: x = x + K * y
    for (let i = 0; i < 4; i++) {
      this.x[i] += K[i][0] * y0 + K[i][1] * y1;
    }

    // Covariance update: P = (I - K * H) * P
    this.applyMeasurementCovarianceUpdate(K, [0, 1]);

    this.lastInnovation = [y0, y1];
    this.lastUpdateType = updateType;
  }

  /**
   * Updates P = (I - K * H) * P for a 4x2 gain matrix K observing state indices [h0, h1].
   */
  private applyMeasurementCovarianceUpdate(K: number[][], hIndices: [number, number]) {
    const [h0, h1] = hIndices;
    const p = this.P;
    const newP: number[][] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          const IKH_ik = (i === k ? 1 : 0) - (K[i][0] * (h0 === k ? 1 : 0) + K[i][1] * (h1 === k ? 1 : 0));
          sum += IKH_ik * p[k][j];
        }
        newP[i][j] = sum;
      }
    }

    // Symmetrize P to prevent numerical skew
    for (let i = 0; i < 4; i++) {
      for (let j = i; j < 4; j++) {
        const avg = 0.5 * (newP[i][j] + newP[j][i]);
        newP[i][j] = avg;
        newP[j][i] = avg;
      }
    }

    this.P = newP;
  }
}
