// window.__ensaio: ganchos de teste. Só existe no servidor de desenvolvimento, com ?sim=1 ou ?test=1.
import type { Game } from './game';

export interface EnsaioApi {
  game: Game;
  cena(): string;
  beat(): number;
  /** Tempo do AudioContext e batida no mesmo instante, para medir a precisão do relógio. */
  amostra(): { ctx: number; beat: number; tocando: boolean };
}

declare global {
  interface Window {
    __ensaio?: EnsaioApi & Record<string, unknown>;
  }
}

export function installTestApi(game: Game): EnsaioApi & Record<string, unknown> {
  const api: EnsaioApi & Record<string, unknown> = {
    game,
    cena: () => game.engine.scene?.name ?? '',
    beat: () => game.audio.clock?.beat() ?? 0,
    amostra: () => ({
      ctx: game.audio.ctx?.currentTime ?? 0,
      beat: game.audio.clock?.beat() ?? 0,
      tocando: !!game.audio.clock?.running,
    }),
  };
  window.__ensaio = api;
  return api;
}
