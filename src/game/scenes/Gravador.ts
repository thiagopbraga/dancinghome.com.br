// Gravador de coreografias: ela escolhe a música, dança, o jogo tira um retrato a cada N batidas,
// ela revisa os retratos e a dança vira uma fase nova no menu.
import type { SongClock } from '../../core/clock';
import { buildRecording, cleanSnapshot, type Recording, type Snapshot } from '../../core/recorder';
import type { Angles } from '../../core/types';
import { levelRange } from '../../data/choreo';
import type { Choreo } from '../../data/schema';
import { DEMO_ID } from '../../data/songs';
import { drawBackdrop } from '../draw/backdrop';
import { CARD_H, CARD_W, drawPoseCard } from '../draw/card';
import { iconArrow } from '../draw/icons';
import { drawMirror, drawSkeleton, mirrorMapper, type Rect } from '../draw/mirror';
import { drawScenario } from '../draw/scenery';
import { COR, clamp, roundRect, text, textBlock } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { T } from '../texts';
import { ButtonSet, drawCursors, type Button } from '../ui';

const MIRROR: Rect = { x: 307, y: 16, w: 666, h: 500 };
const PER_PAGE = 12;
const FIRST_BEAT = 4;
const COUNT_STEP = 0.9;

type Fase = 'escolha' | 'contagem' | 'gravando' | 'revisao' | 'salvando';

interface Retrato {
  beat: number;
  pose: string;
  angles: Angles;
  fica: boolean;
}

export class GravadorScene implements Scene {
  readonly name = 'gravador';
  readonly ui: ButtonSet;
  fase: Fase = 'escolha';
  /** Uma pose a cada quantas batidas. */
  aCada = 4;
  retratos: Retrato[] = [];
  private song: Choreo | null = null;
  private buffer: AudioBuffer | null = null;
  private clock: SongClock | null = null;
  private snaps: Snapshot[] = [];
  private nextBeat = FIRST_BEAT;
  private fimBeat = 0;
  private age = 0;
  private flash = 0;
  private page = 0;
  private songPage = 0;
  private recording: Recording | null = null;
  private nomeDanca = '';
  private nomes: Record<string, string> = {};
  private dialog: HTMLElement | null = null;
  private readonly songs: Choreo[];

  constructor(private readonly game: Game) {
    this.songs = game.songs.filter((s) => s.origem !== 'gravada' && game.hasAudioFile(s));
    this.ui = new ButtonSet([], () => game.sfx.play('select'));
    this.showChoice();
  }

  enter(): void {
    void this.game.startPose();
    this.game.narrator.say(T.gravador.escolha, { caption: false });
  }

  exit(): void {
    this.game.audio.stop();
    this.game.onMusic?.(false);
    this.dialog?.remove();
  }

  private back(onSelect: () => void): Button {
    return {
      id: 'voltar',
      x: 30,
      y: 22,
      w: 190,
      h: 100,
      label: '',
      icon: iconArrow(-1),
      color: COR.roxoClaro,
      onSelect,
    };
  }

  // ---------- 1. escolher a música ----------

  private showChoice(): void {
    this.fase = 'escolha';
    const game = this.game;
    const buttons: Button[] = [this.back(() => game.go('menu'))];
    const start = this.songPage * 3;
    this.songs.slice(start, start + 3).forEach((song, k) => {
      buttons.push({
        id: `musica-${song.id}`,
        x: 170 + k * 320,
        y: 150,
        w: 300,
        h: 240,
        label: song.title,
        fontSize: 34,
        color: [COR.rosa, '#2f8fe0', COR.laranja][k % 3],
        content: (g, x, y, w, h) => {
          textBlock(
            g,
            song.id === DEMO_ID ? T.gravador.demo : song.title,
            x + w / 2,
            y + h / 2 - 20,
            w - 30,
            {
              size: 34,
              outline: 'rgba(36,22,61,0.55)',
            },
          );
          text(g, `${Math.round(song.bpm)} BPM`, x + w / 2, y + h - 40, { size: 24, weight: 600 });
        },
        onSelect: () => void this.pick(song),
      });
    });
    if (this.songs.length > 3) {
      const pages = Math.ceil(this.songs.length / 3);
      buttons.push({
        id: 'proxima',
        x: 1130,
        y: 190,
        w: 120,
        h: 160,
        label: '',
        icon: iconArrow(1),
        color: '#4a3a7a',
        onSelect: () => {
          this.songPage = (this.songPage + 1) % pages;
          this.showChoice();
        },
      });
    }
    for (const n of [4, 8]) {
      buttons.push({
        id: `acada-${n}`,
        x: n === 4 ? 400 : 660,
        y: 480,
        w: 220,
        h: 130,
        label: `${n} ${T.gravador.batidas}`,
        fontSize: 32,
        color: '#4a3a7a',
        selected: this.aCada === n,
        onSelect: () => {
          this.aCada = n;
          this.showChoice();
        },
      });
    }
    this.ui.setButtons(buttons);
  }

