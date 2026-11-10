import './style.css';
import { enterFullscreen, FpsWatch, ScreenAwake, watchOrientation } from './core/device';
import { Engine } from './game/engine';
import { drawCaption } from './game/draw/caption';
import { Companions } from './game/companions';
import { drawDebug } from './game/debug';
import { Game, readFlags } from './game/game';
import { registerScenes } from './game/scenes';

const canvas = document.getElementById('palco') as HTMLCanvasElement;
const engine = new Engine(canvas);
const flags = readFlags(location.search, import.meta.env.DEV);
const game = new Game(engine, flags);
registerScenes(game);

const companions = new Companions(game);
game.companions = companions;
game.onPerfect = () => companions.onPerfect();
game.drawCompanions = (g, v, beat, pose, where) => companions.draw(g, v, beat, pose, where);
const awake = new ScreenAwake();
const fpsWatch = new FpsWatch();
game.onStart = () => {
  // os testes automáticos não entram em tela cheia, para a janela não mudar de tamanho
  if (!flags.sim && !flags.test) void enterFullscreen();
};
game.onMusic = (playing) => awake.set(playing);
watchOrientation(document.getElementById('gire') as HTMLElement, () => engine.scene?.interrupt?.());

engine.onSceneChange = (name) => {
  document.body.dataset.cena = name;
};
engine.beforeUpdate = (dt) => {
  game.time += dt;
  game.narrator.update(dt);
  companions.update(dt);
  // celular lento: detecta a pose em quadros alternados
  if (game.poseState === 'pronta' && !flags.sim) game.tracker.alternate = fpsWatch.update(dt);
  game.tracker.update(game.audio.clock?.now() ?? game.time);
};
engine.afterDraw = (g, v) => {
  drawCaption(g, game.narrator.caption?.text ?? null, engine.scene?.name === 'menu');
  if (flags.debug) drawDebug(g, v, game);
};

async function boot(): Promise<void> {
  if (import.meta.env.DEV && (flags.sim || flags.test)) {
    const { installTestApi } = await import('./game/testApi');
    installTestApi(game);
  }
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  }
  await game.init();
  if (flags.cena === 'metronomo') game.go('metronomo');
  else game.go('inicio', flags.cena ?? undefined);
  engine.start();
}

void boot();
