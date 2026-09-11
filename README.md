# NAVISENSE: GPS-Denied Navigation System

NaviSense is a web-based prototype demonstrating smartphone inertial navigation, dead reckoning, and sensor fusion for GPS-denied environments. Built as a technical demonstration for engineering reviews.

## Architecture

1. **Sensor Layer:** Consumes `DeviceMotionEvent`, `DeviceOrientationEvent`, and `Geolocation` APIs.
2. **Dead Reckoning Engine:** Integrates raw acceleration into velocity and position using device attitude (Euler angles) for world-frame transformation.
3. **EKF Fusion (Simplified):** Applies GPS corrections over dead-reckoned predictions when signal is available.
4. **AI Module:** A placeholder structure for TensorFlow.js drift correction inference based on windowed sensor features (variance, mean).

## Running the Application

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

## Browser & Device Compatibility

- **Sensors:** Requires a device with an accelerometer and gyroscope (smartphones/tablets).
- **HTTPS:** Most mobile browsers require a Secure Context (HTTPS) to expose `DeviceMotionEvent`. For local testing, use a tool like `ngrok` or Vite's `--host` with a self-signed certificate, or deploy to Vercel/Netlify.
- **iOS/Safari:** Requires explicit user permission to read motion data. The app handles this via an onboarding prompt.

## How to Test Live Device Mode

1. Deploy the app to a secure host (e.g., Vercel) or use `ngrok`.
2. Open on your smartphone.
3. Click "Start Live Session" and grant Location and Motion permissions.
4. The map will center on your GPS location.
5. Walk around to see real-time sensor charts and GPS updates.

## Triggering GPS-Denied Testing

**Demo Mode:** Click "Start Demo Mode" on desktop. Use the "Simulate GPS Loss" button on the map view to see the system fall back to synthetic dead reckoning.
**Live Mode:** To test real GPS loss, start the session outside with good sky view, then walk deep indoors (like a concrete basement or tunnel) to force the browser to lose geolocation accuracy. The system will auto-transition to `GPS_DENIED`.

## Known Limitations

- **Browser Accuracy:** Browser sensor APIs smooth and filter data, making true inertial navigation challenging compared to low-level hardware access.
- **Double Integration Drift:** Without high-end IMUs, double integrating acceleration leads to rapid exponential error. The prototype applies aggressive damping/ZUPT (Zero Velocity Updates) to simulate bounded pedestrian dead reckoning (PDR).
- **AI Module:** The drift correction module is currently structural and generates synthetic confidence scores. It is designed to accept a TF.js model.