  private async pick(song: Choreo): Promise<void> {
    const buffer = await this.game.audioFor(song);
    if (!buffer) return;
    this.song = song;
    this.buffer = buffer;
    this.fase = 'contagem';
    this.age = 0;
    this.ui.setButtons([]);
    this.game.narrator.say(T.narrador.gravador);
  }

  // ---------- 2 e 3. dançar e tirar os retratos ----------

  private startRecording(): void {
    const { game, song, buffer } = this;
    if (!song || !buffer) return;
    this.fase = 'gravando';
    this.snaps = [];
    this.nextBeat = FIRST_BEAT;
    const nivel = song.niveis.facil ? 'facil' : 'normal';
    const fim = levelRange(song, nivel).fim;
    this.fimBeat = game.flags.fim ? Math.min(fim, game.flags.fim) : fim;
    this.clock = game.audio.load(buffer, song.bpm, song.offsetMs);
    game.audio.play(0, 1, 0.12);
    game.onMusic?.(true);
    this.ui.setButtons([
      {
        id: 'pronto',
        x: 1040,
        y: 590,
        w: 220,
        h: 110,
        label: T.gravador.pronto,
        color: COR.verde,
        touchOnly: true,
        onSelect: () => this.finishRecording(),
      },
    ]);
  }

  private finishRecording(): void {
    const game = this.game;
    game.audio.stop();
    game.onMusic?.(false);
    const prefix = `minha-${Date.now().toString(36)}`;
    this.recording = buildRecording(this.snaps, game.catalog, prefix);
    const rec = this.recording;
    this.retratos = rec.eventos.map((e) => ({
      beat: e.beat,
      pose: e.pose,
      angles: (rec.novas[e.pose] ?? game.catalog[e.pose]).angles,
      fica: true,
    }));
    this.nomes = Object.fromEntries(Object.entries(rec.novas).map(([id, p]) => [id, p.nome]));
    const n = game.songs.filter((s) => s.origem === 'gravada').length + 1;
    this.nomeDanca = `${T.gravador.nomePadrao} ${n}`;
    this.page = 0;
    this.fase = 'revisao';
    game.narrator.say(this.retratos.length >= 2 ? T.narrador.gravadorFim : T.gravador.poucas, {
      caption: false,
    });
    this.showReview();
  }

  // ---------- 4. revisão ----------

  private showReview(): void {
    const game = this.game;
    const buttons: Button[] = [this.back(() => game.go('menu'))];
    const start = this.page * PER_PAGE;
    this.retratos.slice(start, start + PER_PAGE).forEach((r, k) => {
      const col = k % 6;
      const row = Math.floor(k / 6);
      const i = start + k;
      buttons.push({
        id: `retrato-${i}`,
        x: 100 + col * 182,
        y: 150 + row * 200,
        w: CARD_W + 16,
        h: CARD_H + 12,
        label: '',
        color: r.fica ? COR.rosa : '#4a3a7a',
        content: (g, x, y, w, h) => {
          const nome = this.nomes[r.pose] ?? game.catalog[r.pose]?.nome;
          drawPoseCard(g, r.angles, x + w / 2, y + h / 2, { label: nome, faded: !r.fica });
        },
        onSelect: () => {
          r.fica = !r.fica;
          this.showReview();
        },
      });
    });
    const pages = Math.ceil(this.retratos.length / PER_PAGE);
    if (pages > 1) {
      buttons.push({
        id: 'proxima',
        x: 1190,
        y: 250,
        w: 80,
        h: 200,
        label: '',
        icon: iconArrow(1),
        color: '#4a3a7a',
        onSelect: () => {
          this.page = (this.page + 1) % pages;
          this.showReview();
        },
      });
    }
    const ficam = this.retratos.filter((r) => r.fica).length;
    buttons.push({
      id: 'nomes',
      x: 250,
      y: 580,
      w: 250,
      h: 120,
      label: T.gravador.darNomes,
      fontSize: 32,
      color: '#4a3a7a',
      touchOnly: true,
      onSelect: () => this.openNames(),
    });
    buttons.push({
      id: 'salvar',
      x: 540,
      y: 580,
      w: 300,
      h: 120,
      label: T.gravador.salvar,
      color: COR.verde,
      disabled: ficam < 2,
      onSelect: () => void this.save(),
    });
    buttons.push({
      id: 'descartar',
      x: 880,
      y: 580,
      w: 300,
      h: 120,
      label: T.gravador.deNovo,
      fontSize: 34,
      color: COR.roxoClaro,
      onSelect: () => game.go('gravador'),
    });
    this.ui.setButtons(buttons);
  }

