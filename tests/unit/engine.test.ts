import { describe, expect, it } from 'vitest';
import { computeView } from '../../src/game/engine';

describe('computeView', () => {
  it('16:9 exato não tem sobra', () => {
    const v = computeView(1280, 720);
    expect(v.scale).toBe(1);
    expect(v.left).toBe(0);
    expect(v.right).toBe(1280);
  });
  it('tela 20:9 estende o cenário nas laterais sem cortar a área de jogo', () => {
    const v = computeView(915, 412);
    expect(v.scale).toBeCloseTo(412 / 720, 5);
    expect(v.left).toBeLessThan(0);
    expect(v.right).toBeGreaterThan(1280);
    expect(v.top).toBeCloseTo(0, 5);
    expect((v.right - v.left) * v.scale).toBeCloseTo(915, 3);
  });
  it('tela mais alta que 16:9 estende em cima e embaixo', () => {
    const v = computeView(800, 600);
    expect(v.left).toBeCloseTo(0, 5);
    expect(v.top).toBeLessThan(0);
  });
});
