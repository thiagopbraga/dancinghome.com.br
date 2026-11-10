// Regras puras de gravação de poses: média de ângulos e limpeza dos retratos.
import { ANGLE_NAMES, type AngleName, type Angles } from './types';

export interface AngleSample {
  angles: Partial<Record<AngleName, number>>;
  vis: Partial<Record<AngleName, number>>;
}

export const MIN_VIS = 0.5;

/**
 * Média dos ângulos pedidos em várias amostras. Amostras em que o ângulo não aparece bem são ignoradas;
 * se um ângulo aparece em menos de 60% das amostras, a gravação não vale (devolve null).
 */
export function averageAngles(
  samples: AngleSample[],
  names: readonly AngleName[] = ANGLE_NAMES,
  minVis = MIN_VIS,
): Angles | null {
  if (samples.length === 0 || names.length === 0) return null;
  const out: Angles = {};
  for (const name of names) {
    let sum = 0;
    let n = 0;
    for (const s of samples) {
      const v = s.angles[name];
      if (v === undefined || (s.vis[name] ?? 0) <= minVis) continue;
      sum += v;
      n++;
    }
    if (n < samples.length * 0.6) return null;
    out[name] = Math.round(sum / n);
  }
  return out;
}

/** Um retrato tirado numa batida, com os 8 ângulos medidos. */
export interface Snapshot extends AngleSample {
  beat: number;
}

const ARM: [AngleName, AngleName][] = [
  ['lShoulder', 'lElbow'],
  ['rShoulder', 'rElbow'],
];
const LEG: [AngleName, AngleName][] = [
  ['lHip', 'lKnee'],
  ['rHip', 'rKnee'],
];

/** Braço solto ao lado do corpo: ombro baixo e cotovelo quase reto. */
function armAtRest(shoulder: number, elbow: number): boolean {
  return shoulder < 28 && elbow > 150;
}

/** Perna parada, em pé: quadril e joelho quase retos (perto de 180°). */
function legAtRest(hip: number, knee: number): boolean {
  return hip > 155 && knee > 150;
}

/**
 * Limpa um retrato para virar pose: descarta quando os braços não aparecem bem,
 * tira os membros que não se mexeram (braço solto, perna em pé) e arredonda.
 * Devolve null quando não sobra nada (ela estava só em pé) ou a visibilidade é baixa.
 */
export function cleanSnapshot(s: AngleSample, minVis = MIN_VIS): Angles | null {
  const seen = (n: AngleName): boolean => s.angles[n] !== undefined && (s.vis[n] ?? 0) > minVis;
  // os braços são a base de toda pose: sem eles, o retrato não vale
  if (!ARM.every(([a, b]) => seen(a) && seen(b))) return null;
  const out: Angles = {};
  let moved = 0;
  for (const [sh, el] of ARM) {
    if (!armAtRest(s.angles[sh]!, s.angles[el]!)) moved++;
  }
  for (const [hip, knee] of LEG) {
    if (!seen(hip) || !seen(knee)) continue;
    if (legAtRest(s.angles[hip]!, s.angles[knee]!)) continue;
    out[hip] = Math.round(s.angles[hip]!);
    out[knee] = Math.round(s.angles[knee]!);
    moved++;
  }
  if (moved === 0) return null;
  // se algum membro se mexeu, os dois braços entram (um braço parado também faz parte do desenho da pose)
  for (const [sh, el] of ARM) {
    out[sh] = Math.round(s.angles[sh]!);
    out[el] = Math.round(s.angles[el]!);
  }
  return out;
}

/** Diferença média entre duas poses com os mesmos ângulos; Infinity se os conjuntos forem diferentes. */
export function poseDistance(a: Angles, b: Angles): number {
  const ka = ANGLE_NAMES.filter((n) => a[n] !== undefined);
  const kb = ANGLE_NAMES.filter((n) => b[n] !== undefined);
  if (ka.length === 0 || ka.length !== kb.length || ka.some((n) => b[n] === undefined)) return Infinity;
  let sum = 0;
  for (const n of ka) sum += Math.abs(a[n]! - b[n]!);
  return sum / ka.length;
}

export const SAME_POSE_DIFF = 15;

export interface RecordedPose {
  nome: string;
  nivel: 'facil' | 'normal';
  angles: Angles;
  descricao: string;
}

export interface Recording {
  /** Retratos aproveitados, na ordem, cada um apontando para uma pose. */
  eventos: { beat: number; pose: string }[];
  /** Poses que ainda não existiam no catálogo. */
  novas: Record<string, RecordedPose>;
  /** Retratos descartados (pouca visibilidade ou parada). */
  descartados: number;
}

/**
 * Transforma os retratos numa coreografia: reaproveita poses do catálogo que sejam parecidas
 * e cria poses novas para o resto (retratos parecidos entre si viram a mesma pose nova).
 */
export function buildRecording(
  snapshots: Snapshot[],
  catalog: Record<string, { angles: Angles }>,
  idPrefix: string,
): Recording {
  const eventos: Recording['eventos'] = [];
  const novas: Recording['novas'] = {};
  let descartados = 0;
  for (const s of snapshots) {
    const angles = cleanSnapshot(s);
    if (!angles) {
      descartados++;
      continue;
    }
    let best: string | null = null;
    let bestD = SAME_POSE_DIFF;
    for (const [id, def] of [...Object.entries(catalog), ...Object.entries(novas)]) {
      const d = poseDistance(angles, def.angles);
      if (d <= bestD) {
        best = id;
        bestD = d;
      }
    }
    if (!best) {
      const n = Object.keys(novas).length + 1;
      best = `${idPrefix}-${n}`;
      const pernas = LEG.some(([hip]) => angles[hip] !== undefined);
      novas[best] = {
        nome: `Pose nova ${n}`,
        nivel: pernas ? 'normal' : 'facil',
        angles,
        descricao: 'Pose criada no gravador',
      };
    }
    eventos.push({ beat: s.beat, pose: best });
  }
  return { eventos, novas, descartados };
}
