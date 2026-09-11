import type { SessionRecordFrame } from '../types';

export class SessionRecorder {
  private static instance: SessionRecorder;
  private isRecording = false;
  private recordedFrames: SessionRecordFrame[] = [];
  private readonly maxFrames = 15000; // ~5 minutes at 50Hz

  private constructor() {}

  public static getInstance(): SessionRecorder {
    if (!SessionRecorder.instance) {
      SessionRecorder.instance = new SessionRecorder();
    }
    return SessionRecorder.instance;
  }

  public start() {
    this.isRecording = true;
    this.recordedFrames = [];
  }

  public stop() {
    this.isRecording = false;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getFrameCount(): number {
    return this.recordedFrames.length;
  }

  public getRecordedFrames(): SessionRecordFrame[] {
    return [...this.recordedFrames];
  }

  public clear() {
    this.recordedFrames = [];
  }

  public recordFrame(frame: SessionRecordFrame) {
    if (!this.isRecording) return;
    if (this.recordedFrames.length < this.maxFrames) {
      this.recordedFrames.push(frame);
    }
  }

  public exportJSON() {
    if (this.recordedFrames.length === 0) {
      alert('No recorded session frames to export.');
      return;
    }

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.recordedFrames, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `navisense_session_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  public exportCSV() {
    if (this.recordedFrames.length === 0) {
      alert('No recorded session frames to export.');
      return;
    }

    const headers = [
      'timestamp',
      'gps_lat',
      'gps_lon',
      'gps_acc',
      'raw_ax',
      'raw_ay',
      'raw_az',
      'cal_ax',
      'cal_ay',
      'cal_az',
      'raw_gx',
      'raw_gy',
      'raw_gz',
      'qw',
      'qx',
      'qy',
      'qz',
      'heading',
      'motion_state',
      'step_number',
      'stride_m',
      'ml_correction_factor',
      'ml_corrected_stride',
      'pdr_east_m',
      'pdr_north_m',
      'ekf_east_m',
      'ekf_north_m',
    ];

    const rows = this.recordedFrames.map((f) => [
      f.timestamp,
      f.gps ? f.gps.lat : '',
      f.gps ? f.gps.lon : '',
      f.gps ? f.gps.accuracy : '',
      f.rawAccel.x,
      f.rawAccel.y,
      f.rawAccel.z,
      f.calibratedAccel.x,
      f.calibratedAccel.y,
      f.calibratedAccel.z,
      f.rawGyro.x,
      f.rawGyro.y,
      f.rawGyro.z,
      f.quaternion.w,
      f.quaternion.x,
      f.quaternion.y,
      f.quaternion.z,
      f.heading,
      f.motionState,
      f.stepEvent ? f.stepEvent.stepNumber : '',
      f.stepEvent ? f.stepEvent.strideLength : '',
      f.mlPrediction ? f.mlPrediction.correctionFactor : '',
      f.mlPrediction ? f.mlPrediction.correctedStride : '',
      f.pdrPos.east,
      f.pdrPos.north,
      f.ekfPos.east,
      f.ekfPos.north,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `navisense_session_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  }

  public exportMLFeaturesCSV() {
    const stepFrames = this.recordedFrames.filter((f) => f.stepEvent !== null && f.mlPrediction !== null);
    if (stepFrames.length === 0) {
      alert('No detected step features recorded in this session.');
      return;
    }

    const headers = [
      'timestamp',
      'step_number',
      'cadence',
      'accel_mean',
      'accel_var',
      'accel_swing',
      'gyro_mean',
      'gyro_var',
      'step_interval_s',
      'baseline_stride_m',
      'ml_correction_factor',
      'ml_corrected_stride_m',
      'ml_confidence',
      'is_fallback',
    ];

    const rows = stepFrames.map((f) => {
      const feat = f.mlPrediction!.features;
      return [
        f.timestamp,
        f.stepEvent!.stepNumber,
        feat.cadence,
        feat.accelMagnitudeMean,
        feat.accelMagnitudeVar,
        feat.accelSwing,
        feat.gyroMagnitudeMean,
        feat.gyroMagnitudeVar,
        feat.stepIntervalSec,
        feat.baselineWeinbergStride,
        f.mlPrediction!.correctionFactor,
        f.mlPrediction!.correctedStride,
        f.mlPrediction!.confidence,
        f.mlPrediction!.isFallback ? 1 : 0,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `navisense_ml_features_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  }
}

export const sessionRecorder = SessionRecorder.getInstance();
