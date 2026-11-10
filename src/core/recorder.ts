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
