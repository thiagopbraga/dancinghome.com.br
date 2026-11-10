// expandSections(): transforma as seções de uma coreografia na lista de eventos por batida.
import type { Catalog, ChoreoEvent, Nivel } from '../core/types';
import type { Choreo, PoseRef } from './schema';

/** A primeira pose nunca cai antes desta batida (contada do início do trecho). */
export const MIN_FIRST_BEAT = 4;

export function levelRange(choreo: Choreo, nivel: Nivel): { inicio: number; fim: number } {
  const trecho = choreo.niveis[nivel]?.trecho;
  const inicio = trecho?.inicioBeat ?? 0;
  const fim = Math.min(trecho?.fimBeat ?? choreo.duracaoBeats, choreo.duracaoBeats);
  return { inicio, fim: Math.max(fim, inicio) };
}

function refToPose(ref: PoseRef): { pose: string; mirror: boolean } {
  return typeof ref === 'string'
    ? { pose: ref, mirror: false }
    : { pose: ref.pose, mirror: ref.mirror ?? false };
}

export function expandSections(choreo: Choreo, nivel: Nivel): ChoreoEvent[] {
  const def = choreo.niveis[nivel];
  if (!def) return [];
  const { inicio, fim } = levelRange(choreo, nivel);
  const primeira = inicio + MIN_FIRST_BEAT;
  let events: ChoreoEvent[] = [];

  if (def.eventos && def.eventos.length > 0) {
    // Regra 5: "eventos" prontos (formato do gravador) vencem as seções.
    events = def.eventos.map((e) => ({
      beat: e.beat,
      pose: e.pose,
      mirror: e.mirror ?? false,
      holdBeats: e.holdBeats ?? 0,
      secao: e.secao ?? 'gravada',
    }));
  } else {
    const secoes = [...(def.secoes ?? [])].sort((a, b) => a.inicioBeat - b.inicioBeat);
    secoes.forEach((sec, i) => {
      // Regra 1: a seção vai até o início da próxima, o fim do trecho ou a duração.
      const end = Math.min(secoes[i + 1]?.inicioBeat ?? fim, fim);
      const from = Math.max(sec.inicioBeat, primeira);
      const k0 = Math.max(0, Math.ceil((from - sec.inicioBeat) / sec.aCada - 1e-9));
      const beats: number[] = [];
      for (let k = k0; sec.inicioBeat + k * sec.aCada < end - 1e-9; k++)
        beats.push(sec.inicioBeat + k * sec.aCada);
      // Regra 4: a segurada precisa caber na seção.
      if (sec.segurar) {
        while (beats.length > 1 && beats[beats.length - 1] + sec.segurar > end + 1e-9) beats.pop();
      }
      beats.forEach((beat, j) => {
        // Regras 2 e 3: uma pose a cada aCada batidas, percorrendo a lista em ciclo.
        const { pose, mirror } = refToPose(sec.poses[j % sec.poses.length]);
        const last = j === beats.length - 1;
        events.push({
          beat,
          pose,
          mirror,
          holdBeats: last && sec.segurar ? sec.segurar : 0,
          secao: sec.nome,
        });
      });
    });
  }

  events.sort((a, b) => a.beat - b.beat);
  const out: ChoreoEvent[] = [];
  let holdUntil = -Infinity;
  for (const e of events) {
    // Regra 6: nada antes da batida 4; e nada fora do trecho.
    if (e.beat < primeira - 1e-9 || e.beat >= fim - 1e-9) continue;
    // Regra 4: nenhuma pose nova entra durante uma segurada.
    if (e.beat < holdUntil - 1e-9) continue;
    out.push(e);
    if (e.holdBeats > 0) holdUntil = e.beat + e.holdBeats;
  }
  return out;
}

/** Confere se a coreografia só cita poses que existem no catálogo. */
export function missingPoses(choreo: Choreo, catalog: Catalog): string[] {
  const missing = new Set<string>();
  for (const nivel of ['facil', 'normal'] as const) {
    const def = choreo.niveis[nivel];
    if (!def) continue;
    for (const sec of def.secoes ?? []) {
      for (const ref of sec.poses) {
        const { pose } = refToPose(ref);
        if (!catalog[pose]) missing.add(pose);
      }
    }
    for (const e of def.eventos ?? []) if (!catalog[e.pose]) missing.add(e.pose);
  }
  return [...missing];
}
