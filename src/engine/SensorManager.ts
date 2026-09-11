import { navEngine } from './NavEngine.ts';
import { useNavStore } from '../store/useNavStore.ts';

export class SensorManager {
  private static instance: SensorManager;
  private isListening = false;
  private watchId: number | null = null;
  private isAcquiringInitialGps = false;

  private constructor() {}

  static getInstance(): SensorManager {
    if (!SensorManager.instance) {
      SensorManager.instance = new SensorManager();
    }
    return SensorManager.instance;
  }

  public isAcquiring(): boolean {
    return this.isAcquiringInitialGps;
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') return false;
      }
      if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') return false;
      }
      return true;
    } catch (e) {
      console.error('Permission request failed', e);
      return false;
    }
  }

  public start() {
    if (this.isListening) return;
    this.isListening = true;

    // Clear any stale watchers
    this.clearGpsWatcher();

    // Start IMU listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('devicemotion', this.handleMotion);
      window.addEventListener('deviceorientation', this.handleOrientation);
    }

    navEngine.start();

    // Reset GPS receiver state to WAITING
    useNavStore.getState().updateGPSReceiver({
      status: 'WAITING',
      accuracy: null,
      errorMessage: null,
    });

    // 1. Explicitly acquire initial GPS fix using getCurrentPosition
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      this.isAcquiringInitialGps = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.isAcquiringInitialGps = false;
          if (!this.isListening) return; // Session was stopped in the meantime

          // Process the initial GPS fix
          this.handleGPS(position);

          // 2. Once initial fix succeeds, start watchPosition for continuous updates
          this.startGpsWatcher();
        },
        (err) => {
          this.isAcquiringInitialGps = false;
          if (!this.isListening) return;

          this.handleGpsError(err);

          // If not permission denied (e.g. timeout or position unavailable),
          // start the continuous watcher so it can acquire when signal improves
          if (err.code !== 1) { // 1 = PERMISSION_DENIED
            this.startGpsWatcher();
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    } else {
      useNavStore.getState().updateGPSReceiver({
        status: 'UNAVAILABLE',
        errorMessage: 'Location permission is required for Live Session.',
      });
    }
  }

  private startGpsWatcher() {
    if (!this.isListening || typeof navigator === 'undefined' || !('geolocation' in navigator)) return;
    if (this.watchId !== null) return; // Do NOT create duplicate watchers

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.handleGPS(position);
      },
      (err) => {
        this.handleGpsError(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  private clearGpsWatcher() {
    if (this.watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  public stop() {
    if (!this.isListening) return;
    this.isListening = false;
    this.isAcquiringInitialGps = false;

    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.handleMotion);
      window.removeEventListener('deviceorientation', this.handleOrientation);
    }

    this.clearGpsWatcher();
    navEngine.stop();
  }

  private handleGpsError(err: GeolocationPositionError) {
    console.warn('GPS Error:', err);
    let status: 'UNAVAILABLE' | 'WAITING' | 'ERROR' = 'ERROR';
    let errorMessage = 'GPS error occurred.';

    if (err.code === 1) {
      // PERMISSION_DENIED
      status = 'UNAVAILABLE';
      errorMessage = 'Location permission is required for Live Session.';
    } else if (err.code === 3) {
      // TIMEOUT
      status = 'WAITING';
      errorMessage = 'Waiting for GPS location. Please enable Location Services and move to an area with better GPS visibility.';
    } else if (err.code === 2) {
      // POSITION_UNAVAILABLE
      status = 'ERROR';
      errorMessage = 'GPS location is currently unavailable. Please verify GPS is enabled.';
    }

    useNavStore.getState().updateGPSReceiver({
      status,
      errorMessage,
    });
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    // Prefer acceleration without gravity if available, otherwise fallback
    const acc = event.acceleration || event.accelerationIncludingGravity;
    if (!acc) return;

    // Use high-resolution event.timeStamp (relative to performance.timeOrigin)
    const timestampMs = event.timeStamp && event.timeStamp > 0 
      ? (typeof performance !== 'undefined' && performance.timeOrigin ? performance.timeOrigin + event.timeStamp : event.timeStamp)
      : Date.now();

    const rawAccel = { 
      x: acc.x || 0, 
      y: acc.y || 0, 
      z: acc.z || 0 
    };

    // W3C rotationRate is in deg/s; convert to rad/s for kinematics: rad = deg * π / 180
    const degToRad = Math.PI / 180;
    const rawGyro = { 
      x: (event.rotationRate?.alpha || 0) * degToRad, 
      y: (event.rotationRate?.beta || 0) * degToRad, 
      z: (event.rotationRate?.gamma || 0) * degToRad 
    };

    navEngine.handleIMU({
      timestamp: timestampMs,
      accel: rawAccel,
      gyro: rawGyro
    });
  };

  private handleOrientation = (event: DeviceOrientationEvent) => {
    navEngine.handleOrientation(
      event.alpha || 0, 
      event.beta || 0, 
      event.gamma || 0, 
      event.absolute || false
    );
  };

  private handleGPS = (position: GeolocationPosition) => {
    const store = useNavStore.getState();

    // 1. Update physical hardware receiver status
    store.updateGPSReceiver({
      status: 'AVAILABLE',
      accuracy: position.coords.accuracy,
      lastHardwareFixTime: position.timestamp,
      errorMessage: null,
    });

    // 2. Application-level GPS input gate
    if (!store.gpsInputEnabled) {
      // Application test: ignore/suppress fix from entering NavEngine
      return;
    }

    navEngine.handleGPS({
      timestamp: position.timestamp,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      speed: position.coords.speed,
      heading: position.coords.heading
    });
  };
}

export const sensorManager = SensorManager.getInstance();
