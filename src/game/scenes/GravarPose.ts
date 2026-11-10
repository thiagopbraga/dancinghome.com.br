// Gravador de pose do catálogo (Área dos Pais): contagem de 3 s, depois 2 s segurando a pose.
// A média dos ângulos medidos substitui os valores daquela pose.
import { averageAngles, type AngleSample } from '../../core/recorder';
import { ANGLE_NAMES, type AngleName, type Angles } from '../../core/types';
import { drawPoseCard } from '../draw/card';
import { drawMirror, drawSkeleton, mirrorMapper, type Rect } from '../draw/mirror';
import { drawScenario } from '../draw/scenery';
import { COR, clamp, roundRect, text, textBlock } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { T } from '../texts';
import { ButtonSet, drawCursors, type Button } from '../ui';

const MIRROR: Rect = { x: 330, y: 20, w: 640, h: 480 };
export const POSE_COUNTDOWN = 3;
export const POSE_HOLD = 2;

type Fase = 'pronta' | 'contagem' | 'gravando' | 'feita' | 'falhou';

export class GravarPoseScene implements Scene {
  readonly name = 'gravarPose';
  readonly ui: ButtonSet;
  fase: Fase = 'pronta';
  /** Ângulos medidos na última gravação. */
  medida: Angles | null = null;
  private t = 0;
  private samples: AngleSample[] = [];
  private readonly nomes: AngleName[];

  constructor(
    private readonly game: Game,
    private readonly poseId: string,
  ) {
    const def = game.catalog[poseId];
    this.nomes = def ? ANGLE_NAMES.filter((n) => def.angles[n] !== undefined) : [];
    this.ui = new ButtonSet([], () => game.sfx.play('select'));
    this.setButtons();
  }

  enter(): void {
    void this.game.startPose();
  }

  private setButtons(): void {
    const b: Button[] = [
      {
        id: 'voltar',
        x: 30,
        y: 600,
        w: 250,
        h: 100,
        label: T.musicas.voltar,
        color: COR.roxoClaro,
        touchOnly: true,
        onSelect: () => this.game.go('pais'),
      },
    ];
    if (this.fase === 'pronta' || this.fase === 'falhou' || this.fase === 'feita') {
      b.push({
        id: 'gravar',
        x: this.fase === 'feita' ? 330 : 440,
        y: 580,
        w: this.fase === 'feita' ? 300 : 400,
        h: 120,
        label: this.fase === 'pronta' ? T.gravador.gravar : T.resultado.deNovo,
        color: COR.rosa,
        onSelect: () => this.start(),
      });
    }
    if (this.fase === 'feita') {
      b.push({
        id: 'guardar',
        x: 670,
        y: 580,
        w: 300,
        h: 120,
        label: T.gravador.guardar,
        color: COR.verde,
        onSelect: () => void this.save(),
      });
    }
    this.ui.setButtons(b);
  }

  private start(): void {
    this.fase = 'contagem';
    this.t = 0;
    this.samples = [];
    this.game.narrator.say(T.narrador.poseGravar, { caption: false });
    this.setButtons();
  }

  private async save(): Promise<void> {
    const game = this.game;
    const def = game.catalog[this.poseId];
    if (!def || !this.medida) return;
    await game.store?.savePose(this.poseId, { ...def, angles: this.medida });
    await game.reload();
    if (!game.store) game.catalog[this.poseId] = { ...def, angles: this.medida };
    game.go('pais', { aviso: `Pose "${def.nome}" guardada do jeito dela.` });
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    this.ui.pointer(kind, x, y);
  }

  update(dt: number): void {
    const game = this.game;
    this.ui.update(dt, this.fase === 'contagem' || this.fase === 'gravando' ? [] : game.cursors());
    if (this.fase === 'contagem') {
      const before = Math.ceil(POSE_COUNTDOWN - this.t);
      this.t += dt;
      if (Math.ceil(POSE_COUNTDOWN - this.t) < before && this.t < POSE_COUNTDOWN) game.sfx.play('tick');
      if (this.t >= POSE_COUNTDOWN) {
        this.fase = 'gravando';
        this.t = 0;
        game.sfx.play('go');
      }
    } else if (this.fase === 'gravando') {
      this.t += dt;
      const person = game.tracker.people[0];
      if (person) this.samples.push({ angles: { ...person.angles }, vis: { ...person.vis } });
      if (this.t >= POSE_HOLD) {
        this.medida = averageAngles(this.samples, this.nomes);
        this.fase = this.medida ? 'feita' : 'falhou';
        if (this.medida) {
          game.sfx.play('estrela');
          game.narrator.say(T.narrador.poseGravada, { caption: false });
        }
        this.setButtons();
      }
    }
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const game = this.game;
    const def = game.catalog[this.poseId];
    drawScenario(g, v, game.cenario, game.time * 2);
    const aspect = game.tracker.aspect;
    drawMirror(g, MIRROR, game.mirrorVideo, aspect);
    const map = mirrorMapper(MIRROR, aspect);
    g.save();
    roundRect(g, MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h, 28);
    g.clip();
    game.tracker.people.slice(0, 1).forEach((p) => drawSkeleton(g, p.lm, map, COR.amarelo, 7));
    g.restore();
    roundRect(g, MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h, 28);
    g.lineWidth = 10;
    g.strokeStyle = this.fase === 'gravando' ? COR.rosa : COR.branco;
    g.stroke();

    // à esquerda, a pose como está hoje; à direita, a que acabou de ser medida
    if (def) {
      text(g, T.gravador.poseAtual, 165, 60, { size: 30, outline: COR.roxo });
      drawPoseCard(g, def.angles, 165, 250, { scale: 1.7, label: def.nome });
    }
    if (this.medida && this.fase === 'feita') {
      text(g, T.gravador.poseNova, 1125, 60, { size: 30, outline: COR.roxo });
      drawPoseCard(g, this.medida, 1125, 250, { scale: 1.7, label: def?.nome, color: COR.verde });
    }

    const cx = BASE_W / 2;
    if (this.fase === 'contagem') {
      text(g, String(Math.max(1, Math.ceil(POSE_COUNTDOWN - this.t))), cx, 250, {
        size: 220,
        color: COR.amarelo,
        outline: COR.roxo,
      });
      text(g, T.narrador.poseGravar, cx, 640, { size: 48, outline: COR.roxo });
    } else if (this.fase === 'gravando') {
      const k = clamp(this.t / POSE_HOLD, 0, 1);
      roundRect(g, MIRROR.x + 40, MIRROR.y + MIRROR.h - 46, MIRROR.w - 80, 20, 10);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fill();
      roundRect(g, MIRROR.x + 40, MIRROR.y + MIRROR.h - 46, (MIRROR.w - 80) * k, 20, 10);
      g.fillStyle = COR.rosa;
      g.fill();
      text(g, T.gravador.segure, cx, 640, { size: 56, color: COR.amarelo, outline: COR.roxo });
    } else if (this.fase === 'falhou') {
      textBlock(g, T.gravador.naoVi, cx, 532, 900, { size: 32, outline: COR.roxo });
    } else if (this.fase === 'pronta') {
      textBlock(g, T.gravador.dicaPose, cx, 532, 900, { size: 30, outline: COR.roxo });
    }
    this.ui.draw(g);
    drawCursors(g, game.cursors(), game.time);
  }
}
