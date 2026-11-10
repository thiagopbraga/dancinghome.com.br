import { describe, expect, it } from 'vitest';
import { removeWhite, sway } from '../../src/core/drawing';

function imagem(w: number, h: number, cor: [number, number, number]): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) d.set([...cor, 255], i * 4);
  return d;
}

function pinta(d: Uint8ClampedArray, w: number, x: number, y: number, cor: [number, number, number]): void {
  d.set([...cor, 255], (y * w + x) * 4);
}

describe('desenho dela', () => {
  it('tira o papel branco e devolve a caixa do desenho', () => {
    const d = imagem(10, 8, [250, 250, 248]);
    pinta(d, 10, 3, 2, [200, 30, 60]);
    pinta(d, 10, 6, 5, [20, 20, 20]);
    const box = removeWhite(d, 10, 8);
    expect(box).toEqual({ x: 3, y: 2, w: 4, h: 4 });
    expect(d[3]).toBe(0); // papel transparente
    expect(d[(2 * 10 + 3) * 4 + 3]).toBe(255); // traço continua
  });

  it('papel acinzentado pela sombra também sai, mas amarelo forte fica', () => {
    const d = imagem(4, 1, [185, 186, 184]);
    pinta(d, 4, 1, 0, [255, 230, 40]);
    const box = removeWhite(d, 4, 1);
    expect(box).toEqual({ x: 1, y: 0, w: 1, h: 1 });
    expect(d[3]).toBe(0);
  });

  it('foto só de papel não vira desenho', () => {
    expect(removeWhite(imagem(5, 5, [255, 255, 255]), 5, 5)).toBeNull();
  });

  it('balança de um lado para o outro e dá um pulinho na batida', () => {
    expect(sway(0).hop).toBe(1);
    expect(sway(0.5).hop).toBe(0);
    expect(sway(0.5).angle).toBeCloseTo(0.12, 5);
    expect(sway(1.5).angle).toBeCloseTo(-0.12, 5);
  });
});
