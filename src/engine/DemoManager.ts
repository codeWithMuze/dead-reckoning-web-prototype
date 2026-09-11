import { navEngine } from './NavEngine';
import { useNavStore } from '../store/useNavStore';
import { offsetPosition } from './MathUtils';
import type { Position2D } from '../types';

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

  private advanceAlongRoute(dt: number) {
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