  /** Caixa (HTML) para dar nome à dança e às poses novas. */
  private openNames(): void {
    if (this.dialog) return;
    const rec = this.recording;
    if (!rec) return;
    const usadas = new Set(this.retratos.filter((r) => r.fica).map((r) => r.pose));
    const box = document.createElement('div');
    box.className = 'dialogo';
    box.id = 'gravador-nomes';
    const campo = (rotulo: string, valor: string, chave: string): HTMLInputElement => {
      const label = document.createElement('label');
      label.textContent = rotulo;
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 24;
      input.value = valor;
      input.dataset.nome = chave;
      label.append(input);
      box.append(label);
      return input;
    };
    const h = document.createElement('h2');
    h.textContent = T.gravador.darNomes;
    box.append(h);
    const danca = campo(T.gravador.nomeDanca, this.nomeDanca, 'danca');
    const poses = Object.keys(rec.novas)
      .filter((id) => usadas.has(id))
      .map((id) => [id, campo(`${T.gravador.nomePose}`, this.nomes[id], id)] as const);
    const acoes = document.createElement('div');
    acoes.className = 'acoes';
    const ok = document.createElement('button');
    ok.className = 'primario';
    ok.id = 'nomes-ok';
    ok.textContent = 'OK';
    ok.addEventListener('click', () => {
      this.nomeDanca = danca.value.trim() || this.nomeDanca;
      for (const [id, input] of poses) this.nomes[id] = input.value.trim() || this.nomes[id];
      box.remove();
      this.dialog = null;
    });
    acoes.append(ok);
    box.append(acoes);
    document.getElementById('ui')!.append(box);
    this.dialog = box;
  }

  // ---------- 5. salvar ----------

  private async save(): Promise<void> {
    const { game, song, recording } = this;
    if (!song || !recording || this.fase === 'salvando') return;
    const ficam = this.retratos.filter((r) => r.fica);
    if (ficam.length < 2) return;
    this.fase = 'salvando';
    this.dialog?.remove();
    this.dialog = null;
    const usadas = new Set(ficam.map((r) => r.pose));
    const novas = Object.entries(recording.novas).filter(([id]) => usadas.has(id));
    const comPernas = novas.some(([, p]) => p.nivel === 'normal');
    const ultimo = ficam[ficam.length - 1].beat;
    const fim = Math.min(song.duracaoBeats, ultimo + 8);
    const nivel = {
      trecho: { inicioBeat: 0, fimBeat: fim },
      eventos: ficam.map((r) => ({ beat: r.beat, pose: r.pose })),
    };
    const choreo: Choreo = {
      id: `gravada-${Date.now().toString(36)}`,
      title: this.nomeDanca,
      tema: T.gravador.tema,
      bpm: song.bpm,
      offsetMs: song.offsetMs,
      calibrado: true,
      duracaoBeats: song.duracaoBeats,
      origem: 'gravada',
      audioDe: song.audioDe ?? song.id,
      niveis: comPernas ? { normal: nivel } : { facil: nivel },
    };
    for (const [id, p] of novas) {
      const def = { ...p, nome: this.nomes[id] ?? p.nome };
      await game.store?.savePose(id, def);
      if (!game.store) game.catalog[id] = def;
    }
    await game.store?.saveChoreo(choreo);
    if (game.store) await game.reload();
    else game.songs.push(choreo);
    await game.saveProgress({ ...game.progress, gravadas: game.progress.gravadas + 1 });
    await game.checkAchievements();
    game.sfx.play('fanfarra');
    game.go('musicas', { modo: 'show', aviso: T.gravador.salvo, pagina: 'fim' });
  }

  // ---------- laço ----------

  pointer(kind: PointerKind, x: number, y: number): void {
    if (this.dialog) return;
    this.ui.pointer(kind, x, y);
  }

  key(code: string): void {
    if (code === 'Escape' && this.fase === 'gravando') this.finishRecording();
  }

