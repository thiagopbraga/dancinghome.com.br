// Tela de estrelas: 1 a 3 estrelas, confete e comemoração. Nunca mostra derrota.
import type { Summary } from '../../core/stars';
import { drawBackdrop } from '../draw/backdrop';
import { Particles } from '../draw/particles';
import { COR, clamp, drawStar, easeOutBack, roundRect, text } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game, MatchReport } from '../game';
import type { Outcome } from '../match';
import { T } from '../texts';
import { ButtonSet, drawCursors } from '../ui';

const CORES = [COR.rosa, COR.azul];

export class ResultadoScene implements Scene {
  readonly name = 'resultado';
  readonly ui: ButtonSet;
  /** Estrelas de cada pessoa (preenchido quando o resultado fica pronto). */
  estrelas: number[] = [];
  report: MatchReport | null = null;
  private age = 0;
  private readonly particles = new Particles();
  private starSounds = 0;

  constructor(
    private readonly game: Game,
    private readonly outcome: Outcome,
  ) {
    const historia = outcome.cfg.historia !== undefined;
    this.ui = new ButtonSet(
      [
        {
          id: 'deNovo',
          x: 230,
          y: 478,
          w: 380,
          h: 120,
          label: T.resultado.deNovo,
          color: COR.rosa,
          onSelect: () => void game.startMatch(outcome.cfg),
        },
        {
          id: 'menu',
          x: 670,
          y: 478,
          w: 380,
          h: 120,
          label: historia ? T.resultado.proximoShow : T.resultado.menu,
          color: COR.roxoClaro,
          onSelect: () => game.go(historia ? 'historia' : 'menu'),
        },
      ],
      () => game.sfx.play('select'),
    );
    this.ui.grace = 2.2;
  }

  enter(): void {
    const game = this.game;
    game.sfx.play('fanfarra');
    void game.finishMatch(this.outcome).then((report) => {
      this.report = report;
      this.estrelas = report.resumos.map((r) => r.stars);
      const melhor = Math.max(...this.estrelas);
      game.narrator.say(T.narrador.fim[melhor]);
      if (report.novidades.includes(T.resultado.agua)) game.narrator.say(T.narrador.agua, { caption: false });
    });
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    this.ui.pointer(kind, x, y);
  }

  update(dt: number): void {
    this.age += dt;
    this.particles.update(dt);
    if (this.age < 5 && Math.random() < 0.5) this.particles.confetti(this.game.engine.view, 3);
    const total = this.estrelas.length ? Math.max(...this.estrelas) : 0;
    while (this.starSounds < total && this.age > 0.5 + this.starSounds * 0.45) {
      this.game.sfx.play('estrela');
      this.starSounds++;
    }
    this.ui.update(dt, this.game.cursors());
  }

  private drawStars(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, stars: number): void {
    for (let i = 0; i < 3; i++) {
      const appear = clamp((this.age - 0.5 - i * 0.45) / 0.35, 0, 1);
      const filled = i < stars && appear > 0;
      const scale = filled ? easeOutBack(appear) : 1;
      const x = cx + (i - 1) * r * 2.3;
      const y = cy - (i === 1 ? r * 0.35 : 0);
      drawStar(g, x, y, r * scale, filled, filled ? Math.sin(this.age * 2 + i) * 0.08 : 0);
    }
  }

  private drawSummary(
    g: CanvasRenderingContext2D,
    s: Summary,
    bonus: number,
    cx: number,
    big: boolean,
    cor?: string,
  ): void {
    const r = big ? 66 : 46;
    this.drawStars(g, cx, big ? 252 : 255, r, s.stars);
    const w = big ? 520 : 400;
    roundRect(g, cx - w / 2, 345, w, 118, 30);
    g.fillStyle = 'rgba(20,8,48,0.6)';
    g.fill();
    if (cor) {
      g.lineWidth = 6;
      g.strokeStyle = cor;
      g.stroke();
    }
    text(g, `${s.score + bonus} ${T.resultado.pontos}`, cx, 384, { size: big ? 50 : 40, maxWidth: w - 30 });
    text(
      g,
      `${s.perfeitos} ${s.perfeitos === 1 ? T.resultado.perfeito : T.resultado.perfeitos} · ${s.energyPoints} ${T.resultado.energia}`,
      cx,
      432,
      {
        size: big ? 28 : 23,
        color: COR.amarelo,
        maxWidth: w - 30,
      },
    );
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    drawBackdrop(g, v, this.game.time, '#3d1a85', '#ff5fa8');
    const report = this.report;
    text(g, T.resultado.titulo, BASE_W / 2, 68, { size: 72, outline: COR.roxo, maxWidth: 1100 });
    if (report) {
      if (report.resumos.length === 1) {
        this.drawSummary(g, report.resumos[0], this.outcome.bonus[0] ?? 0, BASE_W / 2, true);
      } else {
        report.resumos.forEach((s, i) => {
          const cx = BASE_W / 2 + (i === 0 ? -300 : 300);
          this.drawSummary(g, s, this.outcome.bonus[i] ?? 0, cx, false, CORES[i]);
        });
      }
      const news = [...(report.recorde ? [T.resultado.recorde] : []), ...report.novidades];
      if (news.length > 0) {
        const idx = Math.floor(this.age / 2.5) % news.length;
        text(g, news[idx], BASE_W / 2, 134, {
          size: 32,
          color: COR.amarelo,
          outline: COR.roxo,
          maxWidth: 1150,
        });
      }
    }
    this.ui.draw(g);
    this.particles.draw(g);
    drawCursors(g, this.game.cursors(), this.game.time);
  }
}
