import { describe, expect, it } from 'vitest';
import { bothHandsUp, handCursors, HoldDetector, landmarkForCursor } from '../../src/core/gestures';
import { OneEuroFilter } from '../../src/core/oneEuro';
import { buildSkeleton, LM, skeletonToLandmarks } from '../../src/core/skeleton';

const place = { cx: 0.5, cy: 0.55, scale: 0.22, aspect: 4 / 3 };

describe('cursor da mão', () => {
  it('mãos em descanso ficam fora da tela, para não apertar nada sem querer', () => {
    const lm = skeletonToLandmarks(buildSkeleton({}), place);
    for (const c of handCursors(lm, 4 / 3)) expect(c.y).toBeGreaterThan(720);
  });
  it('é espelhado: a mão direita levantada aparece do lado direito da tela', () => {
    const lm = skeletonToLandmarks(buildSkeleton({ rShoulder: 120 }), place);
    const r = handCursors(lm, 4 / 3).find((c) => c.hand === 'r')!;
    expect(r.x).toBeGreaterThan(640);
    expect(r.y).toBeLessThan(400);
  });
  it('landmarkForCursor é o inverso de handCursors e não depende da distância', () => {
    for (const scale of [0.12, 0.22]) {
      const lm = skeletonToLandmarks(buildSkeleton({}), { ...place, scale });
      const pos = landmarkForCursor(900, 200, lm, 4 / 3)!;
      lm[LM.rIndex] = { ...lm[LM.rIndex], ...pos };
      const r = handCursors(lm, 4 / 3).find((c) => c.hand === 'r')!;
      expect(r.x).toBeCloseTo(900, 3);
      expect(r.y).toBeCloseTo(200, 3);
    }
  });
});

describe('duas mãos para o alto', () => {
  it('reconhece só quando as duas passam do nariz', () => {
    expect(bothHandsUp(skeletonToLandmarks(buildSkeleton({ lShoulder: 170, rShoulder: 170 }), place))).toBe(
      true,
    );
    expect(bothHandsUp(skeletonToLandmarks(buildSkeleton({ lShoulder: 170 }), place))).toBe(false);
    expect(bothHandsUp(skeletonToLandmarks(buildSkeleton({}), place))).toBe(false);
  });
  it('dispara depois de 1 s seguido e só rearma quando as mãos descem', () => {
    const h = new HoldDetector(1);
    let fired = 0;
    for (let i = 0; i < 30; i++) if (h.update(true, 0.05)) fired++;
    expect(fired).toBe(1);
    h.update(false, 0.05);
    for (let i = 0; i < 19; i++) expect(h.update(true, 0.05)).toBe(false);
    expect(h.update(true, 0.1)).toBe(true);
  });
});

describe('One Euro', () => {
  it('reduz a tremedeira de um ponto parado e acompanha um movimento rápido', () => {
    const f = new OneEuroFilter();
    let t = 0;
    let maxDev = 0;
    for (let i = 0; i < 120; i++) {
      t += 1 / 30;
      const y = f.filter(0.5 + (i % 2 === 0 ? 0.004 : -0.004), t);
      if (i > 30) maxDev = Math.max(maxDev, Math.abs(y - 0.5));
    }
    expect(maxDev).toBeLessThan(0.003);
    let y = 0;
    for (let i = 0; i < 10; i++) {
      t += 1 / 30;
      y = f.filter(0.9, t);
    }
    expect(y).toBeGreaterThan(0.85);
  });
});
