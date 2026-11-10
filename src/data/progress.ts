// Regras puras do progresso: recordes, total de estrelas e medalhas. Sem IndexedDB aqui.
import type { Summary } from '../core/stars';
import type { Progress } from './schema';

export interface MatchFacts {
  /** `${songId}:${nivel}`, ou null quando a partida não guarda recorde (treino e surpresa). */
  key: string | null;
  /** Resumo da melhor pessoa da partida. */
  summary: Summary;
  /** Pontos com o bônus da estátua. */
  pontos: number;
  treino: boolean;
  dupla: boolean;
  surpresa: boolean;
  /** Poses congeladas em que ela ficou parada. */
  estatuas: number;
}

export function totalStars(p: Progress): number {
  let n = 0;
  for (const m of Object.values(p.melhores)) n += m.estrelas;
  return n;
}

/** Melhor número de estrelas de uma música, em qualquer nível. */
export function bestStars(p: Progress, songId: string): number {
  let best = 0;
  for (const [key, m] of Object.entries(p.melhores)) {
    if (key.slice(0, key.lastIndexOf(':')) === songId) best = Math.max(best, m.estrelas);
  }
  return best;
}

/** Soma uma partida ao progresso. Devolve um progresso novo e se bateu o recorde daquela música e nível. */
export function applyMatch(p: Progress, f: MatchFacts): { progress: Progress; recorde: boolean } {
  const out: Progress = { ...p, melhores: { ...p.melhores }, conquistas: [...p.conquistas] };
  let recorde = false;
  out.perfeitos += f.summary.perfeitos;
  out.maiorSequencia = Math.max(out.maiorSequencia, f.summary.maiorSequencia);
  out.estatuas += f.estatuas;
  if (f.treino) {
    out.treinos += 1;
    return { progress: out, recorde };
  }
  out.musicasTocadas += 1;
  if (f.dupla) out.duplas += 1;
  if (f.surpresa) out.surpresas += 1;
  if (f.key) {
    const old = out.melhores[f.key];
    if (!old || f.pontos > old.pontos) {
      recorde = !!old;
      out.melhores[f.key] = {
        estrelas: Math.max(old?.estrelas ?? 1, f.summary.stars),
        pct: Math.max(old?.pct ?? 0, f.summary.pct),
        pontos: f.pontos,
      };
    } else if (f.summary.stars > old.estrelas) {
      out.melhores[f.key] = { ...old, estrelas: f.summary.stars, pct: Math.max(old.pct, f.summary.pct) };
    }
  }
  return { progress: out, recorde };
}

export interface Conquista {
  id: string;
  nome: string;
  descricao: string;
  ganhou: (p: Progress) => boolean;
}

export const CONQUISTAS: Conquista[] = [
  {
    id: 'estreia',
    nome: 'Estreia',
    descricao: 'Dançou a primeira música',
    ganhou: (p) => p.musicasTocadas >= 1,
  },
  {
    id: 'dez-musicas',
    nome: '10 músicas',
    descricao: 'Dançou 10 músicas',
    ganhou: (p) => p.musicasTocadas >= 10,
  },
  {
    id: 'cinco-seguidos',
    nome: '5 perfeitos seguidos',
    descricao: 'Fez 5 poses perfeitas em sequência',
    ganhou: (p) => p.maiorSequencia >= 5,
  },
  {
    id: 'cinquenta-perfeitos',
    nome: '50 perfeitos',
    descricao: 'Juntou 50 poses perfeitas',
    ganhou: (p) => p.perfeitos >= 50,
  },
  {
    id: 'tres-estrelas',
    nome: 'Três estrelas',
    descricao: 'Ganhou 3 estrelas numa música',
    ganhou: (p) => Object.values(p.melhores).some((m) => m.estrelas >= 3),
  },
  {
    id: 'colecionadora',
    nome: 'Colecionadora',
    descricao: 'Juntou 15 estrelas',
    ganhou: (p) => totalStars(p) >= 15,
  },
  {
    id: 'coreografa',
    nome: 'Coreógrafa',
    descricao: 'Criou a própria dança',
    ganhou: (p) => p.gravadas >= 1,
  },
  { id: 'treino', nome: 'Ensaio em dia', descricao: 'Treinou 3 vezes', ganhou: (p) => p.treinos >= 3 },
  { id: 'dupla', nome: 'Dupla de palco', descricao: 'Dançou em dupla', ganhou: (p) => p.duplas >= 1 },
  {
    id: 'estatua',
    nome: 'Estátua',
    descricao: 'Ficou parada em 3 poses congeladas',
    ganhou: (p) => p.estatuas >= 3,
  },
  {
    id: 'surpresa',
    nome: 'Surpresa',
    descricao: 'Dançou uma música surpresa',
    ganhou: (p) => p.surpresas >= 1,
  },
  {
    id: 'turne',
    nome: 'Turnê completa',
    descricao: 'Fez os 5 shows da turnê',
    ganhou: (p) => p.historia >= 5,
  },
];

/** Medalhas que o progresso já merece e ainda não estão na lista. */
export function newAchievements(p: Progress): Conquista[] {
  return CONQUISTAS.filter((c) => !p.conquistas.includes(c.id) && c.ganhou(p));
}

/** Itens (cenários, acessórios) liberados ao passar de `antes` para `depois` estrelas. */
export function unlockedBetween<T extends { estrelas: number }>(
  itens: T[],
  antes: number,
  depois: number,
): T[] {
  return itens.filter((i) => i.estrelas > antes && i.estrelas <= depois);
}
