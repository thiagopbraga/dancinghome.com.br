import { describe, expect, it } from 'vitest';
import { detectBpm } from '../../src/core/bpm';
import { DEMO_BPM, renderDemoSong } from '../../src/core/demoSong';
import { expandSections } from '../../src/data/choreo';
import { ChoreoSchema } from '../../src/data/schema';
import { loadBaseData } from '../../src/data/songs';
import { buildSurprise, poseEvery } from '../../src/data/surprise';
import { makeRng } from '../../src/game/draw/util';

/** Batidas sintéticas: um clique curto por batida, com um pouco de ruído. */
function batidas(bpm: number, segundos: number, offsetS = 0, sr = 22050): Float32Array {
  const out = new Float32Array(Math.floor(segundos * sr));
  const rng = makeRng(7);
  for (let i = 0; i < out.length; i++) out[i] = (rng() - 0.5) * 0.02;
  const period = (60 / bpm) * sr;
  for (let k = 0; offsetS * sr + k * period < out.length; k++) {
    const start = Math.round(offsetS * sr + k * period);
    for (let j = 0; j < sr * 0.04 && start + j < out.length; j++) {
      out[start + j] +=
        Math.sin((2 * Math.PI * 180 * j) / sr) * Math.exp(-j / (sr * 0.01)) * (k % 4 === 0 ? 0.9 : 0.6);
    }
  }
  return out;
}

describe('detector de BPM', () => {
  for (const bpm of [100, 120, 140]) {
    it(`acha ${bpm} BPM com erro menor que 2`, () => {
      const t = detectBpm(batidas(bpm, 30), 22050)!;
      expect(Math.abs(t.bpm - bpm)).toBeLessThan(2);
      expect(t.confianca).toBeGreaterThan(0.15);
    });
  }

  it('acha o começo da batida (offset)', () => {
    const t = detectBpm(batidas(120, 30, 0.2), 22050)!;
    expect(Math.abs(t.bpm - 120)).toBeLessThan(2);
    // 200 ms, ou o mesmo ponto uma batida depois (a grade se repete a cada 500 ms)
    const fase = t.offsetMs % 500;
    expect(Math.min(Math.abs(fase - 200), 500 - Math.abs(fase - 200))).toBeLessThan(25);
  });

  it('acha o andamento da música de demonstração', () => {
    const t = detectBpm(renderDemoSong(22050), 22050)!;
    expect(Math.abs(t.bpm - DEMO_BPM)).toBeLessThan(2);
  });

  it('silêncio ou áudio curto demais não tem BPM', () => {
    expect(detectBpm(new Float32Array(22050 * 10), 22050)).toBeNull();
    expect(detectBpm(batidas(120, 2), 22050)).toBeNull();
  });
});

describe('modo surpresa', () => {
  const { catalog } = loadBaseData();

  it('o intervalo entre poses dobra nas músicas rápidas', () => {
    expect(poseEvery(120, 'facil')).toBe(4);
    expect(poseEvery(120, 'normal')).toBe(2);
    expect(poseEvery(150, 'facil')).toBe(8);
    expect(poseEvery(150, 'normal')).toBe(4);
  });

  it('gera uma fase válida, com poses do nível certo e sem repetir em seguida', () => {
    const c = buildSurprise(
      { id: 's', title: 'Surpresa', bpm: 120, offsetMs: 100, durationS: 180 },
      catalog,
      makeRng(3),
    );
    expect(ChoreoSchema.safeParse(c).success).toBe(true);
    expect(c.origem).toBe('surpresa');
    const facil = expandSections(c, 'facil');
    expect(facil.length).toBeGreaterThan(20);
    expect(facil[0].beat).toBe(4);
    expect(facil.every((e) => catalog[e.pose].nivel === 'facil')).toBe(true);
    // trecho de até 75 s = 150 batidas
    expect(facil.at(-1)!.beat).toBeLessThan(150);
    for (let i = 1; i < facil.length; i++) {
      expect(facil[i].pose).not.toBe(facil[i - 1].pose);
      expect(facil[i].beat - facil[i - 1].beat).toBe(4);
    }
    const normal = expandSections(c, 'normal');
    expect(normal.some((e) => catalog[e.pose].nivel === 'normal')).toBe(true);
    expect(normal.at(-1)!.beat).toBeGreaterThan(300);
  });

  it('a mesma semente dá a mesma fase', () => {
    const o = { id: 's', title: 'Surpresa', bpm: 100, offsetMs: 0, durationS: 60 };
    expect(buildSurprise(o, catalog, makeRng(5))).toEqual(buildSurprise(o, catalog, makeRng(5)));
  });
});
