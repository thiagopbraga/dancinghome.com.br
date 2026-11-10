// Regras puras do editor de seções da Área dos Pais: marcar onde cada parte da música começa.
import type { Choreo, NivelDef } from './schema';

export const PARTES = ['intro', 'verso', 'refrao', 'verso2', 'refrao2'] as const;
export type Parte = (typeof PARTES)[number];
export type Marcas = Record<Parte, number>;

export const NOME_PARTE: Record<Parte, string> = {
  intro: 'Introdução',
  verso: 'Verso 1',
  refrao: 'Refrão 1',
  verso2: 'Verso 2',
  refrao2: 'Refrão 2',
};

/** Quantas batidas inteiras cabem no arquivo de áudio, contando do início da batida (offsetMs). */
export function beatsInAudio(durationS: number, bpm: number, offsetMs: number): number {
  return Math.max(1, Math.floor(((durationS - offsetMs / 1000) * bpm) / 60));
}

/** Tempo (em segundos de música) arredondado para a batida mais próxima, nunca negativo. */
export function nearestBeat(beat: number): number {
  return Math.max(0, Math.round(beat));
}

/** Marcações atuais de uma coreografia (lidas do nível normal; o que faltar vem do fácil). */
export function marksOf(choreo: Choreo): Marcas {
  const find = (nome: string): number | undefined =>
    choreo.niveis.normal?.secoes?.find((s) => s.nome === nome)?.inicioBeat ??
    choreo.niveis.facil?.secoes?.find((s) => s.nome === nome)?.inicioBeat;
  const intro = find('intro') ?? 0;
  const verso = find('verso') ?? intro + 16;
  const refrao = find('refrao') ?? verso + 64;
  const verso2 = find('verso2') ?? refrao + 64;
  const refrao2 = find('refrao2') ?? verso2 + 64;
  return { intro, verso, refrao, verso2, refrao2 };
}

/** Diz o que está errado nas marcações, ou null se estão boas. */
export function checkMarks(m: Marcas, duracaoBeats: number): string | null {
  for (let i = 1; i < PARTES.length; i++) {
    if (m[PARTES[i]] <= m[PARTES[i - 1]]) {
      return `"${NOME_PARTE[PARTES[i]]}" precisa começar depois de "${NOME_PARTE[PARTES[i - 1]]}".`;
    }
  }
  if (m.refrao2 + 16 > duracaoBeats) return 'O Refrão 2 está perto demais do fim da música.';
  return null;
}

function comSecoes(def: NivelDef | undefined, inicio: Record<string, number>): NivelDef | undefined {
  if (!def?.secoes) return def;
  return {
    ...def,
    secoes: def.secoes.map((s) => (inicio[s.nome] !== undefined ? { ...s, inicioBeat: inicio[s.nome] } : s)),
  };
}

/** Batida da pose final do nível normal: 8 batidas antes do fim, em múltiplo de 4. */
export function finalBeat(duracaoBeats: number): number {
  return Math.max(0, Math.floor((duracaoBeats - 8) / 4) * 4);
}

/**
 * Aplica as marcações: cada seção passa a começar onde o adulto marcou.
 * No fácil, o trecho vai até 16 batidas depois do começo do Verso 2 e a pose final fica 8 batidas antes disso.
 */
export function applyMarks(
  choreo: Choreo,
  m: Marcas,
  tempo: { bpm: number; offsetMs: number; duracaoBeats: number },
): Choreo {
  const dur = tempo.duracaoBeats;
  const fimFacil = Math.min(m.verso2 + 16, dur);
  const facil = comSecoes(choreo.niveis.facil, { ...m, final: Math.max(m.refrao + 4, fimFacil - 8) });
  const normal = comSecoes(choreo.niveis.normal, { ...m, final: Math.max(m.refrao2 + 4, finalBeat(dur)) });
  return {
    ...choreo,
    bpm: tempo.bpm,
    offsetMs: tempo.offsetMs,
    duracaoBeats: dur,
    calibrado: true,
    niveis: {
      facil: facil?.trecho ? { ...facil, trecho: { inicioBeat: 0, fimBeat: fimFacil } } : facil,
      normal,
    },
  };
}

/** Quando o áudio chega, a duração de verdade substitui a estimada e a pose final acompanha. */
export function fitToDuration(choreo: Choreo, duracaoBeats: number): Choreo {
  const normal = comSecoes(choreo.niveis.normal, {
    final: Math.max((marksOf(choreo).refrao2 ?? 0) + 4, finalBeat(duracaoBeats)),
  });
  return { ...choreo, duracaoBeats, niveis: { ...choreo.niveis, normal } };
}
