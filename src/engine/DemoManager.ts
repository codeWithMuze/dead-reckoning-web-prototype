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

      // Generate IMU data (noisy acceleration around 0, since it's constant velocity)
      const noise = () => (Math.random() - 0.5) * 0.2;
      const ax = (Math.sin(now / 300) * 0.5) + noise(); // Simulate walking bob
      const ay = (Math.sin(now / 300 + Math.PI/2) * 0.5) + noise();
      const az = 9.81 + (Math.sin(now / 150) * 0.8) + noise();

      navEngine.handleIMU({
        timestamp: now,
        accel: { x: ax, y: ay, z: az },
        gyro: { x: noise(), y: noise(), z: noise() }
      });

      navEngine.handleOrientation(this.heading, 0, 0, true);

      // GPS 1Hz update
      if (this.gpsAvailable && now % 1000 < 20) {
        navEngine.handleGPS({
          timestamp: now,
          latitude: this.lat + (Math.random()-0.5)*0.0001, // add some gps noise
          longitude: this.lon + (Math.random()-0.5)*0.0001,
          accuracy: 5 + Math.random() * 5,
          altitude: 10,
          speed: this.speed,
          heading: this.heading
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
