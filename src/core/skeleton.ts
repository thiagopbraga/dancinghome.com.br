// Esqueleto 2D montado a partir dos 8 ângulos. Usado pelo boneco dos cartões e pela pose simulada.
// Espaço do corpo: origem no meio dos quadris, y para baixo, unidade = altura do tronco.
// O lado esquerdo da pessoa fica em +x, como numa imagem de câmera sem espelhar.
import type { AngleName, Angles, Landmark } from './types';

export interface Pt {
  x: number;
  y: number;
}

export type JointName =
  | 'nose'
  | 'lShoulder'
  | 'rShoulder'
  | 'lElbow'
  | 'rElbow'
  | 'lWrist'
  | 'rWrist'
  | 'lHip'
  | 'rHip'
  | 'lKnee'
  | 'rKnee'
  | 'lAnkle'
  | 'rAnkle';

export type Skeleton = Record<JointName, Pt>;

/** Índices do MediaPipe Pose (33 pontos). */
export const LM = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lIndex: 19,
  rIndex: 20,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
} as const;

/** Os 12 pontos principais usados na calibração. */
export const MAIN_POINTS: readonly number[] = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];

/** Pose de descanso para os ângulos que a pose-alvo não lista. */
export const REST: Record<AngleName, number> = {
  lShoulder: 14,
  rShoulder: 14,
  lElbow: 172,
  rElbow: 172,
  lHip: 172,
  rHip: 172,
  lKnee: 176,
  rKnee: 176,
};

export const BODY = {
  shoulderHalf: 0.36,
  hipHalf: 0.22,
  upperArm: 0.5,
  forearm: 0.46,
  thigh: 0.78,
  shin: 0.74,
  headUp: 0.36,
};

const RAD = Math.PI / 180;

function rotate(v: Pt, deg: number): Pt {
  const c = Math.cos(deg * RAD);
  const s = Math.sin(deg * RAD);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function unit(from: Pt, to: Pt): Pt {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function along(from: Pt, dir: Pt, len: number): Pt {
  return { x: from.x + dir.x * len, y: from.y + dir.y * len };
}

/**
 * Um segmento que sai de `joint` formando `angle` graus com a direção joint→ref.
 * Das duas soluções possíveis, fica a que maximiza `score`.
 */
function limb(joint: Pt, ref: Pt, angle: number, len: number, score: (d: Pt) => number): Pt {
  const base = unit(joint, ref);
  const a = rotate(base, angle);
  const b = rotate(base, -angle);
  return along(joint, score(a) >= score(b) ? a : b, len);
}

export function buildSkeleton(angles: Angles): Skeleton {
  const a = { ...REST, ...angles };
  const lShoulder = { x: BODY.shoulderHalf, y: -1 };
  const rShoulder = { x: -BODY.shoulderHalf, y: -1 };
  const lHip = { x: BODY.hipHalf, y: 0 };
  const rHip = { x: -BODY.hipHalf, y: 0 };
  // Braço: abre para fora; antebraço: dobra para o lado de dentro do corpo.
  const lElbow = limb(lShoulder, lHip, a.lShoulder, BODY.upperArm, (d) => d.x);
  const rElbow = limb(rShoulder, rHip, a.rShoulder, BODY.upperArm, (d) => -d.x);
  const lWrist = limb(lElbow, lShoulder, a.lElbow, BODY.forearm, (d) => -d.x);
  const rWrist = limb(rElbow, rShoulder, a.rElbow, BODY.forearm, (d) => d.x);
  // Coxa: abre para fora; canela: aponta para baixo.
  const lKnee = limb(lHip, lShoulder, a.lHip, BODY.thigh, (d) => d.x);
  const rKnee = limb(rHip, rShoulder, a.rHip, BODY.thigh, (d) => -d.x);
  const lAnkle = limb(lKnee, lHip, a.lKnee, BODY.shin, (d) => d.y);
  const rAnkle = limb(rKnee, rHip, a.rKnee, BODY.shin, (d) => d.y);
  return {
    nose: { x: 0, y: -1 - BODY.headUp },
    lShoulder,
    rShoulder,
    lElbow,
    rElbow,
    lWrist,
    rWrist,
    lHip,
    rHip,
    lKnee,
    rKnee,
    lAnkle,
    rAnkle,
  };
}

export interface Placement {
  /** Centro dos quadris no quadro, normalizado 0..1. */
  cx: number;
  cy: number;
  /** Altura do tronco como fração da altura do quadro. */
  scale: number;
  /** Largura / altura do quadro. */
  aspect: number;
  visibility?: number;
}

/** Converte o esqueleto nos 33 pontos do MediaPipe, em coordenadas normalizadas do quadro. */
export function skeletonToLandmarks(sk: Skeleton, p: Placement): Landmark[] {
  const vis = p.visibility ?? 0.98;
  const put = (pt: Pt): Landmark => ({
    x: p.cx + (pt.x * p.scale) / p.aspect,
    y: p.cy + pt.y * p.scale,
    z: 0,
    visibility: vis,
  });
  const lm: Landmark[] = [];
  const nose = put(sk.nose);
  for (let i = 0; i < 33; i++) lm.push({ ...nose });
  // Rosto: pontos em volta do nariz.
  const face = 0.06 * p.scale;
  for (let i = 1; i <= 10; i++) {
    const side = i <= 3 || i === 7 || i === 9 ? 1 : -1;
    lm[i] = {
      ...nose,
      x: nose.x + (side * face) / p.aspect,
      y: nose.y - (i <= 6 ? face * 0.5 : -face * 0.6),
    };
  }
  lm[LM.lShoulder] = put(sk.lShoulder);
  lm[LM.rShoulder] = put(sk.rShoulder);
  lm[LM.lElbow] = put(sk.lElbow);
  lm[LM.rElbow] = put(sk.rElbow);
  lm[LM.lWrist] = put(sk.lWrist);
  lm[LM.rWrist] = put(sk.rWrist);
  lm[LM.lHip] = put(sk.lHip);
  lm[LM.rHip] = put(sk.rHip);
  lm[LM.lKnee] = put(sk.lKnee);
  lm[LM.rKnee] = put(sk.rKnee);
  lm[LM.lAnkle] = put(sk.lAnkle);
  lm[LM.rAnkle] = put(sk.rAnkle);
  // Mãos: um pouco além do pulso, na direção do antebraço.
  const hand = (elbow: Pt, wrist: Pt): Landmark => put(along(wrist, unit(elbow, wrist), 0.12));
  const lHand = hand(sk.lElbow, sk.lWrist);
  const rHand = hand(sk.rElbow, sk.rWrist);
  for (const i of [17, 19, 21]) lm[i] = { ...lHand };
  for (const i of [18, 20, 22]) lm[i] = { ...rHand };
  // Pés: logo abaixo dos tornozelos.
  const foot = (ankle: Pt, dx: number): Landmark => put({ x: ankle.x + dx, y: ankle.y + 0.08 });
  lm[29] = foot(sk.lAnkle, 0);
  lm[31] = foot(sk.lAnkle, 0.1);
  lm[30] = foot(sk.rAnkle, 0);
  lm[32] = foot(sk.rAnkle, -0.1);
  return lm;
}
