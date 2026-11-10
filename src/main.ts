import './style.css';
import { Engine } from './game/engine';
import { drawCaption } from './game/draw/caption';
import { drawDebug } from './game/debug';
import { Game, readFlags } from './game/game';
import { registerScenes } from './game/scenes';

const canvas = document.getElementById('palco') as HTMLCanvasElement;
const engine = new Engine(canvas);
const flags = readFlags(location.search, import.meta.env.DEV);
const game = new Game(engine, flags);
registerScenes(game);

engine.onSceneChange = (name) => {
  document.body.dataset.cena = name;
};
engine.beforeUpdate = (dt) => {
  game.time += dt;
  game.narrator.update(dt);
  game.tracker.update(game.audio.clock?.now() ?? game.time);
};
engine.afterDraw = (g, v) => {
  drawCaption(g, game.narrator.caption?.text ?? null);
  if (flags.debug) drawDebug(g, v, game);
};

async function boot(): Promise<void> {
  if (import.meta.env.DEV && (flags.sim || flags.test)) {
    const { installTestApi } = await import('./game/testApi');
    installTestApi(game);
  }
  await game.init();
  if (flags.cena === 'metronomo') game.go('metronomo');
  else game.go('inicio', flags.cena ?? undefined);
  engine.start();
}

void boot();
