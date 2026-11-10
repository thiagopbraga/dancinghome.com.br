// Primeira tela: o toque em "Começar" libera o som, a tela cheia e a câmera.
import { drawBackdrop } from '../draw/backdrop';
import { COR, drawStar, text } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { T } from '../texts';
import { ButtonSet } from '../ui';

export class InicioScene implements Scene {
  readonly name = 'inicio';
  readonly ui: ButtonSet;

  constructor(
    private readonly game: Game,
    private readonly destino: string,
  ) {
    this.ui = new ButtonSet([
      {
        id: 'comecar',
        x: BASE_W / 2 - 230,
        y: 400,
        w: 460,
        h: 150,
        label: T.comecar,
        fontSize: 72,
        color: COR.rosa,
        touchOnly: true,
        onSelect: () => this.start(),
      },
    ]);
  }

  private start(): void {
    const game = this.game;
    game.audio.ensure();
    game.sfx.play('select');
    game.onStart?.();
    void game.startPose();
    game.go(this.destino);
  }

  key(code: string): void {
    if (code === 'Enter' || code === 'Space') this.start();
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    this.ui.pointer(kind, x, y);
  }

  update(dt: number): void {
    this.ui.update(dt, []);
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const t = this.game.time;
    drawBackdrop(g, v, t);
    drawStar(g, BASE_W / 2, 130, 70 + 6 * Math.sin(t * 3), true, Math.sin(t) * 0.15);
    text(g, T.titulo, BASE_W / 2, 280, { size: 104, outline: COR.roxo, maxWidth: 1180 });
    this.ui.draw(g);
    if (this.game.dataErrors.length > 0) {
      text(g, T.erroDados, BASE_W / 2, 600, { size: 26, color: COR.amarelo });
      this.game.dataErrors
        .slice(0, 2)
        .forEach((e, i) => text(g, e, BASE_W / 2, 634 + i * 30, { size: 22, maxWidth: 1200 }));
    }
  }
}
