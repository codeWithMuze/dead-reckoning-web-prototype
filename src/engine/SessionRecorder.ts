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
}

export const sessionRecorder = SessionRecorder.getInstance();
