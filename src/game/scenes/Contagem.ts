// Contagem "3, 2, 1" falada, antes de a música começar.
import { drawMirror, drawSkeleton, mirrorMapper, type Rect } from '../draw/mirror';
import { drawScenario } from '../draw/scenery';
import { COR, clamp, easeOutBack, text } from '../draw/util';
import { BASE_W, type Scene, type View } from '../engine';
import type { Game } from '../game';
import type { MatchSetup } from '../match';
import { T } from '../texts';

const MIRROR: Rect = { x: 307, y: 16, w: 666, h: 500 };
const STEP_SECONDS = 0.9;

export class ContagemScene implements Scene {
  readonly name = 'contagem';
  private age = 0;
  private said = -1;

  constructor(
    private readonly game: Game,
    private readonly setup: MatchSetup,
  ) {}

  update(dt: number): void {
    this.age += dt;
    const step = Math.floor(this.age / STEP_SECONDS);
    if (step !== this.said && step < 3) {
      this.said = step;
      this.game.sfx.play('tick');
      this.game.narrator.say(T.contagem[step], { caption: false, interrupt: true });
    }
    if (step >= 3) {
      this.game.sfx.play('go');
      this.game.go('danca', this.setup);
    }
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const game = this.game;
    drawScenario(g, v, game.cenario, game.time * 2);
    const aspect = game.tracker.aspect;
    drawMirror(g, MIRROR, game.mirrorVideo, aspect);
    const map = mirrorMapper(MIRROR, aspect);
    game.tracker.people.forEach((p) => drawSkeleton(g, p.lm, map, COR.amarelo));
    const step = Math.min(2, Math.floor(this.age / STEP_SECONDS));
    const k = clamp((this.age - step * STEP_SECONDS) / 0.3, 0, 1);
    text(g, T.contagem[step], BASE_W / 2, 270, {
      size: 300 * easeOutBack(k),
      color: COR.amarelo,
      outline: COR.roxo,
    });
    text(g, this.setup.choreo.title, BASE_W / 2, 620, { size: 60, outline: COR.roxo, maxWidth: 1100 });
  }
}
