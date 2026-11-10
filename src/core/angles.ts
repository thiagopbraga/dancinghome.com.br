// Os 8 ângulos em 2D a partir dos 33 pontos do MediaPipe. Funções puras.
import { LM } from './skeleton';
import { ANGLE_NAMES, type AngleName, type Angles, type Landmark } from './types';

export interface P2 {
  x: number;
  y: number;
}

/** Ângulo em graus (0..180) no ponto b, entre os pontos a e c. */
export function angleAt(a: P2, b: P2, c: P2): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y);
  if (n < 1e-12) return 0;
  const cos = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / n));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** [vértice, ponta 1, ponta 2] de cada ângulo. */
export const ANGLE_POINTS: Record<AngleName, readonly [number, number, number]> = {
  lShoulder: [LM.lShoulder, LM.lHip, LM.lElbow],
  rShoulder: [LM.rShoulder, LM.rHip, LM.rElbow],
  lElbow: [LM.lElbow, LM.lShoulder, LM.lWrist],
  rElbow: [LM.rElbow, LM.rShoulder, LM.rWrist],
  lHip: [LM.lHip, LM.lShoulder, LM.lKnee],
  rHip: [LM.rHip, LM.rShoulder, LM.rKnee],
  lKnee: [LM.lKnee, LM.lHip, LM.lAnkle],
  rKnee: [LM.rKnee, LM.rHip, LM.rAnkle],
};

export interface MeasuredAngles {
  angles: Record<AngleName, number>;
  /** Visibilidade de cada ângulo: a menor entre os três pontos usados. */
  vis: Record<AngleName, number>;
}

/**
 * Calcula os 8 ângulos usando só x e y (x multiplicado pela razão largura/altura do vídeo),
 * porque a profundidade da câmera frontal não é confiável.
 */
export function computeAngles(lm: Landmark[], aspect: number): MeasuredAngles {
  const angles = {} as Record<AngleName, number>;
  const vis = {} as Record<AngleName, number>;
  for (const name of ANGLE_NAMES) {
    const [b, a, c] = ANGLE_POINTS[name];
    const pb = lm[b];
    const pa = lm[a];
    const pc = lm[c];
    if (!pa || !pb || !pc) {
      angles[name] = 0;
      vis[name] = 0;
      continue;
    }
    angles[name] = angleAt(
      { x: pa.x * aspect, y: pa.y },
      { x: pb.x * aspect, y: pb.y },
      { x: pc.x * aspect, y: pc.y },
    );
    vis[name] = Math.min(pa.visibility, pb.visibility, pc.visibility);
  }
  return { angles, vis };
}

const MIRROR: Record<AngleName, AngleName> = {
  lShoulder: 'rShoulder',
  rShoulder: 'lShoulder',
  lElbow: 'rElbow',
  rElbow: 'lElbow',
  lHip: 'rHip',
  rHip: 'lHip',
  lKnee: 'rKnee',
  rKnee: 'lKnee',
};

/** Troca cada ângulo l* pelo r* correspondente. */
export function mirrorAngles(a: Angles): Angles {
  const out: Angles = {};
  for (const name of ANGLE_NAMES) {
    const v = a[name];
    if (v !== undefined) out[MIRROR[name]] = v;
  }
  return out;
}

/** Texto do painel de depuração: qual braço está mais levantado. */
export function raisedArmLabel(angles: Record<AngleName, number>): string {
  const d = angles.rShoulder - angles.lShoulder;
  if (d > 25) return 'braço direito';
  if (d < -25) return 'braço esquerdo';
  return 'braços na mesma altura';
}

export function meanVisibility(lm: Landmark[], points: readonly number[]): number {
  let sum = 0;
  for (const i of points) sum += lm[i]?.visibility ?? 0;
  return points.length ? sum / points.length : 0;
}
