import { describe, expect, it } from 'vitest';
import { computeAngles, mirrorAngles } from '../../src/core/angles';
import { energyPoints, EventJudge, movement, poseDiff, rate, WINDOW_S } from '../../src/core/judge';
import { buildSkeleton, skeletonToLandmarks } from '../../src/core/skeleton';
import { starsFor, summarize } from '../../src/core/stars';
import type { AngleName, Angles, ChoreoEvent, PoseResult } from '../../src/core/types';

const ALL: Record<AngleName, number> = {
  lShoulder: 1,
  rShoulder: 1,
  lElbow: 1,
  rElbow: 1,
  lHip: 1,
  rHip: 1,
  lKnee: 1,
  rKnee: 1,
};
const target: Angles = { lShoulder: 90, rShoulder: 90, lElbow: 170, rElbow: 170 };
const off = (d: number): Angles => ({
  lShoulder: 90 - d,
  rShoulder: 90 + d,
  lElbow: 170 - d,
  rElbow: 170 - d,
});

describe('nota de uma pose', () => {
  it('pose igual ao alvo dá Perfeito (100)', () => {
    expect(rate(poseDiff(target, ALL, target))).toEqual({ rating: 'perfeito', points: 100 });
  });
  it('30° de diferença dá Muito bem (70)', () => {
    expect(poseDiff(off(30), ALL, target)).toBeCloseTo(30);
    expect(rate(poseDiff(off(30), ALL, target))).toEqual({ rating: 'muitoBem', points: 70 });
  });
  it('45° de diferença dá Quase (40)', () => {
    expect(rate(poseDiff(off(45), ALL, target))).toEqual({ rating: 'quase', points: 40 });
  });
  it('70° de diferença dá 10, sem mensagem negativa', () => {
    expect(rate(poseDiff(off(70), ALL, target))).toEqual({ rating: 'tenteiDeNovo', points: 10 });
  });
  it('ombros e cotovelos pesam 1,5; quadris e joelhos pesam 1,0', () => {
    const t: Angles = { lShoulder: 90, lKnee: 90 };
    // ombro errado por 50, joelho certo: (50*1.5 + 0*1) / 2.5 = 30
    expect(poseDiff({ lShoulder: 140, lKnee: 90 }, ALL, t)).toBeCloseTo(30);
    // joelho errado por 50, ombro certo: (0*1.5 + 50*1) / 2.5 = 20
    expect(poseDiff({ lShoulder: 90, lKnee: 140 }, ALL, t)).toBeCloseTo(20);
  });
  it('só contam os ângulos listados na pose e com visibilidade acima de 0,5', () => {
    const vis = { ...ALL, lElbow: 0.3, rElbow: 0.5 };
    expect(
      poseDiff({ lShoulder: 90, rShoulder: 90, lElbow: 20, rElbow: 20, lKnee: 10 }, vis, target),
    ).toBeCloseTo(0);
  });
  it('pose sem nenhum ângulo visível vale Quase (40), nunca zero', () => {
    const none = { ...ALL, lShoulder: 0, rShoulder: 0, lElbow: 0, rElbow: 0 };
    expect(poseDiff(target, none, target)).toBeNull();
    expect(rate(null)).toEqual({ rating: 'quase', points: 40 });
  });
  it('mirror troca os lados da pose-alvo', () => {
    const alvo: Angles = { rShoulder: 150, rElbow: 170, lShoulder: 40, lElbow: 90 };
    const feita = { lShoulder: 150, lElbow: 170, rShoulder: 40, rElbow: 90 };
    expect(rate(poseDiff(feita, ALL, alvo)).rating).not.toBe('perfeito');
    expect(rate(poseDiff(feita, ALL, mirrorAngles(alvo))).rating).toBe('perfeito');
  });
  it('limites ajustáveis mudam a nota', () => {
    expect(rate(30, { perfeito: 30, muitoBem: 45, quase: 70 }).rating).toBe('perfeito');
  });
});

