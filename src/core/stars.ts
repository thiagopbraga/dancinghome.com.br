// Percentual e estrelas de uma partida. O bônus de energia não entra aqui, só no placar.
import type { PoseResult } from './types.ts';

export const STAR_2 = 0.55;
export const STAR_3 = 0.75;

export function percent(posePoints: number, numPoses: number): number {
  if (numPoses <= 0) return 0;
  return posePoints / (100 * numPoses);
}

/** 1 estrela sempre; 2 a partir de 55%; 3 a partir de 75%. */
export function starsFor(posePoints: number, numPoses: number): 1 | 2 | 3 {
  const pct = percent(posePoints, numPoses);
  if (pct >= STAR_3) return 3;
  if (pct >= STAR_2) return 2;
  return 1;
}

export interface Summary {
  posePoints: number;
  energyPoints: number;
  score: number;
  pct: number;
  stars: 1 | 2 | 3;
  perfeitos: number;
  maiorSequencia: number;
}

export function summarize(results: PoseResult[]): Summary {
  let posePoints = 0;
  let energy = 0;
  let perfeitos = 0;
  let seq = 0;
  let best = 0;
  for (const r of results) {
    posePoints += r.points;
    energy += r.energy;
    if (r.rating === 'perfeito') {
      perfeitos++;
      seq++;
      best = Math.max(best, seq);
    } else {
      seq = 0;
    }
  }
  return {
    posePoints,
    energyPoints: energy,
    score: posePoints + energy,
    pct: percent(posePoints, results.length),
    stars: starsFor(posePoints, results.length),
    perfeitos,
    maiorSequencia: best,
  };
}
