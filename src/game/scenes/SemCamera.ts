// Tela amigável para quando a câmera não pôde ser ligada.
import { drawBackdrop } from '../draw/backdrop';
import { COR, roundRect, text, textBlock } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { T } from '../texts';
import { ButtonSet } from '../ui';

export class SemCameraScene implements Scene {
  readonly name = 'semCamera';
  readonly ui: ButtonSet;
  private retrying = false;

  constructor(
    private readonly game: Game,
    private readonly voltarPara: string,
  ) {
    this.ui = new ButtonSet([
      {
        id: 'tentar',
        x: BASE_W / 2 - 220,
        y: 520,
        w: 440,
        h: 120,
        label: T.camera.tentar,
        color: COR.roxoClaro,
        touchOnly: true,
        onSelect: () => this.retry(),
      },
    ]);
  }

  private retry(): void {
    if (this.retrying) return;
    this.retrying = true;
    this.game.poseState = 'desligada';
    void this.game.startPose().then(() => {
      this.retrying = false;
      if (this.game.poseState === 'pronta') this.game.go(this.voltarPara);
    });
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    this.ui.pointer(kind, x, y);
  }

  update(dt: number): void {
    this.ui.update(dt, []);
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    drawBackdrop(g, v, this.game.time, '#24306b', '#5b6fd6');
    // desenho de uma câmera
    const cx = BASE_W / 2;
    roundRect(g, cx - 110, 90, 220, 150, 30);
    g.fillStyle = COR.branco;
    g.fill();
    g.beginPath();
    g.arc(cx, 165, 48, 0, Math.PI * 2);
    g.fillStyle = COR.roxoClaro;
    g.fill();
    g.beginPath();
    g.arc(cx, 165, 22, 0, Math.PI * 2);
    g.fillStyle = COR.azul;
    g.fill();
    text(g, T.camera.titulo, cx, 310, { size: 54, maxWidth: 1180, outline: COR.roxo });
    const msg = this.game.cameraProblem === 'semCamera' ? T.camera.semCamera : T.camera.texto;
    textBlock(g, this.retrying ? T.preparandoCamera : msg, cx, 390, 1000, { size: 36 });
    this.ui.draw(g);
  }
}
