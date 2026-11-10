import './style.css';
import { BASE_H, BASE_W, Engine, type Scene } from './game/engine';
import { COR, fillView, text, verticalGradient } from './game/draw/util';
import { Game, readFlags } from './game/game';
import { MetronomoScene } from './game/scenes/Metronomo';
import { T } from './game/texts';

const canvas = document.getElementById('palco') as HTMLCanvasElement;
const engine = new Engine(canvas);
const flags = readFlags(location.search, import.meta.env.DEV);
const game = new Game(engine, flags);

engine.onSceneChange = (name) => {
  document.body.dataset.cena = name;
};

const titulo: Scene = {
  name: 'titulo',
  update() {},
  draw(g, v) {
    fillView(g, v, verticalGradient(g, v, COR.roxo, '#c038c0'));
    text(g, T.titulo, BASE_W / 2, BASE_H / 2, { size: 96, outline: COR.roxo });
  },
};

async function boot(): Promise<void> {
  if (import.meta.env.DEV && (flags.sim || flags.test)) {
    const { installTestApi } = await import('./game/testApi');
    installTestApi(game);
  }
  engine.setScene(flags.cena === 'metronomo' ? new MetronomoScene(game) : titulo);
  engine.start();
}

void boot();
