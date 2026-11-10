import './style.css';
import { BASE_H, BASE_W, Engine, type Scene } from './game/engine';
import { COR, fillView, text, verticalGradient } from './game/draw/util';

const canvas = document.getElementById('palco') as HTMLCanvasElement;
const engine = new Engine(canvas);

const titulo: Scene = {
  name: 'titulo',
  update() {},
  draw(g, v) {
    fillView(g, v, verticalGradient(g, v, COR.roxo, '#c038c0'));
    text(g, 'Ensaio de Dança', BASE_W / 2, BASE_H / 2, { size: 96, outline: COR.roxo });
  },
};
engine.onSceneChange = (name) => {
  document.body.dataset.cena = name;
};
engine.setScene(titulo);
engine.start();
