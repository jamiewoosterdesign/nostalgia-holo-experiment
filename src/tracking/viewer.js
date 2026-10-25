// Decides where the viewer's eye is in world space, from head tracking or the mouse.
// World units: the screen is 1 unit tall, centred at the origin, facing +z.
import { OneEuro3 } from './oneEuro.js';

const NOMINAL_CM = 55;

export class Viewer {
  constructor(tracker) {
    this.tracker = tracker;
    this.settings = { parallax: 1.15, screenCm: 19.5, smoothing: 1 };
    this.mouse = { x: 0, y: 0 };      // -1..1
    this.mouseWheelZ = 0;
    this.filter = new OneEuro3({ minCutoff: 0.9, beta: 0.06, dCutoff: 1.0 });
    this.eye = { x: 0, y: 0.05, z: NOMINAL_CM / 19.5 };
    this.headWeight = 0;              // 0 = mouse, 1 = head
    this.mode = 'mouse';
  }

  applySmoothing() {
    const s = this.settings.smoothing;
    this.filter.set({ minCutoff: 0.9 / s, beta: 0.06 / s });
  }

  update(dt, timeSec, aspect) {
    const cm = this.settings.screenCm;
    const nominalZ = NOMINAL_CM / cm;
    const p = this.settings.parallax;

    // Mouse-driven eye: a comfortable orbit around the window.
    const halfW = aspect * 0.5;
    const mouseEye = {
      x: this.mouse.x * halfW * 0.85 * p,
      y: 0.04 + this.mouse.y * 0.42 * p,
      z: Math.min(nominalZ * 1.6, Math.max(nominalZ * 0.55, nominalZ + this.mouseWheelZ)),
    };

    let headEye = null;
    const f = this.tracker && this.tracker.locked;
    if (f) {
      const camY = 0.5 + 0.9 / cm; // webcam sits just above the top edge of the screen
      const raw = {
        x: (f.x * p) / cm,
        y: camY + (f.y * p) / cm,
        z: nominalZ + ((f.z - NOMINAL_CM) / cm) * Math.min(p, 1.4),
      };
      headEye = this.filter.filter(raw, timeSec);
      this.mode = 'head';
    } else {
      this.filter.reset();
      this.mode = 'mouse';
    }

    const targetW = headEye ? 1 : 0;
    this.headWeight += (targetW - this.headWeight) * (1 - Math.exp(-dt * (targetW ? 6 : 1.5)));

    const src = headEye || mouseEye;
    // Mouse position eases; head position is already filtered so follows tightly.
    const k = headEye ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * 5);
    const target = {
      x: mouseEye.x + (src.x - mouseEye.x) * this.headWeight,
      y: mouseEye.y + (src.y - mouseEye.y) * this.headWeight,
      z: mouseEye.z + (src.z - mouseEye.z) * this.headWeight,
    };
    this.eye.x += (target.x - this.eye.x) * k;
    this.eye.y += (target.y - this.eye.y) * k;
    this.eye.z += (target.z - this.eye.z) * k;

    // Keep the frustum sane.
    this.eye.x = Math.max(-aspect * 1.6, Math.min(aspect * 1.6, this.eye.x));
    this.eye.y = Math.max(-1.3, Math.min(1.5, this.eye.y));
    this.eye.z = Math.max(0.7, Math.min(8, this.eye.z));
    return this.eye;
  }
}
