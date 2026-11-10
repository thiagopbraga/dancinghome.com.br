// window.__ensaio: ganchos de teste. Só existe no servidor de desenvolvimento, com ?sim=1 ou ?test=1.
import type { SimAction, SimGesture } from '../core/simPose';
import type { Landmark } from '../core/types';
import { debugLines } from './debug';
import type { Game } from './game';
import type { ButtonSet } from './ui';

function sceneUi(game: Game): ButtonSet | undefined {
  return (game.engine.scene as { ui?: ButtonSet } | null)?.ui;
}

export function installTestApi(game: Game) {
  const api = {
    game,
    cena: () => game.engine.scene?.name ?? '',
    beat: () => game.audio.clock?.beat() ?? 0,
    /** Tempo do AudioContext e batida no mesmo instante, para medir a precisão do relógio. */
    amostra: () => ({
      ctx: game.audio.ctx?.currentTime ?? 0,
      beat: game.audio.clock?.beat() ?? 0,
      tocando: !!game.audio.clock?.running,
    }),
    pose: () => ({
      estado: game.poseState,
      pessoas: game.tracker.people.length,
      quadros: game.tracker.frames,
    }),
    ponto: (i: number, pessoa = 0): Landmark | null => game.tracker.people[pessoa]?.lm[i] ?? null,
    angulos: (pessoa = 0) => game.tracker.people[pessoa]?.angles ?? null,
    debug: () => debugLines(game),
    botoes: () =>
      (sceneUi(game)?.buttons ?? [])
        .filter((b) => !b.hidden)
        .map((b) => ({ id: b.id, x: b.x, y: b.y, w: b.w, h: b.h, label: b.label, disabled: !!b.disabled })),
    /** Gesto simulado: põe a mão em cima do botão (o jogo escolhe depois de 1 s). */
    apontar: (id: string, pessoa = 0): boolean => {
      const b = sceneUi(game)?.find(id);
      if (!b || !game.sim) return false;
      game.sim.scripts[pessoa].gesto = { tipo: 'mao', x: b.x + b.w / 2, y: b.y + b.h / 2 };
      return true;
    },
    gesto: (g: SimGesture | null, pessoa = 0): void => {
      if (game.sim) game.sim.scripts[pessoa].gesto = g;
    },
    /** Escolhe o roteiro da pessoa simulada: ação padrão e ações por índice de evento. */
    roteiro: (padrao: SimAction, porEvento: Record<number, SimAction> = {}, pessoa = 0): void => {
      if (!game.sim) return;
      const s = game.sim.scripts[pessoa];
      s.padrao = padrao;
      s.porEvento = porEvento;
    },
    sim: () => game.sim,
  };
  window.__ensaio = api;
  return api;
}

export type EnsaioApi = ReturnType<typeof installTestApi>;

declare global {
  interface Window {
    __ensaio?: EnsaioApi;
  }
}
