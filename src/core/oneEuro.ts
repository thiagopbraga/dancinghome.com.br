// Filtro One Euro (Casiez, Roussel e Vogel, 2012): tira a tremedeira sem atrasar movimentos rápidos.
import type { Landmark } from './types';

function alpha(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuroFilter {
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev = 0;

  constructor(
    private readonly minCutoff = 1.5,
    private readonly beta = 4,
    private readonly dCutoff = 1,
  ) {}

  filter(x: number, t: number): number {
    if (this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = t;
      return x;
    }
    const dt = t - this.tPrev;
    if (dt <= 0) return this.xPrev;
    const dx = (x - this.xPrev) / dt;
    const aD = alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;
    this.dxPrev = dxHat;
    this.tPrev = t;
    return xHat;
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
  }
}

/** Um filtro por coordenada (x e y) de cada um dos 33 pontos. */
export class LandmarkSmoother {
  private fx: OneEuroFilter[] = [];
  private fy: OneEuroFilter[] = [];

  smooth(lm: Landmark[], t: number): Landmark[] {
    while (this.fx.length < lm.length) {
      this.fx.push(new OneEuroFilter());
      this.fy.push(new OneEuroFilter());
    }
    return lm.map((p, i) => ({
      x: this.fx[i].filter(p.x, t),
      y: this.fy[i].filter(p.y, t),
      z: p.z,
      visibility: p.visibility,
    }));
  }

  reset(): void {
    this.fx.forEach((f) => f.reset());
    this.fy.forEach((f) => f.reset());
  }
}