describe('janela de ±300 ms', () => {
  const event: ChoreoEvent = { beat: 8, pose: 'estrela', mirror: false, holdBeats: 0, secao: 'a' };
  it('guarda a melhor nota dentro da janela e ignora o que está fora', () => {
    const j = new EventJudge(event, target, 4, 4);
    j.feed(4 - WINDOW_S - 0.05, target, ALL); // fora
    j.feed(3.8, off(40), ALL);
    j.feed(4.1, off(10), ALL);
    j.feed(4.25, off(50), ALL);
    j.feed(4 + WINDOW_S + 0.05, target, ALL); // fora
    expect(j.bestDiff).toBeCloseTo(10);
    expect(j.isOver(4.2)).toBe(false);
    expect(j.isOver(4.31)).toBe(true);
    expect(j.result(0)).toMatchObject({ rating: 'perfeito', points: 100, energy: 0, bestDiff: 10 });
  });
  it('a segurada estende a janela até o fim', () => {
    const j = new EventJudge({ ...event, holdBeats: 4 }, target, 4, 6);
    j.feed(5.9, target, ALL);
    expect(j.bestDiff).toBeCloseTo(0);
    expect(j.isOver(6.2)).toBe(false);
  });
  it('sem nenhuma amostra visível vale Quase', () => {
    const j = new EventJudge(event, target, 4, 4);
    expect(j.result(0)).toMatchObject({ rating: 'quase', points: 40 });
  });
});

describe('bônus de energia', () => {
  const place = { cx: 0.5, cy: 0.55, scale: 0.22, aspect: 4 / 3 };
  const lm = (a: Angles) => skeletonToLandmarks(buildSkeleton(a), place);
  it('mede o deslocamento em alturas de tronco, independente da distância da câmera', () => {
    const a = lm({});
    const b = lm({ lShoulder: 170, rShoulder: 170 });
    const perto = movement(a, b, 4 / 3);
    const longe = movement(
      skeletonToLandmarks(buildSkeleton({}), { ...place, scale: 0.11 }),
      skeletonToLandmarks(buildSkeleton({ lShoulder: 170, rShoulder: 170 }), { ...place, scale: 0.11 }),
      4 / 3,
    );
    expect(perto).toBeGreaterThan(2);
    expect(longe).toBeCloseTo(perto, 5);
    expect(movement(a, a, 4 / 3)).toBe(0);
    expect(computeAngles(b, 4 / 3).angles.lShoulder).toBeCloseTo(170, 0);
  });
  it('vale até +20 por pose e no máximo 10 quando a nota ficou abaixo de Quase', () => {
    expect(energyPoints(0, 'perfeito')).toBe(0);
    expect(energyPoints(2.5, 'quase')).toBe(10);
    expect(energyPoints(100, 'muitoBem')).toBe(20);
    expect(energyPoints(100, 'tenteiDeNovo')).toBe(10);
    expect(energyPoints(1, 'tenteiDeNovo')).toBe(4);
  });
});

describe('estrelas', () => {
  it('1 estrela sempre; 2 a partir de 55%; 3 a partir de 75%', () => {
    expect(starsFor(0, 10)).toBe(1);
    expect(starsFor(549, 10)).toBe(1);
    expect(starsFor(550, 10)).toBe(2);
    expect(starsFor(749, 10)).toBe(2);
    expect(starsFor(750, 10)).toBe(3);
    expect(starsFor(0, 0)).toBe(1);
  });
  it('o bônus de energia entra no placar, mas não nas estrelas', () => {
    const ev: ChoreoEvent = { beat: 4, pose: 'estrela', mirror: false, holdBeats: 0, secao: 'a' };
    const r = (rating: PoseResult['rating'], points: number): PoseResult => ({
      event: ev,
      bestDiff: 0,
      rating,
      points,
      energy: 20,
    });
    const s = summarize([r('quase', 40), r('quase', 40), r('perfeito', 100), r('perfeito', 100)]);
    expect(s.posePoints).toBe(280);
    expect(s.score).toBe(360);
    expect(s.pct).toBeCloseTo(0.7);
    expect(s.stars).toBe(2);
    expect(s.perfeitos).toBe(2);
    expect(s.maiorSequencia).toBe(2);
  });
});
