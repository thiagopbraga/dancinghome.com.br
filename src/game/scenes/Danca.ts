// Cena de dança: cartões de pose deslizando até a linha de chegada, nota no fim da janela, placar e pausa.
import { mirrorAngles } from '../../core/angles';
import { bothHandsUp, HoldDetector } from '../../core/gestures';
import { EventJudge, movement } from '../../core/judge';
import type { MusicClock, MusicPlayer } from '../../core/clock';
import type { Angles, ChoreoEvent, Landmark, PoseResult, Rating } from '../../core/types';
import { expandSections, levelRange } from '../../data/choreo';
import { CARD_H, CARD_W, drawPoseCard } from '../draw/card';
import { drawMirror, drawSkeleton, mirrorMapper, type Rect } from '../draw/mirror';
import { Particles } from '../draw/particles';
import { drawScenario } from '../draw/scenery';
import {
  COR,
  clamp,
  drawStar,
  easeOutBack,
  font,
  makeRng,
  roundRect,
  text,
  textBlock,
  wrapLines,
} from '../draw/util';
import { BASE_H, BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import type { MatchSetup, Outcome } from '../match';
import { T } from '../texts';
import { ButtonSet, drawCursors } from '../ui';

const MIRROR: Rect = { x: 307, y: 16, w: 666, h: 500 };
const LANE_Y = 622;
const LINE_X = 230;
/** O cartão aparece 4 batidas antes e chega na batida exata. */
const LEAD_BEATS = 4;
const PLAYER_COLORS = [COR.rosa, COR.azul];
const RATING_COLORS: Record<Rating, string> = {
  perfeito: COR.amarelo,
  muitoBem: COR.azul,
  quase: COR.rosa,
  tenteiDeNovo: COR.branco,
};
const FREEZE_SECONDS = 3;
const FREEZE_BONUS = 50;
const TRAIN_WAIT_SECONDS = 6;

interface Player {
  results: PoseResult[];
  judges: Map<number, EventJudge>;
  mov: number;
  prev: Landmark[] | null;
  bonus: number;
  msg: { text: string; color: string; age: number } | null;
  freezeMov: number;
}

interface Freeze {
  beat: number;
  done: boolean;
}

export class DancaScene implements Scene {
  readonly name = 'danca';
  readonly ui: ButtonSet;
  readonly events: ChoreoEvent[];
  readonly players: Player[];
  paused = false;
  private simBound = false;
  /** Treino: esperando a pose para a música continuar. */
  waiting = false;
  /** Pose congelada em andamento. */
  frozen = false;
  /** Quantas vezes a música congelou (para os testes). */
  freezeCount = 0;
  private clock!: MusicClock;
  /** Quem toca a música: o áudio do aparelho ou o vídeo do YouTube. */
  private music!: MusicPlayer;
  /** Esperando o vídeo do YouTube ficar pronto. */
  loadingMusic = false;
  /** A música virou palminhas porque o vídeo não pôde tocar. */
  palminhas = false;
  private exited = false;
  private readonly targets: Angles[];
  private readonly fim: number;
  private readonly inicio: number;
  private nextToOpen = 0;
  private open: number[] = [];
  private finished = 0;
  private trained = new Set<number>();
  private waitTime = 0;
  private freezes: Freeze[] = [];
  private freezeTime = 0;
  private freezeMsg: { text: string; age: number } | null = null;
  private readonly particles = new Particles();
  private readonly pauseHold = new HoldDetector(1);
  private ending = -1;
  private fadeStarted = false;
  private announced = -1;
  private readonly onVisibility = (): void => {
    if (document.hidden) this.setPaused(true);
  };

  constructor(
    private readonly game: Game,
    private readonly setup: MatchSetup,
  ) {
    const { cfg, choreo } = setup;
    const range = levelRange(choreo, cfg.nivel);
    this.inicio = range.inicio;
    this.fim = game.flags.fim !== null ? Math.min(range.fim, range.inicio + game.flags.fim) : range.fim;
    this.events = expandSections(choreo, cfg.nivel).filter((e) => e.beat + e.holdBeats <= this.fim + 1e-9);
    this.targets = this.events.map((e) => {
      const def = game.catalog[e.pose];
      const a = def?.angles ?? {};
      return e.mirror ? mirrorAngles(a) : a;
    });
    const n = cfg.dupla ? 2 : 1;
    this.players = Array.from({ length: n }, () => ({
      results: [],
      judges: new Map(),
      mov: 0,
      prev: null,
      bonus: 0,
      msg: null,
      freezeMov: 0,
    }));
    this.ui = new ButtonSet(
      [
        {
          id: 'continuar',
          x: 250,
          y: 250,
          w: 360,
          h: 200,
          label: T.danca.continuar,
          color: COR.verde,
          hidden: true,
          onSelect: () => this.setPaused(false),
        },
        {
          id: 'sair',
          x: 670,
          y: 250,
          w: 360,
          h: 200,
          label: T.danca.sair,
          color: COR.roxoClaro,
          hidden: true,
          onSelect: () => this.quit(),
        },
      ],
      () => game.sfx.play('select'),
    );
    if (cfg.estatua) this.planFreezes();
  }

  enter(): void {
    const { game, setup } = this;
    const { choreo, cfg } = setup;
    const rate = this.playRate;
    const yt = setup.youtube;
    if (yt) {
      // música do YouTube: o relógio da dança é o tempo do vídeo
      this.music = game.youtube;
      const clock = game.youtube.load(choreo.bpm, yt.offsetMs);
      clock.seek(clock.positionOfBeat(this.inicio));
      this.clock = clock;
      this.loadingMusic = true;
      void yt.pronto.then((ok) => {
        if (this.exited) return;
        this.loadingMusic = false;
        if (ok) {
          game.youtube.play(this.clock.positionOfBeat(this.inicio), rate);
          if (this.paused || this.waiting || this.frozen) this.music.pause();
        } else {
          this.useClickTrack(this.inicio);
        }
      });
    } else if (setup.buffer) {
      this.music = game.audio;
      this.clock = game.audio.load(setup.buffer, choreo.bpm, choreo.offsetMs);
      game.audio.play(this.clock.positionOfBeat(this.inicio), rate, 0.12);
    } else {
      this.useClickTrack(this.inicio);
    }
    this.bindSim();
    game.partida = { resultados: this.players.map((p) => p.results), cena: this };
    game.onMusic?.(true);
    document.addEventListener('visibilitychange', this.onVisibility);
    if (cfg.modo === 'treino') game.narrator.say(T.narrador.treino);
  }

  private get playRate(): number {
    return this.setup.cfg.modo === 'treino' ? 0.5 : 1;
  }

  /** Sem vídeo (sem internet, vídeo bloqueado...): dança com palminhas no ritmo, a partir da batida `fromBeat`. */
  private useClickTrack(fromBeat: number): void {
    const { game, setup } = this;
    game.youtube.stop();
    this.palminhas = true;
    const buffer = game.clickTrack(setup.choreo);
    this.music = game.audio;
    this.clock = game.audio.load(buffer, setup.choreo.bpm, 0);
    game.audio.play(this.clock.positionOfBeat(Math.max(0, fromBeat)), this.playRate, 0.12);
    if (this.paused || this.waiting || this.frozen) this.music.pause();
    game.narrator.say(T.narrador.palminhas, { caption: false });
    if (game.sim && this.simBound) {
      this.simBound = false;
      this.bindSim();
    }
  }

  /** A música está parada esperando o vídeo (carregar, começar ou voltar de um engasgo). */
  get musicWaiting(): boolean {
    if (this.loadingMusic) return true;
    if (this.music !== this.game.youtube) return false;
    return this.game.youtube.waitingStart || this.game.youtube.buffering;
  }

  interrupt(): void {
    this.setPaused(true);
  }

  /** A pose simulada pode terminar de carregar depois da cena abrir. */
  private bindSim(): void {
    const { game } = this;
    if (this.simBound || !game.sim || !this.clock) return;
    game.sim.setTimeline(this.events, game.catalog, this.clock);
    this.simBound = true;
  }

  exit(): void {
    this.exited = true;
    this.music?.stop();
    this.game.youtube.stop();
    this.game.sim?.clearTimeline();
    this.game.onMusic?.(false);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  /** Sorteia até 2 pontos do refrão para a pose congelada, no meio do caminho entre duas poses. */
  private planFreezes(): void {
    const rng = makeRng(this.game.flags.semente ?? Math.floor(Math.random() * 1e9));
    const candidates: number[] = [];
    this.events.forEach((e, i) => {
      const next = this.events[i + 1];
      if (!next || e.holdBeats > 0) return;
      const gap = next.beat - e.beat;
      if (gap < 2) return;
      if (e.secao.startsWith('refrao')) candidates.push(e.beat + gap / 2);
    });
    if (candidates.length === 0) {
      this.events.slice(1, -1).forEach((e, i) => {
        const next = this.events[i + 2];
        if (next && next.beat - e.beat >= 2 && e.holdBeats === 0)
          candidates.push(e.beat + (next.beat - e.beat) / 2);
      });
    }
    const picked: number[] = [];
    for (let k = 0; k < 2 && candidates.length > 0; k++) {
      const idx = Math.floor(rng() * candidates.length);
      picked.push(candidates.splice(idx, 1)[0]);
    }
    this.freezes = picked.sort((a, b) => a - b).map((beat) => ({ beat, done: false }));
  }

  setPaused(p: boolean): void {
    if (this.ending >= 0 || p === this.paused) return;
    this.paused = p;
    this.ui.find('continuar')!.hidden = !p;
    this.ui.find('sair')!.hidden = !p;
    if (p) {
      this.music.pause();
      this.game.narrator.say(T.narrador.pausa, { caption: false });
    } else if (!this.waiting && !this.frozen && !this.loadingMusic) {
      this.music.resume();
    }
    this.pauseHold.reset();
  }

  private quit(): void {
    this.game.go('menu');
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    if (this.paused) {
      this.ui.pointer(kind, x, y);
      return;
    }
    if (kind === 'down') this.setPaused(true);
  }

  key(code: string): void {
    if (code === 'Escape' || code === 'KeyP') this.setPaused(!this.paused);
  }

  /** O gesto de pausa é ignorado perto de poses com os dois braços para cima. */
  private pauseGestureAllowed(beat: number): boolean {
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      if (beat < e.beat - 2.5 || beat > e.beat + e.holdBeats + 1.5) continue;
      const t = this.targets[i];
      if ((t.lShoulder ?? 0) > 120 && (t.rShoulder ?? 0) > 120) return false;
    }
    return true;
  }

  private rate(player: Player, index: number): void {
    const judge = player.judges.get(index);
    if (!judge) return;
    const result = judge.result(player.mov);
    player.judges.delete(index);
    player.mov = 0;
    player.results.push(result);
    const pIndex = this.players.indexOf(player);
    const label = T.ratings[result.rating];
    if (label) player.msg = { text: label, color: RATING_COLORS[result.rating], age: 0 };
    const x =
      this.players.length === 1
        ? LINE_X
        : pIndex === 0
          ? MIRROR.x + MIRROR.w * 0.25
          : MIRROR.x + MIRROR.w * 0.75;
    const y = this.players.length === 1 ? LANE_Y : 230;
    if (result.rating === 'perfeito') {
      this.particles.burst(x, y, COR.amarelo, 26);
      this.game.sfx.play('perfeito');
      this.game.onPerfect?.();
    } else if (result.rating === 'muitoBem') {
      this.particles.burst(x, y, COR.azul, 16, 320);
      this.game.sfx.play('muitoBem');
    } else if (result.rating === 'quase') {
      this.particles.burst(x, y, COR.rosa, 8, 220);
      this.game.sfx.play('quase');
    } else {
      this.particles.burst(x, y, COR.branco, 5, 160);
    }
  }

  update(dt: number): void {
    const game = this.game;
    this.bindSim();
    this.particles.update(dt);
    for (const p of this.players) {
      if (p.msg) {
        p.msg.age += dt;
        if (p.msg.age > 1.1) p.msg = null;
      }
    }
    if (this.freezeMsg) {
      this.freezeMsg.age += dt;
      if (this.freezeMsg.age > 1.6) this.freezeMsg = null;
    }
    if (game.poseState === 'erro') {
      game.go('semCamera', 'menu');
      return;
    }
    if (this.paused) {
      this.ui.update(dt, game.cursors());
      return;
    }
    // vídeo do YouTube: se deu erro no meio, segue com as palminhas de onde parou
    if (this.music === game.youtube && game.youtube.estado === 'erro') {
      this.useClickTrack(this.clock.beat());
    }
    // esperando o vídeo: nada anda até a música tocar
    if (this.musicWaiting && !this.waiting && !this.frozen) return;
    const clock = this.clock;
    const t = clock.now();
    const beat = clock.beat();
    const people = game.tracker.people;
    const aspect = game.tracker.aspect;

    // Energia: deslocamento acumulado entre duas poses (pequenos tremores não contam).
    this.players.forEach((pl, i) => {
      const person = people[i];
      if (!person) {
        pl.prev = null;
        return;
      }
      if (pl.prev) {
        const m = movement(pl.prev, person.lm, aspect);
        if (m > 0.02) {
          pl.mov += m;
          if (this.frozen && this.freezeTime > 0.5) pl.freezeMov += m;
        }
      }
      pl.prev = person.lm;
    });

    // Pose congelada: a música para por 3 s e quem fica parado ganha bônus.
    if (this.frozen) {
      this.freezeTime += dt;
      if (this.freezeTime >= FREEZE_SECONDS) this.endFreeze();
      return;
    }
    const freeze = this.freezes.find((f) => !f.done && beat >= f.beat);
    if (freeze && this.open.length === 0 && this.ending < 0) {
      freeze.done = true;
      this.startFreeze();
      return;
    }

    // Abre a janela dos próximos eventos.
    while (this.nextToOpen < this.events.length) {
      const i = this.nextToOpen;
      const e = this.events[i];
      const beatTime = clock.timeOfBeat(e.beat);
      const judge0 = new EventJudge(
        e,
        this.targets[i],
        beatTime,
        clock.timeOfBeat(e.beat + e.holdBeats),
        game.limites,
      );
      if (t < judge0.start) break;
      this.players.forEach((pl, k) => {
        pl.judges.set(
          i,
          k === 0
            ? judge0
            : new EventJudge(
                e,
                this.targets[i],
                beatTime,
                clock.timeOfBeat(e.beat + e.holdBeats),
                game.limites,
              ),
        );
      });
      this.open.push(i);
      this.nextToOpen++;
    }

    // Narração: o nome da pose quando o cartão aparece.
    const coming = this.events.findIndex((e, i) => i > this.announced && e.beat - beat <= LEAD_BEATS);
    if (coming >= 0 && this.events[coming].beat - beat > 0.5) {
      this.announced = coming;
      const def = game.catalog[this.events[coming].pose];
      if (def && this.setup.cfg.nivel === 'facil') game.narrator.say(def.nome, { caption: false });
    }

    // Treino: na batida, a música espera a pose.
    if (this.setup.cfg.modo === 'treino') {
      if (this.waiting) {
        this.waitTime += dt;
        const i = this.open[0];
        let ok = false;
        this.players.forEach((pl, k) => {
          const person = people[k];
          const judge = pl.judges.get(i);
          if (!person || !judge) return;
          judge.feed(clock.timeOfBeat(this.events[i].beat), person.angles, person.vis);
          if (judge.bestDiff !== null && judge.bestDiff <= game.limites.muitoBem) ok = true;
        });
        if (ok || this.waitTime >= TRAIN_WAIT_SECONDS) {
          this.waiting = false;
          this.trained.add(i);
          if (ok) game.sfx.play('boa');
          this.music.resume();
        }
        return;
      }
      const i = this.open.find(
        (idx) => !this.trained.has(idx) && t >= clock.timeOfBeat(this.events[idx].beat),
      );
      if (i !== undefined && this.ending < 0) {
        this.waiting = true;
        this.waitTime = 0;
        this.music.pause();
        return;
      }
    }

    // Alimenta os juízes e fecha as janelas que acabaram.
    for (const i of this.open) {
      this.players.forEach((pl, k) => {
        const person = people[k];
        if (person) pl.judges.get(i)?.feed(t, person.angles, person.vis);
      });
    }
    const still: number[] = [];
    for (const i of this.open) {
      const over = this.players[0].judges.get(i)?.isOver(t) ?? true;
      if (over) {
        this.players.forEach((pl) => this.rate(pl, i));
        this.finished++;
      } else {
        still.push(i);
      }
    }
    this.open = still;

    // Pausa: as duas mãos para o alto por 1 s.
    const p0 = people[0];
    const handsUp = !!p0 && bothHandsUp(p0.lm) && this.pauseGestureAllowed(beat);
    if (this.ending < 0 && this.pauseHold.update(handsUp, dt)) {
      this.setPaused(true);
      return;
    }

    // Fim: fade de 2 s quando a partida usa só um trecho, e depois o resultado.
    const fimTime = clock.timeOfBeat(this.fim);
    const trecho = this.fim < this.setup.choreo.duracaoBeats - 0.5;
    if (trecho && !this.fadeStarted && t >= fimTime - 2 * clock.rate) {
      this.fadeStarted = true;
      this.music.fadeOut(2);
    }
    const audioOver =
      clock.position() >= this.music.duration - 0.03 || (this.music === game.youtube && game.youtube.over);
    if (this.ending < 0 && (beat >= this.fim || audioOver)) {
      for (const i of this.open) this.players.forEach((pl) => this.rate(pl, i));
      this.finished += this.open.length;
      this.open = [];
      this.ending = 0;
    }
    if (this.ending >= 0) {
      this.ending += dt;
      if (this.ending > 0.9) this.finish();
    }
  }

  private startFreeze(): void {
    this.frozen = true;
    this.freezeTime = 0;
    this.freezeCount++;
    this.players.forEach((p) => (p.freezeMov = 0));
    this.music.pause();
    this.game.sfx.play('congela');
    this.game.narrator.say(T.narrador.estatua, { caption: false });
  }

  private endFreeze(): void {
    this.frozen = false;
    let any = false;
    this.players.forEach((p, i) => {
      if (!this.game.tracker.people[i]) return;
      if (p.freezeMov < 1.5) {
        p.bonus += FREEZE_BONUS;
        any = true;
      }
    });
    this.freezeMsg = { text: any ? T.danca.estatuaBoa : T.danca.estatuaQuase, age: 0 };
    if (any) {
      this.particles.burst(BASE_W / 2, 260, COR.azul, 30);
      this.game.sfx.play('estrela');
      this.game.estatuasFeitas++;
    }
    this.music.resume();
  }

  private finish(): void {
    const outcome: Outcome = {
      cfg: this.setup.cfg,
      choreo: this.setup.choreo,
      resultados: this.players.map((p) => p.results),
      bonus: this.players.map((p) => p.bonus),
    };
    this.game.go('resultado', outcome);
  }

  private score(p: Player): number {
    return p.results.reduce((s, r) => s + r.points + r.energy, 0) + p.bonus;
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const game = this.game;
    const clock = this.clock;
    const beat = clock ? clock.beat() : 0;
    drawScenario(g, v, game.cenario, beat);
    game.drawCompanions?.(g, v, beat, this.currentTarget(beat), 'danca');

    // espelho com o esqueleto
    const aspect = game.tracker.aspect;
    drawMirror(g, MIRROR, game.mirrorVideo, aspect);
    g.save();
    roundRect(g, MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h, 28);
    g.clip();
    const map = mirrorMapper(MIRROR, aspect);
    game.tracker.people.forEach((p, i) => {
      if (i < this.players.length)
        drawSkeleton(g, p.lm, map, this.players.length > 1 ? PLAYER_COLORS[i] : COR.amarelo);
    });
    if (this.frozen) {
      g.fillStyle = 'rgba(120,200,255,0.25)';
      g.fillRect(MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h);
    }
    g.restore();
    roundRect(g, MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h, 28);
    g.lineWidth = 8;
    g.strokeStyle = this.frozen ? COR.azul : COR.branco;
    g.stroke();

    this.drawLane(g, v, beat);
    this.drawHud(g, v, beat);

    // mensagens de nota
    this.players.forEach((p, i) => {
      if (!p.msg) return;
      const k = clamp(p.msg.age / 0.25, 0, 1);
      const scale = easeOutBack(k);
      const alpha = p.msg.age > 0.8 ? 1 - (p.msg.age - 0.8) / 0.3 : 1;
      const x = this.players.length === 1 ? BASE_W / 2 : MIRROR.x + MIRROR.w * (i === 0 ? 0.25 : 0.75);
      g.save();
      g.globalAlpha = clamp(alpha, 0, 1);
      text(g, p.msg.text, x, 250, {
        size: (this.players.length === 1 ? 104 : 64) * scale,
        color: p.msg.color,
        outline: COR.roxo,
        maxWidth: this.players.length === 1 ? 640 : 320,
      });
      g.restore();
    });
    if (this.frozen) {
      text(g, T.danca.estatua, BASE_W / 2, 220, { size: 110, color: '#dff6ff', outline: '#1d5fa8' });
      const left = Math.max(0, FREEZE_SECONDS - this.freezeTime);
      text(g, String(Math.ceil(left)), BASE_W / 2, 340, { size: 90, outline: '#1d5fa8' });
    } else if (this.freezeMsg) {
      text(g, this.freezeMsg.text, BASE_W / 2, 150, {
        size: 60,
        color: '#dff6ff',
        outline: '#1d5fa8',
        maxWidth: 640,
      });
    }
    if (this.musicWaiting && !this.paused && !this.waiting && !this.frozen) {
      const yt = game.youtube;
      const demorou = yt.waitingStart && performance.now() / 1000 - yt.waitingSince > 4;
      text(g, demorou ? T.danca.toqueVideo : T.danca.carregandoMusica, BASE_W / 2, 470, {
        size: 34,
        outline: COR.roxo,
        maxWidth: 640,
      });
    }
    if (this.waiting && !this.paused) {
      text(g, T.danca.treinoEspera, BASE_W / 2, 470, { size: 34, outline: COR.roxo, maxWidth: 640 });
    }
    this.particles.draw(g);

    if (this.paused) {
      g.fillStyle = 'rgba(20,8,48,0.78)';
      g.fillRect(v.left, v.top, v.right - v.left, v.bottom - v.top);
      text(g, T.danca.pausa, BASE_W / 2, 140, { size: 96, outline: COR.roxo });
      this.ui.draw(g);
      drawCursors(g, game.cursors(), game.time);
    }
  }

  /** Pose-alvo do cartão mais próximo da linha (os personagens imitam essa pose). */
  private currentTarget(beat: number): Angles | null {
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i];
      if (e.beat + e.holdBeats + 1 < beat) continue;
      return e.beat - beat <= 1.5 ? this.targets[i] : null;
    }
    return null;
  }

  private drawLane(g: CanvasRenderingContext2D, v: View, beat: number): void {
    // pista
    const top = LANE_Y - CARD_H / 2 - 8;
    g.fillStyle = 'rgba(20,8,48,0.55)';
    g.fillRect(v.left, top, v.right - v.left, CARD_H + 16);
    // linha de chegada
    const pulse = Math.max(0, 1 - (beat - Math.floor(beat)) * 3);
    roundRect(g, LINE_X - CARD_W / 2 - 8, top + 2, CARD_W + 16, CARD_H + 12, 26);
    g.lineWidth = 8 + pulse * 6;
    g.strokeStyle = COR.amarelo;
    g.stroke();
    g.fillStyle = 'rgba(255,214,64,0.16)';
    g.fill();

    const travel = v.right + CARD_W - LINE_X;
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i];
      const d = e.beat - beat;
      if (d > LEAD_BEATS) continue;
      const end = e.beat + e.holdBeats;
      const after = beat - end;
      if (after > 1) continue;
      const x = d > 0 ? LINE_X + (d / LEAD_BEATS) * travel : LINE_X;
      const def = this.game.catalog[e.pose];
      const fade = after > 0 ? 1 - after : 1;
      const holding = e.holdBeats > 0 && d <= 0 && after <= 0;
      drawPoseCard(g, this.targets[i], x, LANE_Y - (after > 0 ? after * 30 : 0), {
        alpha: clamp(fade, 0, 1),
        color: holding ? COR.amarelo : COR.rosa,
        scale: d <= 0 ? 1.06 : 1,
        label: def?.nome,
      });
      if (holding) {
        text(g, T.danca.segure, x, top - 24, { size: 40, color: COR.amarelo, outline: COR.roxo });
        const k = clamp((beat - e.beat) / e.holdBeats, 0, 1);
        roundRect(g, x - 70, top - 4, 140, 12, 6);
        g.fillStyle = 'rgba(255,255,255,0.35)';
        g.fill();
        roundRect(g, x - 70, top - 4, 140 * k, 12, 6);
        g.fillStyle = COR.amarelo;
        g.fill();
      }
    }
  }

  private drawHud(g: CanvasRenderingContext2D, v: View, beat: number): void {
    // barra de progresso da música
    const k = clamp((beat - this.inicio) / Math.max(1, this.fim - this.inicio), 0, 1);
    const bw = v.right - v.left - 24;
    roundRect(g, v.left + 12, v.top + 4, bw, 8, 4);
    g.fillStyle = 'rgba(255,255,255,0.3)';
    g.fill();
    roundRect(g, v.left + 12, v.top + 4, Math.max(8, bw * k), 8, 4);
    g.fillStyle = COR.amarelo;
    g.fill();

    // nome da próxima pose, em letras grandes
    const next = this.events.find((e) => e.beat + e.holdBeats >= beat - 0.3 && e.beat - beat <= LEAD_BEATS);
    if (next) {
      const def = this.game.catalog[next.pose];
      if (def) {
        // fica na coluna da esquerda, em cima do alvo, para não cobrir o rosto no espelho
        roundRect(g, 14, 330, 280, 150, 30);
        g.fillStyle = 'rgba(20,8,48,0.72)';
        g.fill();
        g.font = font(44, 800);
        const linhas = wrapLines(g, def.nome, 250).length;
        textBlock(g, def.nome, 154, linhas > 1 ? 380 : 405, 250, { size: 44 });
      }
    }

    // placar
    this.players.forEach((p, i) => {
      const right = this.players.length === 1 || i === 1;
      const x = right ? 1126 : 154;
      roundRect(g, x - 130, 26, 260, 76, 38);
      g.fillStyle = 'rgba(20,8,48,0.72)';
      g.fill();
      if (this.players.length > 1) {
        g.lineWidth = 6;
        g.strokeStyle = PLAYER_COLORS[i];
        g.stroke();
      }
      drawStar(g, x - 92, 64, 24, true);
      text(g, String(this.score(p)), x + 20, 66, { size: 46, maxWidth: 170 });
    });
    if (this.setup.cfg.modo === 'treino') {
      text(g, T.menu.treino, 154, 64, { size: 40, outline: COR.roxo });
    }
  }

  /** Resumo para os testes. */
  estado(): {
    abertos: number;
    finalizados: number;
    total: number;
    pausado: boolean;
    esperando: boolean;
    congelado: boolean;
    congelamentos: number;
    musica: 'youtube' | 'arquivo' | 'palminhas';
    esperandoMusica: boolean;
  } {
    return {
      abertos: this.open.length,
      finalizados: this.finished,
      total: this.events.length,
      pausado: this.paused,
      esperando: this.waiting,
      congelado: this.frozen,
      congelamentos: this.freezeCount,
      musica: this.palminhas ? 'palminhas' : this.music === this.game.youtube ? 'youtube' : 'arquivo',
      esperandoMusica: this.musicWaiting,
    };
  }
}

export const DANCA_LAYOUT = { MIRROR, LANE_Y, LINE_X, BASE_H };
