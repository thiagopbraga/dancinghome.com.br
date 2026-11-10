import { describe, expect, it } from 'vitest';
import { FpsWatch, isPortrait } from '../../src/core/device';
import { computeView } from '../../src/game/engine';

describe('aparelho', () => {
  it('vertical é quando a altura passa da largura', () => {
    expect(isPortrait(412, 915)).toBe(true);
    expect(isPortrait(915, 412)).toBe(false);
    expect(isPortrait(1280, 720)).toBe(false);
  });

  it('a 60 fps e a 30 fps a detecção fica em todos os quadros', () => {
    const a = new FpsWatch();
    for (let i = 0; i < 600; i++) a.update(1 / 60);
    expect(a.alternate).toBe(false);
    const b = new FpsWatch();
    for (let i = 0; i < 300; i++) b.update(1 / 30);
    expect(b.alternate).toBe(false);
  });

  it('abaixo de 20 fps por 2 s, passa a detectar em quadros alternados e fica assim', () => {
    const w = new FpsWatch();
    for (let i = 0; i < 15; i++) w.update(1 / 15); // 1 s lento: ainda não
    expect(w.alternate).toBe(false);
    for (let i = 0; i < 60; i++) w.update(1 / 15);
    expect(w.alternate).toBe(true);
    for (let i = 0; i < 600; i++) w.update(1 / 60);
    expect(w.alternate).toBe(true);
  });

  it('um engasgo curto não liga a economia', () => {
    const w = new FpsWatch();
    for (let i = 0; i < 120; i++) w.update(1 / 60);
    w.update(0.5);
    for (let i = 0; i < 120; i++) w.update(1 / 60);
    expect(w.alternate).toBe(false);
  });

  it('em 915x412 (20:9) a área 16:9 cabe inteira e o cenário se estende para os lados', () => {
    const v = computeView(915, 412);
    expect(v.scale).toBeCloseTo(412 / 720, 5);
    expect(v.top).toBe(0);
    expect(v.bottom).toBe(720);
    expect(v.left).toBeLessThan(0);
    expect(v.right).toBeGreaterThan(1280);
    expect((v.right - v.left) * v.scale).toBeCloseTo(915, 3);
  });
});
