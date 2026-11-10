// Calibração: a silhueta fica verde quando os 12 pontos principais aparecem e cabem na tela.
import { buildSkeleton, MAIN_POINTS } from '../../core/skeleton';
import type { TrackedPerson } from '../../core/tracker';
import { drawMirror, drawSkeleton, mirrorMapper, type Rect } from '../draw/mirror';
import { drawScenario } from '../draw/scenery';
import { COR, clamp, roundRect, text, textBlock } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import type { MatchSetup } from '../match';
import { T } from '../texts';
import { ButtonSet } from '../ui';

const MIRROR: Rect = { x: 280, y: 20, w: 720, h: 540 };
const HOLD_SECONDS = 1.5;
export const CALIB_MIN_VIS = 0.6;
export const LOW_LIGHT_VIS = 0.5;

/** Os 12 pontos principais visíveis acima de 0,6 e dentro da tela. */
export function bodyFits(person: TrackedPerson): boolean {
  for (const i of MAIN_POINTS) {
    const p = person.lm[i];
    if (!p || p.visibility <= CALIB_MIN_VIS) return false;
    if (p.x < 0.01 || p.x > 0.99 || p.y < 0.01 || p.y > 0.99) return false;
  }
  return true;
}

export class CalibracaoScene implements Scene {
  readonly name = 'calibracao';
  readonly ui: ButtonSet;
  ok = false;
  poucaLuz = false;
  private held = 0;
  private age = 0;
  private saidLight = false;

  constructor(
    private readonly game: Game,
    private readonly setup: MatchSetup,
  ) {
    this.ui = new ButtonSet([
      {
        id: 'pular',
        x: 1090,
        y: 610,
        w: 170,
        h: 90,
        label: T.calibracao.pular,
        fontSize: 30,
        color: COR.roxoClaro,
        touchOnly: true,
        onSelect: () => this.next(),
      },
    ]);
  }

  enter(): void {
    this.game.narrator.say(this.setup.cfg.dupla ? T.narrador.dupla : T.narrador.calibracao, {
      caption: false,
    });
  }

  private next(): void {
    this.game.go('contagem', this.setup);
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    this.ui.pointer(kind, x, y);
  }

  update(dt: number): void {
    const game = this.game;
    this.age += dt;
    this.ui.update(dt, []);
    if (game.poseState === 'erro') {
      game.go('semCamera', 'menu');
      return;
    }
    const need = this.setup.cfg.dupla ? 2 : 1;
    const people = game.tracker.people;
    this.ok = people.length >= need && people.slice(0, need).every(bodyFits);
    const seen = people[0];
    this.poucaLuz = !!seen && !this.ok && seen.meanVis < LOW_LIGHT_VIS;
    if (this.poucaLuz && !this.saidLight && this.age > 3) {
      this.saidLight = true;
      game.narrator.say(T.narrador.luz, { caption: false });
    }
    if (this.ok) {
      if (this.held === 0) {
        game.sfx.play('boa');
      }
      this.held += dt;
      if (this.held >= HOLD_SECONDS) {
        game.narrator.say(T.narrador.calibracaoOk, { caption: false });
        this.next();
      }
    } else {
      this.held = 0;
    }
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const game = this.game;
    drawScenario(g, v, game.cenario, game.time * 2);
    const aspect = game.tracker.aspect;
    drawMirror(g, MIRROR, game.mirrorVideo, aspect);
    const map = mirrorMapper(MIRROR, aspect);
    g.save();
    roundRect(g, MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h, 28);
    g.clip();
    // silhueta: contorno de um corpo inteiro em pé
    const color = this.ok ? COR.verde : 'rgba(255,255,255,0.85)';
    const n = this.setup.cfg.dupla ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const cx = MIRROR.x + MIRROR.w * (n === 1 ? 0.5 : k === 0 ? 0.3 : 0.7);
      this.drawSilhouette(g, cx, MIRROR.y + MIRROR.h * 0.5, MIRROR.h * 0.86, color);
    }
    game.tracker.people
      .slice(0, n)
      .forEach((p) => drawSkeleton(g, p.lm, map, this.ok ? COR.verde : COR.amarelo, 7));
    g.restore();
    roundRect(g, MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h, 28);
    g.lineWidth = 10;
    g.strokeStyle = this.ok ? COR.verde : COR.branco;
    g.stroke();
    if (this.ok) {
      const k = clamp(this.held / HOLD_SECONDS, 0, 1);
      roundRect(g, MIRROR.x + 40, MIRROR.y + MIRROR.h - 40, (MIRROR.w - 80) * k, 16, 8);
      g.fillStyle = COR.verde;
      g.fill();
    }

    roundRect(g, 140, 572, 1000, 136, 30);
    g.fillStyle = 'rgba(20,8,48,0.78)';
    g.fill();
    if (game.poseState === 'carregando') {
      text(g, T.preparandoCamera, BASE_W / 2, 640, { size: 44 });
    } else if (this.ok) {
      text(g, T.calibracao.pronto, BASE_W / 2, 640, { size: 56, color: COR.verde });
    } else {
      const titulo = this.setup.cfg.dupla ? T.calibracao.dupla : T.calibracao.afaste;
      text(g, titulo, BASE_W / 2, 612, { size: 36, maxWidth: 940 });
      const dica = this.poucaLuz ? T.calibracao.luz : T.calibracao.moveis;
      textBlock(g, dica, BASE_W / 2, 664, 940, { size: 30, color: COR.amarelo });
    }
    this.ui.draw(g);
  }

  private drawSilhouette(
    g: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    height: number,
    color: string,
  ): void {
    const sk = buildSkeleton({ lShoulder: 22, rShoulder: 22 });
    const u = height / 3.3;
    const oy = cy + u * 0.15;
    const P = (p: { x: number; y: number }): [number, number] => [cx + p.x * u, oy + p.y * u];
    g.save();
    g.strokeStyle = color;
    g.lineWidth = u * 0.42;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.globalAlpha = 0.3;
    const line = (pts: { x: number; y: number }[]): void => {
      g.beginPath();
      pts.forEach((p, i) => (i === 0 ? g.moveTo(...P(p)) : g.lineTo(...P(p))));
      g.stroke();
    };
    line([sk.lWrist, sk.lElbow, sk.lShoulder, sk.rShoulder, sk.rElbow, sk.rWrist]);
    line([sk.lAnkle, sk.lKnee, sk.lHip, sk.rHip, sk.rKnee, sk.rAnkle]);
    line([sk.lShoulder, sk.lHip]);
    line([sk.rShoulder, sk.rHip]);
    g.beginPath();
    g.arc(cx, oy + (sk.nose.y - 0.08) * u, u * 0.36, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    g.restore();
  }
}
