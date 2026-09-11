import { navEngine } from './NavEngine';

export class SensorManager {
  private static instance: SensorManager;
  private isListening = false;
  private watchId: number | null = null;

  private constructor() {}

  static getInstance() {
    if (!SensorManager.instance) {
      SensorManager.instance = new SensorManager();
    }
    return SensorManager.instance;
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission !== 'granted') return false;
      }
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission !== 'granted') return false;
      }
      return true;
    } catch (e) {
      console.error("Permission request failed", e);
      return false; // usually means not over HTTPS or user denied
    }
  }

  public start() {
    if (this.isListening) return;
    this.isListening = true;

    // Start IMU
    window.addEventListener('devicemotion', this.handleMotion);
    window.addEventListener('deviceorientation', this.handleOrientation);
    
    // Start GPS
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        this.handleGPS,
        (err) => console.warn('GPS Error:', err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    
    navEngine.start();
  }

  public stop() {
    if (!this.isListening) return;
    this.isListening = false;

    window.removeEventListener('devicemotion', this.handleMotion);
    window.removeEventListener('deviceorientation', this.handleOrientation);
    
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    
    navEngine.stop();
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
  }

  private handleOrientation = (event: DeviceOrientationEvent) => {
    navEngine.handleOrientation(
      event.alpha || 0, 
      event.beta || 0, 
      event.gamma || 0, 
      event.absolute || false
    );
  }

  private handleGPS = (position: GeolocationPosition) => {
    navEngine.handleGPS({
      timestamp: position.timestamp,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      speed: position.coords.speed,
      heading: position.coords.heading
    });
  }
}

export const sensorManager = SensorManager.getInstance();
