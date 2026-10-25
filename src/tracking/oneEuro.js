// One Euro Filter (Casiez et al. 2012): heavy smoothing when still, low lag when moving.
class LowPass {
  constructor() { this.y = null; this.s = null; }
  filter(x, alpha) {
    if (this.s === null) { this.s = x; } else { this.s = alpha * x + (1 - alpha) * this.s; }
    this.y = x;
    return this.s;
  }
}

const alphaFor = (cutoff, dt) => {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
};

export class OneEuro {
  constructor({ minCutoff = 1.0, beta = 0.02, dCutoff = 1.0 } = {}) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = new LowPass();
    this.dx = new LowPass();
    this.lastT = null;
  }
  reset() { this.x = new LowPass(); this.dx = new LowPass(); this.lastT = null; }
  filter(value, tSeconds) {
    if (this.lastT === null) { this.lastT = tSeconds; this.dx.filter(0, 1); return this.x.filter(value, 1); }
    const dt = Math.max(1e-3, tSeconds - this.lastT);
    this.lastT = tSeconds;
    const prev = this.x.s;
    const dValue = (value - prev) / dt;
    const edx = this.dx.filter(dValue, alphaFor(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, alphaFor(cutoff, dt));
  }
}

export class OneEuro3 {
  constructor(opts) { this.f = [new OneEuro(opts), new OneEuro(opts), new OneEuro(opts)]; }
  set(opts) { for (const f of this.f) Object.assign(f, opts); }
  reset() { this.f.forEach((f) => f.reset()); }
  filter(v, t) {
    return { x: this.f[0].filter(v.x, t), y: this.f[1].filter(v.y, t), z: this.f[2].filter(v.z, t) };
  }
}
