import { navEngine } from './NavEngine';
import { useNavStore } from '../store/useNavStore';
import { offsetPosition } from './MathUtils';

export class DemoManager {
  private static instance: DemoManager;
  private interval: any = null;
  private isRunning = false;
  
  // Simulated State
  private lat = 40.7130447;
  private lon = -74.0072254;
  private heading = 45; // Degrees
  private speed = 1.5; // m/s (walking)
  private gpsAvailable = true;
  private routeIndex = 0;

  private readonly route = [
    { latitude: 40.7130447, longitude: -74.0072254 },
    { latitude: 40.7136180, longitude: -74.0067530 },
    { latitude: 40.7152360, longitude: -74.0054200 },
    { latitude: 40.7157952, longitude: -74.0049777 },
    { latitude: 40.7162939, longitude: -74.0045248 },
    { latitude: 40.7157952, longitude: -74.0049777 },
    { latitude: 40.7152360, longitude: -74.0054200 },
    { latitude: 40.7136180, longitude: -74.0067530 },
  ];

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
    this.routeIndex = 0;
    this.lat = this.route[0].latitude;
    this.lon = this.route[0].longitude;
    useNavStore.getState().updateNavState({ isDemoMode: true });

    navEngine.start();
    navEngine.resetPosition(this.lat, this.lon);
    useNavStore.getState().updateNavState({ mode: 'GPS_AIDED', gpsActive: this.gpsAvailable });

    // 50Hz sensor loop
    this.interval = setInterval(() => {
      const now = Date.now();
      
      const dt = 1/50;
      const { vn, ve } = this.advanceAlongRoute(dt);

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
          latitude: this.lat,
          longitude: this.lon,
          accuracy: 3,
          altitude: 10,
          speed: this.speed,
          heading: this.heading
        });
      }

      navEngine.setDemoPosition(this.lat, this.lon, vn, ve, this.heading);
    }, 20); // 50Hz
  }

  private advanceAlongRoute(dt: number) {
    let distanceToMove = this.speed * dt;
    let vn = 0;
    let ve = 0;

    while (distanceToMove > 0) {
      const start = this.route[this.routeIndex];
      const end = this.route[(this.routeIndex + 1) % this.route.length];
      const north = (end.latitude - start.latitude) * (Math.PI / 180) * 6378137;
      const east = (end.longitude - start.longitude) * (Math.PI / 180) * 6378137 * Math.cos(this.lat * Math.PI / 180);
      const segmentLength = Math.sqrt(north ** 2 + east ** 2);
      const segmentProgress = Math.sqrt(
        (((this.lat - start.latitude) * Math.PI / 180 * 6378137) ** 2) +
        (((this.lon - start.longitude) * Math.PI / 180 * 6378137 * Math.cos(this.lat * Math.PI / 180)) ** 2)
      );
      const remaining = Math.max(segmentLength - segmentProgress, 0);

      if (distanceToMove < remaining || remaining === 0) {
        vn = (north / segmentLength) * this.speed;
        ve = (east / segmentLength) * this.speed;
        const next = offsetPosition(this.lat, this.lon, vn * distanceToMove, ve * distanceToMove);
        this.lat = next.latitude;
        this.lon = next.longitude;
        distanceToMove = 0;
      } else {
        this.lat = end.latitude;
        this.lon = end.longitude;
        distanceToMove -= remaining;
        this.routeIndex = (this.routeIndex + 1) % this.route.length;
      }
    }

    this.heading = (Math.atan2(ve, vn) * 180 / Math.PI + 360) % 360;
    return { vn, ve };
  }

  public stop() {
    this.isRunning = false;
    clearInterval(this.interval);
    useNavStore.getState().updateNavState({ isDemoMode: false });
    navEngine.stop();
  }
}

export const demoManager = DemoManager.getInstance();
