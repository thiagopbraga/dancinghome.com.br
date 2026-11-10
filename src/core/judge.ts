// Nota de uma pose: diferença ponderada de ângulos, janela de ±300 ms e bônus de energia. Funções puras.
import { LM } from './skeleton';
import {
  ANGLE_NAMES,
  type AngleName,
  type Angles,
  type ChoreoEvent,
  type Landmark,
  type PoseResult,
  type Rating,
} from './types';

export interface Thresholds {
  perfeito: number;
  muitoBem: number;
  quase: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { perfeito: 20, muitoBem: 35, quase: 55 };

export const POINTS: Record<Rating, number> = { perfeito: 100, muitoBem: 70, quase: 40, tenteiDeNovo: 10 };

/** Braços pesam mais, porque criança mexe muito mais os braços. */
export const WEIGHTS: Record<AngleName, number> = {
  lShoulder: 1.5,
  rShoulder: 1.5,
  lElbow: 1.5,
  rElbow: 1.5,
  lHip: 1,
  rHip: 1,
  lKnee: 1,
  rKnee: 1,
};

export const MIN_VISIBILITY = 0.5;
/** Janela de tempo em volta da batida, em segundos. */
export const WINDOW_S = 0.3;
/** Soma de deslocamentos (em alturas de tronco) que vale o bônus cheio. */
export const ENERGY_FULL = 5;
export const ENERGY_MAX_POINTS = 20;
export const ENERGY_MAX_LOW = 10;

/**
 * Média ponderada das diferenças, em graus, só dos ângulos listados na pose-alvo
 * e com visibilidade acima de 0,5. Devolve null se nenhum ângulo estiver visível.
 */
export function poseDiff(
  measured: Angles,
  vis: Partial<Record<AngleName, number>>,
  target: Angles,
): number | null {
  let sum = 0;
  let weight = 0;
  for (const name of ANGLE_NAMES) {
    const t = target[name];
    const m = measured[name];
    if (t === undefined || m === undefined) continue;
    if ((vis[name] ?? 0) <= MIN_VISIBILITY) continue;
    sum += Math.abs(m - t) * WEIGHTS[name];
    weight += WEIGHTS[name];
  }
  return weight > 0 ? sum / weight : null;
}

/** Pose sem nenhum ângulo visível vale "Quase" (40), nunca zero. */
export function rate(
  diff: number | null,
  th: Thresholds = DEFAULT_THRESHOLDS,
): { rating: Rating; points: number } {
  let rating: Rating;
  if (diff === null) rating = 'quase';
  else if (diff <= th.perfeito) rating = 'perfeito';
  else if (diff <= th.muitoBem) rating = 'muitoBem';
  else if (diff <= th.quase) rating = 'quase';
  else rating = 'tenteiDeNovo';
  return { rating, points: POINTS[rating] };
}

const ENERGY_JOINTS: readonly number[] = [
  LM.lWrist,
  LM.rWrist,
  LM.lElbow,
  LM.rElbow,
  LM.lKnee,
  LM.rKnee,
  LM.lAnkle,
  LM.rAnkle,
];

/** Deslocamento de pulsos, cotovelos, joelhos e tornozelos entre dois quadros, em alturas de tronco. */
export function movement(prev: Landmark[], cur: Landmark[], aspect: number): number {
  const torso = (lm: Landmark[]): number => {
    const sy = (lm[LM.lShoulder].y + lm[LM.rShoulder].y) / 2;
    const hy = (lm[LM.lHip].y + lm[LM.rHip].y) / 2;
    const sx = ((lm[LM.lShoulder].x + lm[LM.rShoulder].x) / 2) * aspect;
    const hx = ((lm[LM.lHip].x + lm[LM.rHip].x) / 2) * aspect;
    return Math.hypot(sx - hx, sy - hy);
  };
  if (prev.length < 29 || cur.length < 29) return 0;
  const t = torso(cur);
  if (t < 0.02) return 0;
  let sum = 0;
  for (const i of ENERGY_JOINTS) {
    if (prev[i].visibility <= MIN_VISIBILITY || cur[i].visibility <= MIN_VISIBILITY) continue;
    sum += Math.hypot((cur[i].x - prev[i].x) * aspect, cur[i].y - prev[i].y);
  }
  return sum / t;
}

/** Até +20 pontos por pose; no máximo 10 quando a nota ficou abaixo de "Quase". */
export function energyPoints(totalMovement: number, rating: Rating): number {
  const pts = Math.round(Math.min(1, Math.max(0, totalMovement) / ENERGY_FULL) * ENERGY_MAX_POINTS);
  return rating === 'tenteiDeNovo' ? Math.min(pts, ENERGY_MAX_LOW) : pts;
}

/** Guarda a melhor nota de um evento dentro da janela de tempo. */
export class EventJudge {
  bestDiff: number | null = null;
  private samples = 0;
  readonly start: number;
  readonly end: number;

  constructor(
    readonly event: ChoreoEvent,
    readonly target: Angles,
    /** Tempo da batida e do fim da segurada, em segundos de música. */
    beatTime: number,
    holdEndTime: number,
    private readonly th: Thresholds = DEFAULT_THRESHOLDS,
  ) {
    this.start = beatTime - WINDOW_S;
    this.end = Math.max(beatTime, holdEndTime) + WINDOW_S;
  }

  feed(t: number, measured: Angles, vis: Partial<Record<AngleName, number>>): void {
    if (t < this.start || t > this.end) return;
    const d = poseDiff(measured, vis, this.target);
    this.samples++;
    if (d !== null && (this.bestDiff === null || d < this.bestDiff)) this.bestDiff = d;
  }

  isOver(t: number): boolean {
    return t > this.end;
  }

  get sampleCount(): number {
    return this.samples;
  }

  result(totalMovement: number): PoseResult {
    const { rating, points } = rate(this.bestDiff, this.th);
    return {
      event: this.event,
      bestDiff: this.bestDiff ?? -1,
      rating,
      points,
      energy: energyPoints(totalMovement, rating),
    };
  }
}