  update(dt: number): void {
    const game = this.game;
    this.age += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.ui.update(dt, this.fase === 'gravando' || this.dialog ? [] : game.cursors());
    if (this.fase === 'contagem') {
      const step = Math.floor(this.age / COUNT_STEP);
      const before = Math.floor((this.age - dt) / COUNT_STEP);
      if (step !== before && step < 3) game.sfx.play('tick');
      if (step >= 3) {
        game.sfx.play('go');
        this.startRecording();
      }
    } else if (this.fase === 'gravando' && this.clock) {
      const beat = this.clock.beat();
      if (beat >= this.nextBeat && this.nextBeat < this.fimBeat) {
        const person = game.tracker.people[0];
        if (person) {
          this.snaps.push({ beat: this.nextBeat, angles: { ...person.angles }, vis: { ...person.vis } });
          if (cleanSnapshot(person)) {
            this.flash = 1;
            game.sfx.play('clique');
          }
        }
        this.nextBeat += this.aCada;
      }
      const acabou = this.buffer ? this.clock.position() >= this.buffer.duration - 0.05 : true;
      if (beat >= this.fimBeat || acabou) this.finishRecording();
    }
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const game = this.game;
    const cx = BASE_W / 2;
    if (this.fase === 'escolha') {
      drawBackdrop(g, v, game.time, '#3d1a85', '#2f8fe0');
      text(g, T.gravador.escolha, cx + 60, 72, { size: 52, outline: COR.roxo, maxWidth: 940 });
      if (this.songs.length === 0) {
        textBlock(g, T.musicas.cadeado, cx, 260, 900, { size: 40, outline: COR.roxo });
      }
      text(g, T.gravador.aCada, cx, 440, { size: 34, outline: COR.roxo });
    } else if (this.fase === 'contagem' || this.fase === 'gravando') {
      drawScenario(g, v, game.cenario, game.time * 2);
      const aspect = game.tracker.aspect;
      drawMirror(g, MIRROR, game.mirrorVideo, aspect);
      const map = mirrorMapper(MIRROR, aspect);
      g.save();
      roundRect(g, MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h, 28);
      g.clip();
      game.tracker.people.slice(0, 1).forEach((p) => drawSkeleton(g, p.lm, map, COR.amarelo, 7));
      if (this.flash > 0) {
        g.fillStyle = `rgba(255,255,255,${0.6 * this.flash})`;
        g.fillRect(MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h);
      }
      g.restore();
      roundRect(g, MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h, 28);
      g.lineWidth = 10;
      g.strokeStyle = this.fase === 'gravando' ? COR.rosa : COR.branco;
      g.stroke();
      if (this.fase === 'contagem') {
        const step = Math.min(2, Math.floor(this.age / COUNT_STEP));
        text(g, T.contagem[step], cx, 270, { size: 260, color: COR.amarelo, outline: COR.roxo });
        textBlock(g, T.narrador.gravador, cx, 590, 1000, { size: 40, outline: COR.roxo });
      } else if (this.clock) {
        // bolinha vermelha de "gravando", batidas e quantos retratos já foram
        g.beginPath();
        g.arc(70, 70, 22 + 4 * Math.sin(game.time * 6), 0, Math.PI * 2);
        g.fillStyle = '#ff3b5c';
        g.fill();
        text(g, T.gravador.gravando, 190, 72, { size: 34, outline: COR.roxo });
        const k = clamp(this.clock.beat() / Math.max(1, this.fimBeat), 0, 1);
        roundRect(g, 140, 600, 860, 26, 13);
        g.fillStyle = 'rgba(20,8,48,0.6)';
        g.fill();
        roundRect(g, 140, 600, Math.max(26, 860 * k), 26, 13);
        g.fillStyle = COR.amarelo;
        g.fill();
        const bons = this.snaps.filter((s) => cleanSnapshot(s)).length;
        text(g, `${bons} ${bons === 1 ? T.gravador.retrato : T.gravador.retratos}`, 570, 660, {
          size: 36,
          outline: COR.roxo,
        });
      }
    } else {
      drawBackdrop(g, v, game.time, '#3d1a85', '#ff5fa8');
      text(g, this.nomeDanca, cx + 60, 56, { size: 48, outline: COR.roxo, maxWidth: 900 });
      const msg = this.retratos.length < 2 ? T.gravador.poucas : T.gravador.revisao;
      text(g, msg, cx + 60, 112, { size: 26, color: COR.amarelo, outline: COR.roxo, maxWidth: 940 });
    }
    this.ui.draw(g);
    if (this.fase !== 'gravando') drawCursors(g, game.cursors(), game.time);
  }
}
