// Modo surpresa: uma música qualquer do aparelho vira fase, com poses sorteadas do catálogo.
import type { Catalog, Nivel } from '../core/types';
import type { Choreo, Evento } from './schema';

/** Intervalo entre poses, em batidas, seguindo a regra das músicas base (mais batidas nas músicas rápidas). */
export function poseEvery(bpm: number, nivel: Nivel): number {
  const rapido = bpm >= 135;
  if (nivel === 'facil') return rapido ? 8 : 4;
  return rapido ? 4 : 2;
}

function sortear(
  catalog: Catalog,
  nivel: Nivel,
  inicio: number,
  fim: number,
  aCada: number,
  rng: () => number,
): Evento[] {
  const ids = Object.keys(catalog)
    .filter((id) => nivel === 'normal' || catalog[id].nivel === 'facil')
    .sort();
  const eventos: Evento[] = [];
  if (ids.length === 0) return eventos;
  let last = '';
  for (let beat = Math.max(inicio, Math.ceil(4 / aCada) * aCada); beat < fim - 2; beat += aCada) {
    let pose = ids[Math.floor(rng() * ids.length)];
    if (pose === last && ids.length > 1) pose = ids[(ids.indexOf(pose) + 1) % ids.length];
    last = pose;
    // de vez em quando, a versão espelhada
    eventos.push(rng() < 0.25 ? { beat, pose, mirror: true } : { beat, pose });
  }
  return eventos;
}

export function buildSurprise(
  opts: { id: string; title: string; bpm: number; offsetMs: number; durationS: number },
  catalog: Catalog,
  rng: () => number,
): Choreo {
  const dur = Math.max(8, Math.floor(((opts.durationS - opts.offsetMs / 1000) * opts.bpm) / 60));
  // no fácil, um trecho de até 75 s
  const fimFacil = Math.min(dur, Math.floor((75 * opts.bpm) / 60 / 4) * 4);
  return {
    id: opts.id,
    title: opts.title,
    tema: 'música surpresa',
    bpm: opts.bpm,
    offsetMs: opts.offsetMs,
    calibrado: false,
    duracaoBeats: dur,
    origem: 'surpresa',
    niveis: {
      facil: {
        trecho: { inicioBeat: 0, fimBeat: fimFacil },
        eventos: sortear(catalog, 'facil', 0, fimFacil, poseEvery(opts.bpm, 'facil'), rng),
      },
      normal: { eventos: sortear(catalog, 'normal', 0, dur, poseEvery(opts.bpm, 'normal'), rng) },
    },
  };
}
