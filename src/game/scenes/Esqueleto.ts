// Prova de conceito da etapa 3: vídeo espelhado com o esqueleto por cima (?cena=esqueleto).
import { drawMirror, drawSkeleton, mirrorMapper } from '../draw/mirror';
import { COR, text } from '../draw/util';
import { BASE_H, BASE_W, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { T } from '../texts';

export class EsqueletoScene implements Scene {
  readonly name = 'esqueleto';

  constructor(private readonly game: Game) {}

  update(): void {
    if (this.game.poseState === 'erro') this.game.go('semCamera', 'esqueleto');
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const rect = { x: v.left, y: v.top, w: v.right - v.left, h: v.bottom - v.top };
    const aspect = this.game.tracker.aspect;
    drawMirror(g, rect, this.game.mirrorVideo, aspect, 0);
    const map = mirrorMapper(rect, aspect);
    const cores = [COR.amarelo, COR.azul];
    this.game.tracker.people.forEach((p, i) => drawSkeleton(g, p.lm, map, cores[i % 2]));
    if (this.game.poseState === 'carregando') {
      text(g, T.preparandoCamera, BASE_W / 2, BASE_H / 2, { size: 56, outline: COR.roxo });
    }
  }
}
