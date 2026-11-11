// Cliente HTTP enxuto para o placar público opcional.
// Este é o ÚNICO módulo do jogo que faz chamadas de rede (/api/*), e somente quando placarAtivo === true.
import type { Nivel } from '../core/types';
import type { Choreo } from '../data/schema';
import { PUBLIC_SONG_IDS } from '../data/songs';
import type { PlayConfig } from '../game/match';

export interface IniciarPartidaParams {
  musica: string;
  nivel: Nivel;
  versao?: number;
}

export interface EnviarPontuacaoParams {
  ficha: string;
  apelido: string;
  pontos: number;
  estrelas: 1 | 2 | 3;
  perfeitos: number;
  poses: number;
}

export interface RespostaPontuacao {
  ok: boolean;
  id?: number;
  posicaoSemana: number;
  top10: boolean;
  semana?: string;
}

/**
 * Uma partida só é elegível ao placar público se:
 * - for uma das músicas públicas sintetizadas (PUBLIC_SONG_IDS, origem === 'demo');
 * - estiver no modo 'show' (não é treino);
 * - não for modo dupla, estátua ou história.
 */
export function musicaElegivelPlacar(cfg: PlayConfig, choreo: Choreo): boolean {
  if (cfg.modo !== 'show') return false;
  if (cfg.dupla || cfg.estatua || cfg.historia !== undefined) return false;
  if (choreo.origem !== 'demo') return false;
  return (PUBLIC_SONG_IDS as readonly string[]).includes(choreo.id);
}

/**
 * Pede uma ficha de partida assinada ao servidor quando o placar está ativo.
 * Se placarAtivo for false ou houver falha de rede, devolve null silenciosamente.
 */
export async function iniciarPartidaPlacar(
  placarAtivo: boolean,
  params: IniciarPartidaParams,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  if (!placarAtivo) return null;
  try {
    const res = await fetchFn('/api/partidas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        musica: params.musica,
        nivel: params.nivel,
        versao: params.versao ?? 1,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; ficha?: string };
    return data.ok && typeof data.ficha === 'string' ? data.ficha : null;
  } catch {
    return null;
  }
}

/**
 * Envia a pontuação final ao placar público quando o placar está ativo.
 * Se placarAtivo for false ou houver falha de rede, devolve null silenciosamente.
 */
export async function enviarPontuacaoPlacar(
  placarAtivo: boolean,
  params: EnviarPontuacaoParams,
  fetchFn: typeof fetch = fetch,
): Promise<RespostaPontuacao | null> {
  if (!placarAtivo) return null;
  try {
    const res = await fetchFn('/api/pontuacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ficha: params.ficha,
        apelido: params.apelido,
        pontos: Math.round(params.pontos),
        estrelas: params.estrelas,
        perfeitos: Math.round(params.perfeitos),
        poses: Math.round(params.poses),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<RespostaPontuacao>;
    if (!data.ok || typeof data.posicaoSemana !== 'number') return null;
    return {
      ok: true,
      id: data.id,
      posicaoSemana: data.posicaoSemana,
      top10: Boolean(data.top10),
      semana: data.semana,
    };
  } catch {
    return null;
  }
}
