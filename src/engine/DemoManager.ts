import { navEngine } from './NavEngine';
import { useNavStore } from '../store/useNavStore';

export class DemoManager {
  private static instance: DemoManager;
  private interval: any = null;
  private isRunning = false;
  
  // Simulated State
  private lat = 40.7128;
  private lon = -74.0060;
  private heading = 45; // Degrees
  private speed = 1.5; // m/s (walking)
  private gpsAvailable = true;

  private constructor() {}

  static getInstance() {
    if (!DemoManager.instance) {
      DemoManager.instance = new DemoManager();
    }
    return DemoManager.instance;
  }

  public toggleGps(active: boolean) {
    this.gpsAvailable = active;
    useNavStore.getState().updateNavState({ 
      mode: active ? 'GPS_AIDED' : 'GPS_DENIED',
      gpsActive: active
    });
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    useNavStore.getState().updateNavState({ isDemoMode: true });

    navEngine.start();

    // 50Hz sensor loop
    this.interval = setInterval(() => {
      const now = Date.now();
      
      // Update true position (Simulated actual movement)
      const hdgRad = this.heading * (Math.PI / 180);
      const vn = Math.cos(hdgRad) * this.speed;
      const ve = Math.sin(hdgRad) * this.speed;
      
      // Update lat/lon slowly based on speed
      const dt = 1/50;
      const dLat = (vn * dt) / 6378137;
      const dLon = (ve * dt) / (6378137 * Math.cos(Math.PI * this.lat / 180));
      
      this.lat += dLat * (180 / Math.PI);
      this.lon += dLon * (180 / Math.PI);

      // Generate realistic human walking harmonics (~1.8 Hz step frequency)
      const tSec = now / 1000.0;
      const stepPhase = 2 * Math.PI * 1.8 * tSec; // 1.8 steps per second (~108 spm)
      
      const noise = () => (Math.random() - 0.5) * 0.15;
      const ax = 0.4 * Math.sin(stepPhase * 0.5) + noise(); // Lateral sway
      const ay = 0.6 * Math.cos(stepPhase) + noise();       // Forward-backward stride impulse
      const az = 9.81 + 2.2 * Math.sin(stepPhase) + noise(); // Vertical impact (~4.4 m/s² swing)

      // Angular velocities (rad/s) during walking
      const gx = 0.1 * Math.sin(stepPhase) + noise() * 0.05;
      const gy = 0.08 * Math.cos(stepPhase * 0.5) + noise() * 0.05;
      const gz = 0.05 * Math.sin(stepPhase * 0.5) + noise() * 0.05;

      navEngine.handleOrientation(this.heading, 0, 0, true);

      navEngine.handleIMU({
        timestamp: now,
        accel: { x: ax, y: ay, z: az },
        gyro: { x: gx, y: gy, z: gz },
      });

      // Record simulated receiver status
      if (now % 1000 < 25) {
        useNavStore.getState().updateGPSReceiver({
          status: this.gpsAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
          accuracy: 3.5,
          lastHardwareFixTime: now,
        });
      }

      // GPS 1Hz update (with realistic accuracy) - respects global GPS input gate
      if (this.gpsAvailable && useNavStore.getState().gpsInputEnabled && now % 1000 < 25) {
        navEngine.handleGPS({
          timestamp: now,
          latitude: this.lat + (Math.random() - 0.5) * 0.00004,
          longitude: this.lon + (Math.random() - 0.5) * 0.00004,
          accuracy: 3.5 + Math.random() * 2.0,
          altitude: 15,
          speed: this.speed,
          heading: this.heading,
        });
      }
    }, 20); // 50Hz
  }

  public stop() {
    this.isRunning = false;
    clearInterval(this.interval);
    useNavStore.getState().updateNavState({ isDemoMode: false });
    navEngine.stop();
  }
}

export const demoManager = DemoManager.getInstance();
