import { navEngine } from './NavEngine';
import { useNavStore } from '../store/useNavStore';
import { offsetPosition } from './MathUtils';
import type { Position2D } from '../types';

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
  private routeIndex = 0;
  private activeRoute: Position2D[] = [];

  // One deterministic route with an explicit Warren Street segment. The route
  // approaches Warren, travels east along it, then turns off at the junction.
  private readonly fallbackRoute: Position2D[] = [
    { latitude: 40.7130447, longitude: -74.0072254 },
    { latitude: 40.7139000, longitude: -74.0069000 },
    { latitude: 40.7148500, longitude: -74.0063500 },
    { latitude: 40.7155500, longitude: -74.0058500 },
    { latitude: 40.7155500, longitude: -74.0047500 },
    { latitude: 40.7155500, longitude: -74.0036500 },
    { latitude: 40.7149000, longitude: -74.0032500 },
    { latitude: 40.7141500, longitude: -74.0037500 },
    { latitude: 40.7135500, longitude: -74.0046000 },
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

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.activeRoute = this.fallbackRoute;
    this.routeIndex = 0;
    this.lat = this.activeRoute[0].latitude;
    this.lon = this.activeRoute[0].longitude;
    useNavStore.getState().resetTrails();
    useNavStore.getState().updateNavState({ isDemoMode: true });

    const roadRoute = await this.loadRoadRoute();
    if (!this.isRunning) return;
    if (roadRoute.length > 1) this.activeRoute = roadRoute;
    this.routeIndex = 0;
    this.lat = this.activeRoute[0].latitude;
    this.lon = this.activeRoute[0].longitude;

    navEngine.start();

    // 50Hz sensor loop
    this.interval = setInterval(() => {
      const now = Date.now();
      
      // Update position along route
      const dt = 1 / 50;
      this.advanceAlongRoute(dt);

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

  private async loadRoadRoute(): Promise<Position2D[]> {
    const coordinates = this.fallbackRoute
      .map((point) => `${point.longitude},${point.latitude}`)
      .join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const data = await response.json() as {
        routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
      };
      const coordinates = data.routes?.[0]?.geometry?.coordinates;
      return coordinates?.map(([longitude, latitude]) => ({ latitude, longitude })) ?? [];
    } catch {
      return [];
    }
  }

  private advanceAlongRoute(dt: number): { vn: number; ve: number } {
    let distanceToMove = this.speed * dt;
    let vn = 0;
    let ve = 0;

    while (distanceToMove > 0) {
      const start = this.activeRoute[this.routeIndex];
      const end = this.activeRoute[(this.routeIndex + 1) % this.activeRoute.length];
      const north = (end.latitude - start.latitude) * (Math.PI / 180) * 6378137;
      const east = (end.longitude - start.longitude) * (Math.PI / 180) * 6378137 * Math.cos(this.lat * Math.PI / 180);
      const segmentLength = Math.sqrt(north ** 2 + east ** 2);
      const segmentProgress = Math.sqrt(
        (((this.lat - start.latitude) * Math.PI / 180 * 6378137) ** 2) +
        (((this.lon - start.longitude) * Math.PI / 180 * 6378137 * Math.cos(this.lat * Math.PI / 180)) ** 2)
      );
      const remaining = Math.max(segmentLength - segmentProgress, 0);

      if (distanceToMove < remaining && remaining > 0.01) {
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
        this.routeIndex = (this.routeIndex + 1) % this.activeRoute.length;

        const next = this.activeRoute[(this.routeIndex + 1) % this.activeRoute.length];
        const nextNorth = next.latitude - this.activeRoute[this.routeIndex].latitude;
        const nextEast = next.longitude - this.activeRoute[this.routeIndex].longitude;
        const nextLength = Math.sqrt(nextNorth ** 2 + nextEast ** 2);
        vn = (nextNorth / nextLength) * this.speed;
        ve = (nextEast / nextLength) * this.speed;
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
