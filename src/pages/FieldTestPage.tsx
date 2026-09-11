import React, { useState, useEffect } from 'react';
import { useNavStore } from '../store/useNavStore.ts';
import { fieldTestManager, TEST_DEFINITIONS } from '../engine/FieldTestManager.ts';
import { calibrationManager } from '../engine/CalibrationManager.ts';
import type { TestId, FieldTestRecord, GroundTruthEntry } from '../types/fieldTest.ts';
import {
  FlaskConical,
  Play,
  Pause,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Footprints,
  FileSpreadsheet,
  FileCode,
} from 'lucide-react';

export const FieldTestPage: React.FC = () => {
  const { navState, calibration, latestSensor, gpsInputEnabled, setGpsInputEnabled } = useNavStore();
  const [selectedTestId, setSelectedTestId] = useState<TestId>('TEST-01');
  const [testStatus, setTestStatus] = useState(fieldTestManager.getStatus());
  const [elapsedSec, setElapsedSec] = useState(0);
  const [showGroundTruthModal, setShowGroundTruthModal] = useState(false);
  const [latestRecord, setLatestRecord] = useState<FieldTestRecord | null>(null);
  const [records, setRecords] = useState<FieldTestRecord[]>(fieldTestManager.getRecords());
  const [instructionsExpanded, setInstructionsExpanded] = useState(true);
  const [calibProgress, setCalibProgress] = useState<number>(0);
  const [isCalibrating, setIsCalibrating] = useState<boolean>(false);

  // Ground Truth Form inputs
  const [gtSteps, setGtSteps] = useState<string>('');
  const [gtDistance, setGtDistance] = useState<string>('');
  const [gtHeading, setGtHeading] = useState<string>('');
  const [gtDuration, setGtDuration] = useState<string>('30');

  // Sync test manager status and timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTestStatus(fieldTestManager.getStatus());
      setElapsedSec(fieldTestManager.getElapsedSeconds());
      setIsCalibrating(calibrationManager.isBusy());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Update default ground truth values strictly for selected test
  useEffect(() => {
    if (selectedTestId === 'TEST-01' || selectedTestId === 'TEST-02') {
      setGtSteps('');
      setGtDistance('');
      setGtHeading('');
      setGtDuration('30');
    } else if (selectedTestId === 'TEST-03') {
      setGtSteps('20');
      setGtDistance('');
      setGtHeading('0');
      setGtDuration('30');
    } else if (selectedTestId === 'TEST-04') {
      setGtSteps('50');
      setGtDistance('');
      setGtHeading('0');
      setGtDuration('60');
    } else if (selectedTestId === 'TEST-05') {
      setGtSteps('100');
      setGtDistance('');
      setGtHeading('0');
      setGtDuration('120');
    } else if (selectedTestId === 'TEST-06') {
      setGtDistance('20.0');
      setGtSteps('');
      setGtHeading('0');
      setGtDuration('30');
    } else if (selectedTestId === 'TEST-07') {
      setGtDistance('50.0');
      setGtSteps('');
      setGtHeading('0');
      setGtDuration('60');
    } else if (selectedTestId === 'TEST-08') {
      setGtDistance('40.0');
      setGtSteps('');
      setGtHeading('0');
      setGtDuration('60');
    } else if (selectedTestId === 'TEST-09' || selectedTestId === 'TEST-10') {
      setGtDuration('60');
      setGtDistance('');
      setGtSteps('');
      setGtHeading('');
    } else if (selectedTestId === 'TEST-ML-01') {
      setGtDistance('20.0');
      setGtSteps('');
      setGtHeading('0');
      setGtDuration('30');
    }
  }, [selectedTestId]);

  const activeDef = TEST_DEFINITIONS[selectedTestId];
  const sihSummary = fieldTestManager.getSIHSummary();
  const outagePhase = fieldTestManager.getOutagePhase();

  // Checklist status states
  const isHttps = typeof window !== 'undefined' && (window.isSecureContext || window.location.hostname === 'localhost');
  const hasMotion = latestSensor !== null;
  const hasGps = navState.gpsActive;
  const isCalibrated = calibration.calibrated;

  const handleStart = async () => {
    if (navState.isDemoMode) {
      alert('Field Test Mode requires LIVE DEVICE SENSORS. Please reload the app and click START LIVE SESSION.');
      return;
    }

    if (selectedTestId === 'TEST-01') {
      setCalibProgress(0);
      setIsCalibrating(true);
      calibrationManager.startCalibration(
        (p) => setCalibProgress(p),
        () => {
          setCalibProgress(100);
          setIsCalibrating(false);
        }
      );
    }

    const ok = await fieldTestManager.startTest(selectedTestId);
    if (ok) {
      setTestStatus('RUNNING');
      setLatestRecord(null);
    }
  };

  const handleRecalibrateNow = () => {
    setCalibProgress(0);
    setIsCalibrating(true);
    calibrationManager.startCalibration(
      (p) => setCalibProgress(p),
      () => {
        setCalibProgress(100);
        setIsCalibrating(false);
      }
    );
  };

  const handlePause = () => {
    fieldTestManager.pauseTest();
    setTestStatus('PAUSED');
  };

  const handleResume = () => {
    fieldTestManager.resumeTest();
    setTestStatus('RUNNING');
  };

  const handleStopRequest = () => {
    // Open Ground Truth entry modal so user confirms physical observations
    setShowGroundTruthModal(true);
  };

  const handleFinalizeStop = () => {
    const gt: GroundTruthEntry = {
      trueSteps: activeDef.groundTruthPrompts.steps && gtSteps ? Number(gtSteps) : undefined,
      trueDistanceMeters: activeDef.groundTruthPrompts.distance && gtDistance ? Number(gtDistance) : undefined,
      trueHeadingDeg: activeDef.groundTruthPrompts.heading && gtHeading ? Number(gtHeading) : undefined,
      knownDurationSec: activeDef.groundTruthPrompts.duration && gtDuration ? Number(gtDuration) : undefined,
      knownOutageDurationSec: (selectedTestId === 'TEST-09' || selectedTestId === 'TEST-10') && gtDuration ? Number(gtDuration) : undefined,
    };

    const record = fieldTestManager.stopTest(gt);
    setShowGroundTruthModal(false);
    setTestStatus('COMPLETED');
    if (record) {
      setLatestRecord(record);
      setRecords(fieldTestManager.getRecords());
    }
  };

  const handleReset = () => {
    fieldTestManager.resetTest();
    setTestStatus('IDLE');
    setElapsedSec(0);
    setLatestRecord(null);
    setCalibProgress(0);
    setIsCalibrating(false);
  };

  const handleDeleteRecord = (id: string) => {
    if (confirm('Delete this test record?')) {
      fieldTestManager.deleteRecord(id);
      setRecords(fieldTestManager.getRecords());
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all recorded field test history? This cannot be undone.')) {
      fieldTestManager.clearRecords();
      setRecords([]);
      setLatestRecord(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">SIH Field Validation Suite</h1>
          </div>
          <p className="text-xs text-muted mt-0.5">
            Standardized protocols, physical ground-truth benchmarking & empirical error certification
          </p>
        </div>

        <div className="flex items-center gap-2">
          {navState.isDemoMode ? (
            <div className="bg-warning/20 border border-warning/40 text-warning px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>SIMULATION ACTIVE (DISABLED)</span>
            </div>
          ) : (
            <div className="bg-success/20 border border-success/40 text-success px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-success animate-ping" />
              <span>LIVE DEVICE SENSORS ACTIVE</span>
            </div>
          )}
        </div>
      </div>

      {/* Demo Mode Blocking Notice */}
      {navState.isDemoMode && (
        <div className="bg-warning/10 border border-warning/40 rounded-xl p-4 text-warning text-xs flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-sm">Real-Device Scientific Validation Notice</strong>
            <p className="leading-relaxed">
              Field tests are strictly locked to <strong>Real Smartphone Sensor Mode</strong> to prevent simulated data from skewing validation results.
              Please reload the page and select <strong>"START LIVE SESSION"</strong> with your smartphone in hand.
            </p>
          </div>
        </div>
      )}

      {/* 1. Pre-Flight Live Checklist */}
      <div className="bg-panel border border-border rounded-xl p-3 sm:p-4 shadow-md">
        <span className="text-[10px] font-bold text-muted uppercase tracking-widest block mb-2">
          Pre-Flight Hardware Checklist
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs font-mono">
          <ChecklistBadge label="HTTPS Context" passed={isHttps} note={isHttps ? 'SECURE' : 'INSECURE'} />
          <ChecklistBadge label="Motion Sensor" passed={hasMotion} note={hasMotion ? 'STREAMING' : 'NO FEED'} />
          <ChecklistBadge label="Orientation" passed={navState.heading !== 0} note={navState.headingType} />
          <ChecklistBadge label="Stationary Cal" passed={isCalibrated} note={isCalibrated ? 'CALIBRATED' : 'DEFAULT'} />
          <ChecklistBadge label="GNSS Lock" passed={hasGps} note={hasGps ? `±${navState.gps?.accuracy.toFixed(1)}m` : 'SEARCHING'} />
          <ChecklistBadge label="WakeLock" passed={testStatus === 'RUNNING'} note={testStatus === 'RUNNING' ? 'AWAKE' : 'STANDBY'} />
          <ChecklistBadge label="Flight Rec" passed={testStatus === 'RUNNING'} note={testStatus === 'RUNNING' ? 'ARMED' : 'READY'} />
        </div>
      </div>

      {/* 2. Test Selection Carousel / Tabs */}
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-muted uppercase tracking-widest block">
          Select Standardized SIH Field Protocol
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.values(TEST_DEFINITIONS).map((def) => {
            const isSelected = def.id === selectedTestId;
            return (
              <button
                key={def.id}
                onClick={() => {
                  if (testStatus === 'RUNNING') {
                    alert('Cannot switch protocol while a test is running. Stop or reset the current test first.');
                    return;
                  }
                  setSelectedTestId(def.id);
                  setLatestRecord(null);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${
                  isSelected
                    ? 'bg-primary/20 border-primary text-white shadow-lg shadow-primary/10'
                    : 'bg-panel border-border text-gray-400 hover:border-gray-600 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-xs font-bold text-primary">{def.id}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-black/40 text-muted">{def.category}</span>
                </div>
                <span className="text-xs font-semibold text-gray-200 truncate w-full mt-1">{def.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Selected Protocol Details & Physical Instructions */}
      <div className="bg-panel border border-border rounded-xl p-4 shadow-lg space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">{activeDef.id}: {activeDef.name}</span>
            <span className="text-[10px] text-muted font-mono">({activeDef.category})</span>
          </div>
          <button
            onClick={() => setInstructionsExpanded(!instructionsExpanded)}
            className="text-xs text-muted hover:text-white flex items-center space-x-1 cursor-pointer"
          >
            <span>{instructionsExpanded ? 'Hide Guide' : 'Show Guide'}</span>
            {instructionsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {instructionsExpanded && (
          <div className="space-y-2 pt-2 border-t border-border text-xs text-gray-300">
            <p className="leading-relaxed"><strong className="text-white">Objective:</strong> {activeDef.description}</p>
            <div className="bg-background/60 border border-primary/20 rounded-lg p-3 space-y-1">
              <div className="text-[11px] font-bold text-primary flex items-center space-x-1.5">
                <Footprints className="w-3.5 h-3.5" />
                <span>Physical Execution Instructions:</span>
              </div>
              <p className="font-mono text-[11px] text-gray-300 leading-relaxed pl-5">
                {activeDef.physicalInstructions}
              </p>
            </div>
            <div className="text-[11px] text-muted font-mono flex items-center justify-between pt-1">
              <span>Pass Criteria: <strong className="text-gray-200">{activeDef.defaultPassCriteria}</strong></span>
            </div>

            {/* Clearly labeled badge for stationary protocols */}
            {(selectedTestId === 'TEST-01' || selectedTestId === 'TEST-02') && (
              <div className="bg-primary/10 border border-primary/30 text-primary px-3 py-2 rounded-lg text-xs font-mono font-bold flex items-center space-x-2 mt-2">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span>NO WALKING GROUND TRUTH REQUIRED (STATIONARY BENCH PROTOCOL)</span>
              </div>
            )}

            {/* Live Calibration Panel for TEST-01 */}
            {selectedTestId === 'TEST-01' && (
              <div className="space-y-2 pt-2 border-t border-border mt-2">
                {isCalibrating ? (
                  <div className="bg-background/80 border border-primary/40 rounded-xl p-3.5 space-y-2 font-mono text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-primary font-bold animate-pulse">Collecting Stationary IMU Samples...</span>
                      <span className="text-white font-bold">{calibProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary h-full transition-all duration-150" style={{ width: `${calibProgress}%` }} />
                    </div>
                    <p className="text-[11px] text-gray-400">Place phone flat on table. Sampling accelerometer & gyroscope bias offsets and noise floors...</p>
                  </div>
                ) : calibration.calibrated ? (
                  <div className="bg-background/80 border border-success/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                    <div>
                      <div className="text-success font-bold flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Stationary Sensor Calibration Active & Persisted</span>
                      </div>
                      <div className="text-[11px] text-gray-300 mt-0.5">
                        Gyro Bias: [x: {calibration.gyroBias.x.toFixed(3)}, y: {calibration.gyroBias.y.toFixed(3)}, z: {calibration.gyroBias.z.toFixed(3)}] rad/s | Accel Noise: ±{calibration.accelNoiseStd.toFixed(3)} m/s² | Gyro Noise: ±{calibration.gyroNoiseStd.toFixed(3)} rad/s
                      </div>
                    </div>
                    <button
                      onClick={handleRecalibrateNow}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-mono cursor-pointer"
                    >
                      Recalibrate IMU Now
                    </button>
                  </div>
                ) : (
                  <div className="bg-background/80 border border-warning/40 rounded-xl p-3.5 flex items-center justify-between font-mono text-xs">
                    <div className="space-y-0.5">
                      <span className="text-warning font-bold flex items-center space-x-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Uncalibrated (Using Default Factory Noise Offsets)</span>
                      </span>
                      <p className="text-[11px] text-gray-400">Place phone flat and motionless, then click Start Test to auto-calibrate.</p>
                    </div>
                    <button
                      onClick={handleRecalibrateNow}
                      className="px-3 py-1.5 bg-primary hover:bg-blue-600 text-white font-bold rounded-lg text-xs font-mono cursor-pointer shadow-md"
                    >
                      Calibrate Now
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Real-Time Test Control & Stop Watch */}
      <div className="bg-panel border border-border rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Stopwatch & Status */}
          <div className="flex items-baseline space-x-3">
            <div className="flex flex-col">
              <span className="text-[9px] text-muted font-bold uppercase tracking-widest">Elapsed Time</span>
              <span className="font-mono text-3xl sm:text-4xl font-extrabold text-white tracking-wider">
                {formatElapsed(elapsedSec)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${
                testStatus === 'RUNNING' ? 'bg-success animate-ping' :
                testStatus === 'PAUSED' ? 'bg-warning' :
                testStatus === 'COMPLETED' ? 'bg-primary' : 'bg-gray-600'
              }`} />
              <span className="font-mono text-xs font-bold text-gray-300">{testStatus}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {testStatus === 'IDLE' && (
              <button
                onClick={handleStart}
                disabled={navState.isDemoMode}
                className="min-h-[48px] px-6 bg-success hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center space-x-2 cursor-pointer shadow-lg shadow-success/20 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Test</span>
              </button>
            )}

            {testStatus === 'RUNNING' && (
              <>
                <button
                  onClick={handlePause}
                  className="min-h-[48px] px-4 bg-warning hover:bg-amber-600 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pause</span>
                </button>
                <button
                  onClick={handleStopRequest}
                  className="min-h-[48px] px-6 bg-danger hover:bg-rose-600 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center space-x-2 cursor-pointer shadow-lg shadow-danger/25"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop & Evaluate</span>
                </button>
              </>
            )}

            {testStatus === 'PAUSED' && (
              <>
                <button
                  onClick={handleResume}
                  className="min-h-[48px] px-6 bg-success hover:bg-emerald-600 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center space-x-2 cursor-pointer shadow-md"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Resume</span>
                </button>
                <button
                  onClick={handleStopRequest}
                  className="min-h-[48px] px-4 bg-danger hover:bg-rose-600 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center space-x-2 cursor-pointer shadow-md"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop</span>
                </button>
              </>
            )}

            {(testStatus === 'COMPLETED' || testStatus === 'PAUSED') && (
              <button
                onClick={handleReset}
                className="min-h-[48px] px-4 bg-background border border-border hover:bg-white/5 active:scale-95 text-gray-300 text-xs font-medium rounded-xl flex items-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Field Telemetry Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-2 border-t border-border">
          <TelemetryPill label="PDR STEPS" value={navState.pdr.stepCount} unit="steps" />
          <TelemetryPill label="PDR DISTANCE" value={navState.pdr.totalDistance.toFixed(2)} unit="m" />
          <TelemetryPill label="CADENCE" value={navState.pdr.cadence.toFixed(0)} unit="spm" />
          <TelemetryPill label="SPEED" value={Math.hypot(navState.estimatedVelocity.ve, navState.estimatedVelocity.vn).toFixed(2)} unit="m/s" />
          <TelemetryPill label="EKF UNCERTAINTY" value={navState.ekf.uncertainty1Sigma.toFixed(2)} unit="m" />
          <TelemetryPill label="HEADING" value={`${navState.heading.toFixed(0)}°`} unit={navState.headingType} />
        </div>

        {/* Guided GPS Outage Workflow Panel (Active for TEST-09 and TEST-10) */}
        {(selectedTestId === 'TEST-09' || selectedTestId === 'TEST-10') && (
          <div className="bg-background/70 border border-border rounded-xl p-3.5 space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted uppercase tracking-widest block">
                Guided GNSS Outage & Recovery State Machine
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                gpsInputEnabled ? 'bg-success/15 border-success/30 text-success' : 'bg-warning/20 border-warning/40 text-warning animate-pulse'
              }`}>
                GPS Input: {gpsInputEnabled ? 'ON' : 'OFF (SIMULATED)'}
              </span>
            </div>

            {/* Optional Application-Level GPS Input Gate Control for Testing */}
            <div className="bg-panel/90 border border-border/80 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-white uppercase tracking-wider block">
                  Optional Test Method: Application-Level GPS Input Disable
                </span>
                <span className="text-[11px] text-muted">
                  Simulate GPS loss via software gate without needing a physical RF shield.
                </span>
              </div>
              <button
                onClick={() => setGpsInputEnabled(!gpsInputEnabled)}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition-all cursor-pointer border ${
                  gpsInputEnabled 
                    ? 'bg-warning/20 border-warning/40 text-warning hover:bg-warning/30' 
                    : 'bg-success/20 border-success/40 text-success hover:bg-success/30'
                }`}
              >
                {gpsInputEnabled ? 'DISABLE GPS INPUT' : 'ENABLE GPS INPUT'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              {/* Phase 1 */}
              <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                outagePhase === 'BASELINE_LOCKED' ? 'bg-primary/20 border-primary text-white' : 'bg-black/20 border-border text-muted'
              }`}>
                <span className="w-2 h-2 rounded-full bg-primary" />
                <div>
                  <div className="font-bold text-[11px]">Phase 1: Baseline</div>
                  <div className="text-[10px]">{navState.gpsActive ? 'GPS LOCKED' : 'SEARCHING FIX'}</div>
                </div>
              </div>

              {/* Phase 2 */}
              <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                outagePhase === 'OUTAGE_COASTING' ? 'bg-warning/20 border-warning text-warning animate-pulse' : 'bg-black/20 border-border text-muted'
              }`}>
                <span className="w-2 h-2 rounded-full bg-warning" />
                <div>
                  <div className="font-bold text-[11px]">Phase 2: GPS Outage</div>
                  <div className="text-[10px]">{!navState.gpsActive ? 'PDR COASTING' : 'WAITING OUTAGE'}</div>
                </div>
              </div>

              {/* Phase 3 */}
              <div className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                outagePhase === 'REACQUIRED' ? 'bg-success/20 border-success text-success' : 'bg-black/20 border-border text-muted'
              }`}>
                <span className="w-2 h-2 rounded-full bg-success" />
                <div>
                  <div className="font-bold text-[11px]">Phase 3: Reacquired</div>
                  <div className="text-[10px]">
                    {outagePhase === 'REACQUIRED' ? `REACQUIRED (Inno: ${latestRecord?.errors.gpsReacquisitionInnovationM || 0}m)` : 'WAITING RECOVERY'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Instant Test Report Card (Rendered immediately upon test completion) */}
      {latestRecord && (
        <div className="bg-panel border-2 border-primary/50 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-primary">{latestRecord.testId}</span>
              <h2 className="text-base sm:text-lg font-bold text-white">{latestRecord.testName}</h2>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider font-mono flex items-center space-x-2 ${
              latestRecord.passed ? 'bg-success text-white shadow-lg shadow-success/30' : 'bg-danger text-white shadow-lg shadow-danger/30'
            }`}>
              {latestRecord.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{latestRecord.passed ? 'VALIDATION PASS' : 'VALIDATION FAIL'}</span>
            </div>
          </div>

          {/* Side-by-Side Comparison: Measured vs Ground Truth */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            {/* Column 1: Measured Telemetry */}
            <div className="bg-background/60 border border-border rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider block border-b border-border pb-1">
                Measured Telemetry (Sensors)
              </span>
              <div className="space-y-1">
                <div className="flex justify-between"><span>Duration:</span><span className="text-white">{latestRecord.durationSec}s</span></div>

                {latestRecord.testId === 'TEST-01' ? (
                  <>
                    <div className="flex justify-between"><span>Gyro Bias Norm:</span><span className="text-white font-bold">{latestRecord.measured.gyroBiasNorm ?? 0} rad/s</span></div>
                    <div className="flex justify-between"><span>Accel Noise Std:</span><span className="text-white font-bold">{latestRecord.measured.accelNoiseStd ?? 0} m/s²</span></div>
                    <div className="flex justify-between"><span>Gyro Noise Std:</span><span className="text-gray-300">{latestRecord.measured.gyroNoiseStd ?? 0} rad/s</span></div>
                    <div className="flex justify-between"><span>Inertial Drift:</span><span className="text-white font-bold">{latestRecord.measured.pdrDisplacementMeters}m</span></div>
                    <div className="flex justify-between"><span>GPS Wander:</span><span className="text-gray-300">{latestRecord.measured.gpsDisplacementMeters !== null && latestRecord.measured.gpsDisplacementMeters !== undefined ? `${latestRecord.measured.gpsDisplacementMeters}m` : 'None'}</span></div>
                    <div className="flex justify-between"><span>Total EKF FDE:</span><span className="text-white font-bold">{latestRecord.measured.fdeMeters}m</span></div>
                  </>
                ) : latestRecord.testId === 'TEST-02' ? (
                  <>
                    <div className="flex justify-between"><span>Max Speed:</span><span className="text-white font-bold">{latestRecord.measured.maxSpeedMps} m/s</span></div>
                    <div className="flex justify-between"><span>Final Velocity:</span><span className="text-white font-bold">{latestRecord.measured.finalVelocityMps ?? 0} m/s</span></div>
                    <div className="flex justify-between"><span>ZUPT Activation:</span><span className="text-white font-bold">{latestRecord.measured.zuptActivationPct ?? 100}%</span></div>
                    <div className="flex justify-between"><span>Inertial Movement:</span><span className="text-white font-bold">{latestRecord.measured.pdrDisplacementMeters}m</span></div>
                    <div className="flex justify-between"><span>GPS Wander:</span><span className="text-gray-300">{latestRecord.measured.gpsDisplacementMeters !== null && latestRecord.measured.gpsDisplacementMeters !== undefined ? `${latestRecord.measured.gpsDisplacementMeters}m` : 'None'}</span></div>
                    <div className="flex justify-between"><span>Total EKF FDE:</span><span className="text-white font-bold">{latestRecord.measured.fdeMeters}m</span></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between"><span>Steps:</span><span className="text-white font-bold">{latestRecord.measured.steps}</span></div>
                    <div className="flex justify-between"><span>PDR Distance:</span><span className="text-white font-bold">{latestRecord.measured.distanceMeters}m</span></div>
                    <div className="flex justify-between"><span>Cadence:</span><span className="text-gray-300">{latestRecord.measured.cadence} spm</span></div>
                    <div className="flex justify-between"><span>Final FDE:</span><span className="text-white font-bold">{latestRecord.measured.fdeMeters}m</span></div>
                    {latestRecord.outageType && (
                      <div className="flex justify-between">
                        <span>Outage Type:</span>
                        <span className={latestRecord.outageType === 'APPLICATION_INPUT_DISABLED' ? 'text-warning font-bold' : 'text-primary font-bold'}>
                          {latestRecord.outageType === 'APPLICATION_INPUT_DISABLED' ? 'APP INPUT GATED' : 'PHYSICAL GNSS LOSS'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between"><span>1σ Uncertainty:</span><span className="text-gray-300">±{latestRecord.measured.finalUncertainty1Sigma}m</span></div>
                  </>
                )}
              </div>
            </div>

            {/* Column 2: Physical Ground Truth */}
            <div className="bg-background/60 border border-border rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block border-b border-border pb-1">
                Physical Ground Truth
              </span>
              <div className="space-y-1">
                {latestRecord.testId === 'TEST-01' ? (
                  <>
                    <div className="flex justify-between"><span>Bench Posture:</span><span className="text-gray-200">Flat, Motionless</span></div>
                    <div className="flex justify-between"><span>Ideal Gyro Bias:</span><span className="text-white font-bold">0.0000 rad/s</span></div>
                    <div className="flex justify-between"><span>Ideal Dynamic a:</span><span className="text-white font-bold">0.0000 m/s²</span></div>
                    <div className="flex justify-between"><span>Known Duration:</span><span className="text-gray-300">{latestRecord.groundTruth.knownDurationSec || latestRecord.durationSec}s</span></div>
                    <div className="flex justify-between"><span>Device:</span><span className="text-gray-300">{latestRecord.device}</span></div>
                  </>
                ) : latestRecord.testId === 'TEST-02' ? (
                  <>
                    <div className="flex justify-between"><span>Physical Posture:</span><span className="text-gray-200">Flat, Motionless</span></div>
                    <div className="flex justify-between"><span>True Speed:</span><span className="text-white font-bold">0.00 m/s</span></div>
                    <div className="flex justify-between"><span>True Displacement:</span><span className="text-white font-bold">0.00 m</span></div>
                    <div className="flex justify-between"><span>Known Duration:</span><span className="text-gray-300">{latestRecord.groundTruth.knownDurationSec || latestRecord.durationSec}s</span></div>
                    <div className="flex justify-between"><span>Device:</span><span className="text-gray-300">{latestRecord.device}</span></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between"><span>Known Duration:</span><span className="text-gray-300">{latestRecord.groundTruth.knownDurationSec || '---'}s</span></div>
                    {latestRecord.groundTruth.trueSteps !== undefined && (
                      <div className="flex justify-between"><span>True Steps:</span><span className="text-white font-bold">{latestRecord.groundTruth.trueSteps}</span></div>
                    )}
                    {latestRecord.groundTruth.trueDistanceMeters !== undefined && (
                      <div className="flex justify-between"><span>Tape Distance:</span><span className="text-white font-bold">{latestRecord.groundTruth.trueDistanceMeters}m</span></div>
                    )}
                    {latestRecord.groundTruth.knownOutageDurationSec !== undefined && (
                      <div className="flex justify-between"><span>Outage Duration:</span><span className="text-white font-bold">{latestRecord.groundTruth.knownOutageDurationSec}s</span></div>
                    )}
                    <div className="flex justify-between"><span>True Heading:</span><span className="text-gray-300">{latestRecord.groundTruth.trueHeadingDeg !== undefined ? `${latestRecord.groundTruth.trueHeadingDeg}°` : '---'}</span></div>
                    <div className="flex justify-between"><span>Environment:</span><span className="text-gray-300">{latestRecord.device}</span></div>
                  </>
                )}
              </div>
            </div>

            {/* Column 3: Error Calculations & Criteria */}
            <div className="bg-background/60 border border-border rounded-xl p-3.5 space-y-2">
              <span className="text-[10px] font-bold text-warning uppercase tracking-wider block border-b border-border pb-1">
                Calculated Error Metrics
              </span>
              <div className="space-y-1">
                {latestRecord.testId === 'TEST-01' ? (
                  <>
                    <div className="flex justify-between">
                      <span>Gyro Bias Status:</span>
                      <span className={`font-bold ${latestRecord.errors.gyroBiasNorm !== undefined && latestRecord.errors.gyroBiasNorm < 0.03 ? 'text-success' : 'text-danger'}`}>
                        {latestRecord.errors.gyroBiasNorm !== undefined && latestRecord.errors.gyroBiasNorm < 0.03 ? 'PASS (< 0.03 rad/s)' : 'FAIL'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accel Noise:</span>
                      <span className={`font-bold ${latestRecord.errors.accelNoiseStd !== undefined && latestRecord.errors.accelNoiseStd < 0.15 ? 'text-success' : 'text-danger'}`}>
                        {latestRecord.errors.accelNoiseStd !== undefined && latestRecord.errors.accelNoiseStd < 0.15 ? 'PASS (< 0.15 m/s²)' : 'FAIL'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gyro Noise:</span>
                      <span className={`font-bold ${latestRecord.errors.gyroNoiseStd !== undefined && latestRecord.errors.gyroNoiseStd < 0.04 ? 'text-success' : 'text-danger'}`}>
                        {latestRecord.errors.gyroNoiseStd !== undefined && latestRecord.errors.gyroNoiseStd < 0.04 ? 'PASS (< 0.04 rad/s)' : 'FAIL'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Calibration Saved:</span>
                      <span className="text-success font-bold">{latestRecord.calibrationState}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inertial Drift:</span>
                      <span className="text-white font-bold">{latestRecord.errors.inertialDriftMPerMin ?? 0} m/min</span>
                    </div>
                  </>
                ) : latestRecord.testId === 'TEST-02' ? (
                  <>
                    <div className="flex justify-between">
                      <span>Speed Clamp:</span>
                      <span className={`font-bold ${latestRecord.measured.maxSpeedMps < 0.08 ? 'text-success' : 'text-danger'}`}>
                        {latestRecord.measured.maxSpeedMps < 0.08 ? 'PASS (< 0.08 m/s)' : 'FAIL'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Final Velocity:</span>
                      <span className={`font-bold ${(latestRecord.measured.finalVelocityMps || 0) < 0.03 ? 'text-success' : 'text-danger'}`}>
                        {(latestRecord.measured.finalVelocityMps || 0) < 0.03 ? 'PASS (< 0.03 m/s)' : 'FAIL'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inertial Drift:</span>
                      <span className={`font-bold ${latestRecord.measured.pdrDisplacementMeters < 0.05 ? 'text-success' : 'text-danger'}`}>
                        {latestRecord.measured.pdrDisplacementMeters < 0.05 ? 'PASS (0.00m)' : 'FAIL'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>ZUPT Engagement:</span>
                      <span className={`font-bold ${(latestRecord.measured.zuptActivationPct || 100) >= 90 ? 'text-success' : 'text-warning'}`}>
                        {(latestRecord.measured.zuptActivationPct || 100) >= 90 ? 'PASS' : 'WARN'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {latestRecord.errors.stepAccuracyPct !== undefined && (
                      <div className="flex justify-between">
                        <span>Step Accuracy:</span>
                        <span className={`font-bold ${latestRecord.errors.stepAccuracyPct >= 90 ? 'text-success' : 'text-warning'}`}>
                          {latestRecord.errors.stepAccuracyPct}%
                        </span>
                      </div>
                    )}
                    {latestRecord.errors.stepError !== undefined && (
                      <div className="flex justify-between">
                        <span>Step Error:</span>
                        <span className="text-white font-bold">{latestRecord.errors.stepError} steps</span>
                      </div>
                    )}
                    {latestRecord.errors.distanceErrorPct !== undefined && (
                      <div className="flex justify-between">
                        <span>Distance Error:</span>
                        <span className={`font-bold ${latestRecord.errors.distanceErrorPct <= 10 ? 'text-success' : 'text-warning'}`}>
                          {latestRecord.errors.distanceErrorPct}% ({latestRecord.errors.distanceErrorMeters}m)
                        </span>
                      </div>
                    )}
                    {latestRecord.errors.driftRateMPerMin !== undefined && (
                      <div className="flex justify-between">
                        <span>Drift Rate:</span>
                        <span className="text-white font-bold">{latestRecord.errors.driftRateMPerMin} m/min</span>
                      </div>
                    )}
                    {latestRecord.errors.gpsOutageLatencyMs !== undefined && (
                      <div className="flex justify-between">
                        <span>Outage Latency:</span>
                        <span className="text-white font-bold">{latestRecord.errors.gpsOutageLatencyMs} ms</span>
                      </div>
                    )}
                    {latestRecord.errors.gpsReacquisitionInnovationM !== undefined && (
                      <div className="flex justify-between">
                        <span>Reacq Inno:</span>
                        <span className="text-white font-bold">{latestRecord.errors.gpsReacquisitionInnovationM} m</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Drift Decomposition Banner for Stationary Tests */}
          {(latestRecord.testId === 'TEST-01' || latestRecord.testId === 'TEST-02') && (
            <div className="bg-background/80 border border-primary/25 rounded-xl p-3 font-mono text-xs space-y-1">
              <span className="text-primary font-bold block uppercase tracking-wider text-[10px]">
                Motion Breakdown: GPS Wander vs Inertial PDR Displacement
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="p-2 rounded bg-black/30 border border-border/50">
                  <span className="text-muted block text-[10px]">Inertial PDR Movement:</span>
                  <span className="font-bold text-success text-sm">{latestRecord.measured.pdrDisplacementMeters} m</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Clamped by ZUPT / Motion Classifier</span>
                </div>
                <div className="p-2 rounded bg-black/30 border border-border/50">
                  <span className="text-muted block text-[10px]">GPS-Induced Movement:</span>
                  <span className="font-bold text-warning text-sm">
                    {latestRecord.measured.gpsDisplacementMeters !== null && latestRecord.measured.gpsDisplacementMeters !== undefined
                      ? `${latestRecord.measured.gpsDisplacementMeters} m`
                      : 'None (GPS Denied)'}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Raw smartphone GNSS multipath wander</span>
                </div>
                <div className="p-2 rounded bg-black/30 border border-border/50">
                  <span className="text-muted block text-[10px]">Total EKF FDE:</span>
                  <span className="font-bold text-white text-sm">{latestRecord.measured.fdeMeters} m</span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">Displacement relative to start</span>
                </div>
              </div>
              {latestRecord.measured.gpsDisplacementMeters && latestRecord.measured.gpsDisplacementMeters > 0.5 ? (
                <p className="text-[10px] text-gray-400 pt-1 leading-relaxed">
                  Notice: During stationary testing with GPS active, smartphone GNSS jitter shifts the Kalman position estimate ({latestRecord.measured.fdeMeters}m), while the dead-reckoning PDR engine correctly detects zero steps and preserves {latestRecord.measured.pdrDisplacementMeters}m displacement.
                </p>
              ) : null}
            </div>
          )}

          {/* ML Adaptive vs Baseline PDR A/B Banner */}
          {(latestRecord.testId === 'TEST-ML-01' || latestRecord.errors.mlImprovementPct !== undefined) && (
            <div className="bg-background/80 border border-purple-500/30 rounded-xl p-3 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-purple-400 font-bold block uppercase tracking-wider text-[10px]">
                  On-Device ML vs Deterministic Baseline A/B Comparison
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  SIH 26168 AI/ML Engine
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="p-2.5 rounded bg-black/30 border border-border/50 space-y-1">
                  <span className="text-muted block text-[10px]">Baseline Weinberg PDR:</span>
                  <span className="font-bold text-white text-sm">
                    {latestRecord.measured.mlBaselineDistanceMeters ?? latestRecord.measured.distanceMeters} m
                  </span>
                  <div className="text-[10px] text-gray-400">
                    Error: <span className="font-semibold text-warning">{latestRecord.errors.distanceErrorPct ?? '---'}%</span> ({latestRecord.errors.distanceErrorMeters ?? '---'}m)
                  </div>
                </div>
                <div className="p-2.5 rounded bg-purple-950/20 border border-purple-500/40 space-y-1">
                  <span className="text-purple-300 block text-[10px] font-semibold">ML Adaptive Stride PDR:</span>
                  <span className="font-bold text-success text-sm">
                    {latestRecord.measured.mlCorrectedDistanceMeters ?? latestRecord.measured.distanceMeters} m
                  </span>
                  <div className="text-[10px] text-gray-300">
                    Error: <span className="font-semibold text-success">{latestRecord.errors.mlDistanceErrorPct ?? latestRecord.errors.distanceErrorPct}%</span> ({latestRecord.errors.mlDistanceErrorMeters ?? latestRecord.errors.distanceErrorMeters}m)
                  </div>
                </div>
                <div className="p-2.5 rounded bg-black/30 border border-border/50 space-y-1">
                  <span className="text-muted block text-[10px]">Error Reduction:</span>
                  <span className={`font-bold text-sm ${
                    (latestRecord.errors.mlImprovementPct ?? 0) >= 0 ? 'text-success' : 'text-danger'
                  }`}>
                    {(latestRecord.errors.mlImprovementPct ?? 0) >= 0 ? '+' : ''}
                    {latestRecord.errors.mlImprovementPct ?? 0}%
                  </span>
                  <div className="text-[10px] text-gray-400">
                    Fallbacks: <span className="text-white font-mono">{latestRecord.measured.mlFallbackCount || 0}</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 pt-0.5 leading-relaxed">
                Adaptive error correction dynamically standardizes 8 inertial gait features at 50Hz and multiplies Weinberg baseline stride by neural factor c ∈ [0.70, 1.30].
              </p>
            </div>
          )}

          <div className="text-[11px] font-mono text-muted bg-background/40 p-2.5 rounded-lg border border-border flex justify-between items-center">
            <span>Pass Rule: <strong>{latestRecord.passCriteria}</strong></span>
            <span>Recorded: {latestRecord.formattedDate}</span>
          </div>
        </div>
      )}

      {/* 6. SIH Summary Dossier (Aggregates completed physical trials) */}
      <div className="bg-panel border border-border rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">SIH Summary Dossier (Empirical Evidence)</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fieldTestManager.exportCSV()}
              className="px-3 py-1 bg-background border border-border hover:bg-white/5 text-gray-300 rounded-lg text-xs font-mono flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => fieldTestManager.exportJSON()}
              className="px-3 py-1 bg-background border border-border hover:bg-white/5 text-gray-300 rounded-lg text-xs font-mono flex items-center space-x-1 cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {!sihSummary.hasMeasurements ? (
          <div className="bg-background/40 border border-dashed border-border rounded-xl p-6 text-center text-muted font-mono text-xs space-y-1">
            <span className="font-bold text-gray-400 block tracking-widest uppercase">NO MEASUREMENTS AVAILABLE</span>
            <p className="text-[11px] text-gray-500">
              In accordance with SIH evaluation integrity, summary statistics are only computed from physical trials you execute.
              Select a protocol above and click "Start Test" to log real empirical data.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 font-mono text-xs">
            <MetricSummaryCard label="TRIALS LOGGED" value={sihSummary.totalTrials} unit="tests" highlight="text-primary" />
            <MetricSummaryCard
              label="MEAN STEP ACCURACY"
              value={sihSummary.meanStepAccuracyPct !== null ? `${sihSummary.meanStepAccuracyPct}%` : '---'}
              unit=""
              highlight={sihSummary.meanStepAccuracyPct && sihSummary.meanStepAccuracyPct >= 90 ? 'text-success' : 'text-white'}
            />
            <MetricSummaryCard
              label="MEAN DIST ERROR"
              value={sihSummary.meanDistanceErrorPct !== null ? `${sihSummary.meanDistanceErrorPct}%` : '---'}
              unit=""
              highlight={sihSummary.meanDistanceErrorPct && sihSummary.meanDistanceErrorPct <= 10 ? 'text-success' : 'text-white'}
            />
            <MetricSummaryCard
              label="MEAN FDE"
              value={sihSummary.meanFdeMeters !== null ? `${sihSummary.meanFdeMeters}m` : '---'}
              unit=""
            />
            <MetricSummaryCard
              label="MEAN DRIFT RATE"
              value={sihSummary.meanDriftRateMPerMin !== null ? `${sihSummary.meanDriftRateMPerMin}` : '---'}
              unit="m/min"
            />
            <MetricSummaryCard
              label="MEAN OUTAGE LATENCY"
              value={sihSummary.meanGpsOutageLatencyMs !== null ? `${sihSummary.meanGpsOutageLatencyMs}` : '---'}
              unit="ms"
            />
          </div>
        )}
      </div>

      {/* 7. Historical Records Table */}
      {records.length > 0 && (
        <div className="bg-panel border border-border rounded-xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Recorded Test History ({records.length} Trials)
            </span>
            <button
              onClick={handleClearAll}
              className="text-xs text-danger hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-border text-muted text-[10px] uppercase">
                <tr>
                  <th className="p-2">ID</th>
                  <th className="p-2">Test</th>
                  <th className="p-2">Duration</th>
                  <th className="p-2">Steps (Meas/GT)</th>
                  <th className="p-2">Dist (Meas/GT)</th>
                  <th className="p-2">Accuracy / Metrics</th>
                  <th className="p-2">Result</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {records.map((rec) => (
                  <tr key={rec.recordId} className="hover:bg-white/5 transition-colors">
                    <td className="p-2 text-primary font-bold">{rec.testId}</td>
                    <td className="p-2 text-white truncate max-w-[140px]">{rec.testName}</td>
                    <td className="p-2 text-gray-300">{rec.durationSec}s</td>
                    <td className="p-2 text-gray-300">
                      {rec.testId === 'TEST-01' || rec.testId === 'TEST-02' ? (
                        <span className="text-muted">0 (Stationary)</span>
                      ) : (
                        `${rec.measured.steps} / ${rec.groundTruth.trueSteps ?? '---'}`
                      )}
                    </td>
                    <td className="p-2 text-gray-300">
                      {rec.testId === 'TEST-01' || rec.testId === 'TEST-02' ? (
                        <span className="text-muted">0.0m (Stationary)</span>
                      ) : (
                        `${rec.measured.distanceMeters}m / ${rec.groundTruth.trueDistanceMeters ? `${rec.groundTruth.trueDistanceMeters}m` : '---'}`
                      )}
                    </td>
                    <td className="p-2">
                      {rec.testId === 'TEST-01' ? (
                        <span className="text-success">Bias: {rec.measured.gyroBiasNorm ?? 0} rad/s</span>
                      ) : rec.testId === 'TEST-02' ? (
                        <span className="text-success">Speed: {rec.measured.maxSpeedMps} m/s</span>
                      ) : rec.testId === 'TEST-ML-01' ? (
                        <span className="text-purple-400 font-semibold">
                          ML: {rec.errors.mlDistanceErrorPct ?? rec.errors.distanceErrorPct}% err {rec.errors.mlImprovementPct !== undefined ? `(${rec.errors.mlImprovementPct >= 0 ? `+${rec.errors.mlImprovementPct}%` : `${rec.errors.mlImprovementPct}%`})` : ''}
                        </span>
                      ) : rec.errors.stepAccuracyPct !== undefined ? (
                        <span className="text-success">{rec.errors.stepAccuracyPct}% acc</span>
                      ) : rec.errors.distanceErrorPct !== undefined ? (
                        <span className="text-warning">{rec.errors.distanceErrorPct}% err</span>
                      ) : (
                        <span className="text-muted">FDE: {rec.measured.fdeMeters}m</span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        rec.passed ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                      }`}>
                        {rec.passed ? 'PASS' : 'FAIL'}
                      </span>
                    </td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => handleDeleteRecord(rec.recordId)}
                        className="p-1 text-muted hover:text-danger cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ground Truth Entry Modal */}
      {showGroundTruthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-panel border border-border rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">Physical Ground-Truth Entry</h3>
                <p className="text-xs text-muted">Enter physical measured truth to evaluate mathematical errors</p>
              </div>
              <button
                onClick={() => setShowGroundTruthModal(false)}
                className="text-muted hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Stationary Notice for TEST-01 and TEST-02 */}
              {(selectedTestId === 'TEST-01' || selectedTestId === 'TEST-02') && (
                <div className="bg-primary/10 border border-primary/30 rounded-xl p-3.5 space-y-1">
                  <div className="flex items-center space-x-1.5 text-primary font-bold text-xs font-mono">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>NO WALKING GROUND TRUTH REQUIRED</span>
                  </div>
                  <p className="text-[11px] text-gray-300 font-mono leading-relaxed">
                    This is a stationary bench test. Accelerometer/gyroscope biases, noise floors, velocity clamping, and stationary drift are calculated directly from physical sensor streams. No steps or tape-measured distances are required.
                  </p>
                </div>
              )}

              {activeDef.groundTruthPrompts.steps && (
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">
                    Physical Step Count (Counted Aloud)
                  </label>
                  <input
                    type="number"
                    value={gtSteps}
                    onChange={(e) => setGtSteps(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2 text-white font-mono text-sm focus:border-primary outline-none"
                    placeholder="e.g. 20"
                  />
                </div>
              )}

              {activeDef.groundTruthPrompts.distance && (
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">
                    Tape-Measured Distance (Meters)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={gtDistance}
                    onChange={(e) => setGtDistance(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2 text-white font-mono text-sm focus:border-primary outline-none"
                    placeholder="e.g. 20.0"
                  />
                </div>
              )}

              {activeDef.groundTruthPrompts.heading && (
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">
                    Known Walking Heading (Degrees [0, 360))
                  </label>
                  <input
                    type="number"
                    value={gtHeading}
                    onChange={(e) => setGtHeading(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2 text-white font-mono text-sm focus:border-primary outline-none"
                    placeholder="e.g. 0 for North"
                  />
                </div>
              )}

              {activeDef.groundTruthPrompts.duration && (
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">
                    Known Test / Outage Duration (Seconds)
                  </label>
                  <input
                    type="number"
                    value={gtDuration}
                    onChange={(e) => setGtDuration(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2 text-white font-mono text-sm focus:border-primary outline-none"
                    placeholder="e.g. 60"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
              <button
                onClick={() => setShowGroundTruthModal(false)}
                className="px-4 py-2 bg-background border border-border hover:bg-white/5 text-gray-300 rounded-lg text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalizeStop}
                className="px-5 py-2 bg-primary hover:bg-blue-600 active:scale-95 text-white font-bold rounded-lg text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-primary/25"
              >
                Evaluate & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ChecklistBadge = ({ label, passed, note }: { label: string; passed: boolean; note: string }) => (
  <div className={`p-2 rounded-lg border text-center ${
    passed ? 'bg-success/10 border-success/30 text-success' : 'bg-background/50 border-border text-muted'
  }`}>
    <span className="text-[9px] block text-muted truncate">{label}</span>
    <span className="font-bold text-[10px] block mt-0.5 truncate">{note}</span>
  </div>
);

const TelemetryPill = ({ label, value, unit }: { label: string; value: string | number; unit: string }) => (
  <div className="bg-background/60 border border-border rounded-lg p-2.5 flex flex-col justify-between">
    <span className="text-[9px] text-muted font-bold uppercase tracking-wider">{label}</span>
    <div className="font-mono flex items-baseline space-x-1 mt-1">
      <span className="text-white font-bold text-sm sm:text-base">{value}</span>
      {unit && <span className="text-muted text-[10px]">{unit}</span>}
    </div>
  </div>
);

const MetricSummaryCard = ({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string | number;
  unit: string;
  highlight?: string;
}) => (
  <div className="bg-background/60 border border-border rounded-lg p-2.5 flex flex-col justify-between">
    <span className="text-[9px] text-muted font-bold uppercase tracking-wider">{label}</span>
    <div className="font-mono flex items-baseline space-x-1 mt-1">
      <span className={`text-base font-bold ${highlight || 'text-white'}`}>{value}</span>
      {unit && <span className="text-muted text-[10px]">{unit}</span>}
    </div>
  </div>
);

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const tenths = Math.floor((sec * 10) % 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${tenths}`;
}
