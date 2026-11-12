// Tela de estrelas: 1 a 3 estrelas, confete e comemoração. Nunca mostra derrota.
import { sugerirApelidos } from '../../../shared/apelidos';
import type { Summary } from '../../core/stars';
import { enviarPontuacaoPlacar, musicaElegivelPlacar } from '../../net/placar';
import { drawBackdrop } from '../draw/backdrop';
import { Particles } from '../draw/particles';
import { COR, clamp, drawStar, easeOutBack, makeRng, roundRect, text } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game, MatchReport } from '../game';
import type { Outcome } from '../match';
import { T } from '../texts';
import { ButtonSet, drawCursors, type Button } from '../ui';

const CORES = [COR.rosa, COR.azul];

export class ResultadoScene implements Scene {
  readonly name = 'resultado';
  readonly ui: ButtonSet;
  /** Estrelas de cada pessoa (preenchido quando o resultado fica pronto). */
  estrelas: number[] = [];
  report: MatchReport | null = null;
  /** Mensagem do placar online (ex.: "Seu nome está no placar da semana!"). */
  placarMsg = '';
  /** Apelidos sugeridos quando a criança ainda não escolheu o dela. */
  opcoesApelido: string[] = [];
  private ficha: string | null = null;
  private enviando = false;
  private enviado = false;
  private age = 0;
  private readonly particles = new Particles();
  private starSounds = 0;

  constructor(
    private readonly game: Game,
    private readonly outcome: Outcome,
  ) {
    this.ui = new ButtonSet(this.baseButtons(), () => game.sfx.play('select'));
    this.ui.grace = 2.2;
  }

  private baseButtons(compact = false): Button[] {
    const game = this.game;
    const outcome = this.outcome;
    const historia = outcome.cfg.historia !== undefined;
    if (compact) {
      return [
        {
          id: 'deNovo',
          x: 80,
          y: 582,
          w: 340,
          h: 100,
          label: T.resultado.deNovo,
          color: COR.rosa,
          onSelect: () => void game.startMatch(outcome.cfg),
        },
        {
          id: 'outrosApelidos',
          x: 450,
          y: 582,
          w: 380,
          h: 100,
          label: T.resultado.outrosApelidos,
          color: '#2f8fe0',
          onSelect: () => {
            this.opcoesApelido = sugerirApelidos(3, Math.random, this.opcoesApelido[0] ?? null);
            this.refreshButtons();
          },
        },
        {
          id: 'menu',
          x: 860,
          y: 582,
          w: 340,
          h: 100,
          label: historia ? T.resultado.proximoShow : T.resultado.menu,
          color: COR.roxoClaro,
          onSelect: () => game.go(historia ? 'historia' : 'menu'),
        },
      ];
    }

    const mostrarBotaoPlacar =
      game.settings.placarAtivo &&
      !!game.settings.apelido &&
      !!this.ficha &&
      !this.enviado;

    if (mostrarBotaoPlacar) {
      return [
        {
          id: 'deNovo',
          x: 70,
          y: 478,
          w: 340,
          h: 120,
          label: T.resultado.deNovo,
          color: COR.rosa,
          onSelect: () => void game.startMatch(outcome.cfg),
        },
        {
          id: 'enviarPlacar',
          x: 440,
          y: 478,
          w: 400,
          h: 120,
          label: this.enviando ? T.resultado.enviandoPlacar : T.resultado.mandarPlacar,
          fontSize: 32,
          color: '#2aa86a',
          disabled: this.enviando,
          onSelect: () => void this.enviarAoPlacar(),
        },
        {
          id: 'menu',
          x: 870,
          y: 478,
          w: 340,
          h: 120,
          label: historia ? T.resultado.proximoShow : T.resultado.menu,
          color: COR.roxoClaro,
          onSelect: () => game.go(historia ? 'historia' : 'menu'),
        },
      ];
    }

    return [
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
    ];
  }

  private refreshButtons(): void {
    const game = this.game;
    const precisaEscolherApelido =
      game.settings.placarAtivo &&
      !game.settings.apelido &&
      !!this.ficha &&
      !this.enviado;

    if (precisaEscolherApelido) {
      if (this.opcoesApelido.length === 0) {
        const rng = game.flags.semente !== null ? makeRng(game.flags.semente) : Math.random;
        this.opcoesApelido = sugerirApelidos(3, rng);
      }
      const botoesApelido: Button[] = this.opcoesApelido.map((nome, idx) => ({
        id: `apelido-${idx}`,
        x: 60 + idx * 395,
        y: 472,
        w: 370,
        h: 92,
        label: nome,
        fontSize: 26,
        color: idx === 0 ? '#2aa86a' : idx === 1 ? '#ff9a3d' : '#8a4dff',
        onSelect: () => void this.escolherApelido(nome),
      }));
      this.ui.setButtons([...botoesApelido, ...this.baseButtons(true)]);
      return;
    }

    this.ui.setButtons(this.baseButtons(false));
  }

  private async escolherApelido(nome: string): Promise<void> {
    await this.game.saveSettings({ ...this.game.settings, apelido: nome });
    this.refreshButtons();
  }

  private async enviarAoPlacar(): Promise<void> {
    const game = this.game;
    const apelido = game.settings.apelido;
    const report = this.report;
    if (!game.settings.placarAtivo || !apelido || !this.ficha || !report || this.enviando || this.enviado) {
      return;
    }
    this.enviando = true;
    this.refreshButtons();
    const resumo = report.resumos[0];
    const bonus = this.outcome.bonus[0] ?? 0;
    const poses = this.outcome.resultados[0]?.length ?? 0;
    const res = await enviarPontuacaoPlacar(game.settings.placarAtivo, {
      ficha: this.ficha,
      apelido,
      pontos: resumo.score + bonus,
      estrelas: resumo.stars,
      perfeitos: resumo.perfeitos,
      poses,
    });
    this.enviando = false;
    this.enviado = true;
    if (res?.top10) {
      this.placarMsg = T.resultado.placarTop10;
      if (!report.novidades.includes(T.resultado.placarTop10)) {
        report.novidades.unshift(T.resultado.placarTop10);
      }
      game.narrator.say(T.resultado.placarTop10);
    } else if (res?.ok) {
      this.placarMsg = T.resultado.placarEnviado;
    } else {
      this.placarMsg = T.resultado.placarOffline;
    }
    this.refreshButtons();
  }

  enter(): void {
    const game = this.game;
    game.sfx.play('fanfarra');
    const elegivel =
      game.settings.placarAtivo && musicaElegivelPlacar(this.outcome.cfg, this.outcome.choreo);
    const promessaFicha = elegivel ? (game.fichaPlacar ?? Promise.resolve(null)) : Promise.resolve(null);

    void Promise.all([game.finishMatch(this.outcome), promessaFicha]).then(([report, ficha]) => {
      this.report = report;
      this.ficha = ficha;
      this.estrelas = report.resumos.map((r) => r.stars);
      const melhor = Math.max(...this.estrelas);
      game.narrator.say(T.narrador.fim[melhor]);
      if (report.novidades.includes(T.resultado.agua)) game.narrator.say(T.narrador.agua, { caption: false });
      this.refreshButtons();
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
      const news = [
        ...(this.placarMsg ? [this.placarMsg] : []),
        ...(report.recorde ? [T.resultado.recorde] : []),
        ...report.novidades,
      ];
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
