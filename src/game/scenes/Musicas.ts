// Seleção de música e de nível. Músicas sem áudio mostram um cadeado.
import { detectBpm, monoOf } from '../../core/bpm';
import type { Nivel } from '../../core/types';
import { expandSections } from '../../data/choreo';
import type { Choreo } from '../../data/schema';
import { DEMO_ID } from '../../data/songs';
import { buildSurprise } from '../../data/surprise';
import { drawBackdrop } from '../draw/backdrop';
import { iconArrow, iconDuo, iconGift, iconIce } from '../draw/icons';
import { drawStickFigure } from '../draw/stickFigure';
import { COR, drawStar, makeRng, padlock, roundRect, text, textBlock } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import type { PlayConfig } from '../match';
import { T } from '../texts';
import { ButtonSet, drawCursors, type Button } from '../ui';

const PER_PAGE = 3;
const CARD_COLORS = ['#ff5fa8', '#2f8fe0', '#ff9a3d', '#2aa86a', '#8a4dff', '#d9589b'];

export interface MusicasParams {
  modo: PlayConfig['modo'];
  /** Frase para o narrador dizer ao abrir (por exemplo, depois de salvar uma dança). */
  aviso?: string;
  /** 'fim': abre na última página, onde ficam as danças criadas por ela. */
  pagina?: 'fim';
}

export class MusicasScene implements Scene {
  readonly name = 'musicas';
  readonly ui: ButtonSet;
  private page = 0;
  private chosen: Choreo | null = null;
  /** Fase do modo surpresa, montada na hora (os testes leem). */
  surpresa: { choreo: Choreo; bpmAchado: boolean } | null = null;
  private surpresaMsg = '';
  private readonly file: HTMLInputElement;
  private dupla = false;
  private estatua = false;
  private starting = false;
  private readonly songs: Choreo[];

  constructor(
    private readonly game: Game,
    private readonly params: MusicasParams,
  ) {
    // A demonstração primeiro, depois as 5 músicas base, as outras músicas públicas sintetizadas e as danças gravadas.
    const order = (s: Choreo): number =>
      s.id === DEMO_ID ? 0 : s.origem === 'base' ? 1 : s.origem === 'demo' ? 2 : 3;
    this.songs = [...game.songs].sort((a, b) => order(a) - order(b));
    this.file = document.createElement('input');
    this.file.type = 'file';
    this.file.accept = 'audio/*';
    this.file.hidden = true;
    this.file.id = 'surpresa-arquivo';
    this.file.addEventListener('change', () => void this.loadSurprise());
    this.ui = new ButtonSet([], (kind) => {
      if (kind === 'select') game.sfx.play('select');
    });
    if (params.pagina === 'fim') this.page = Math.max(0, Math.ceil(this.songs.length / PER_PAGE) - 1);
    this.showList();
  }

  enter(): void {
    document.getElementById('ui')!.append(this.file);
    this.game.narrator.say(this.params.aviso ?? T.narrador.escolhaMusica);
  }

  private get pages(): number {
    return Math.max(1, Math.ceil((this.songs.length + this.extraCards().length) / PER_PAGE));
  }

  /** Cartões extras no fim da lista (modo surpresa). */
  private extraCards(): Button[] {
    if (this.params.modo !== 'show') return [];
    return [
      {
        id: 'surpresa',
        x: 0,
        y: 0,
        w: 300,
        h: 400,
        label: T.musicas.surpresa,
        color: '#2aa86a',
        touchOnly: true,
        content: (g, x, y, w) => {
          iconGift(g, x + w / 2, y + 120, 150);
          text(g, T.musicas.surpresa, x + w / 2, y + 248, { size: 36, outline: 'rgba(36,22,61,0.55)' });
          g.save();
          textBlock(g, this.surpresaMsg || T.musicas.surpresaDica, x + w / 2, y + 296, w - 36, {
            size: 20,
            weight: 600,
          });
          g.restore();
        },
        onSelect: () => this.file.click(),
      },
    ];
  }

  /** Música surpresa: abre o arquivo, acha o BPM e sorteia as poses. O áudio fica só na memória. */
  private async loadSurprise(): Promise<void> {
    const game = this.game;
    const file = this.file.files?.[0];
    this.file.value = '';
    if (!file) return;
    this.surpresaMsg = T.musicas.surpresaAbrindo;
    try {
      const buffer = await game.audio.decode(await file.arrayBuffer());
      const tempo = detectBpm(monoOf(buffer), buffer.sampleRate);
      const achou = !!tempo && tempo.confianca >= 0.15;
      const id = `surpresa-${Date.now().toString(36)}`;
      const choreo = buildSurprise(
        {
          id,
          title: T.musicas.surpresa,
          bpm: achou ? tempo.bpm : 120,
          offsetMs: achou ? tempo.offsetMs : 0,
          durationS: buffer.duration,
        },
        game.catalog,
        makeRng(game.flags.semente ?? Math.floor(Math.random() * 1e9)),
      );
      game.tempAudio.clear();
      game.tempAudio.set(id, buffer);
      this.surpresaMsg = '';
      this.surpresa = { choreo, bpmAchado: achou };
      this.chosen = choreo;
      game.narrator.say(T.narrador.escolhaNivel, { caption: false });
      this.showLevels();
    } catch (err) {
      console.warn('Não consegui abrir o áudio', err);
      this.surpresaMsg = T.musicas.surpresaErro;
    }
  }

  exit(): void {
    this.file.remove();
  }

  private backButton(onSelect: () => void): Button {
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

  private showList(): void {
    this.chosen = null;
    const game = this.game;
    const buttons: Button[] = [this.backButton(() => game.go('menu'))];
    const extras = this.extraCards();
    const start = this.page * PER_PAGE;
    for (let k = 0; k < PER_PAGE; k++) {
      const idx = start + k;
      const x = 170 + k * 320;
      if (idx < this.songs.length) {
        const song = this.songs[idx];
        buttons.push({
          id: `musica-${song.id}`,
          x,
          y: 150,
          w: 300,
          h: 400,
          label: song.title,
          color: CARD_COLORS[idx % CARD_COLORS.length],
          content: (g, bx, by, bw, bh) => this.drawSongCard(g, song, bx, by, bw, bh),
          onSelect: () => this.pick(song),
        });
      } else if (idx - this.songs.length < extras.length) {
        buttons.push({ ...extras[idx - this.songs.length], x, y: 150, w: 300, h: 400 });
      }
    }
    if (this.pages > 1) {
      buttons.push({
        id: 'anterior',
        x: 30,
        y: 270,
        w: 120,
        h: 170,
        label: '',
        icon: iconArrow(-1),
        color: '#4a3a7a',
        disabled: this.page === 0,
        onSelect: () => {
          this.page = Math.max(0, this.page - 1);
          this.showList();
        },
      });
      buttons.push({
        id: 'proxima',
        x: 1130,
        y: 270,
        w: 120,
        h: 170,
        label: '',
        icon: iconArrow(1),
        color: '#4a3a7a',
        disabled: this.page >= this.pages - 1,
        onSelect: () => {
          this.page = Math.min(this.pages - 1, this.page + 1);
          this.showList();
        },
      });
    }
    this.ui.setButtons(buttons);
  }

  private pick(song: Choreo): void {
    if (!this.game.hasAudio(song)) {
      this.game.narrator.say(T.narrador.cadeado, { interrupt: true });
      return;
    }
    this.chosen = song;
    this.game.narrator.say(T.narrador.escolhaNivel, { caption: false });
    this.showLevels();
  }

  private showLevels(): void {
    const song = this.chosen;
    if (!song) return;
    const show = this.params.modo === 'show';
    const niveis = (['facil', 'normal'] as const).filter((n) => expandSections(song, n).length > 0);
    const buttons: Button[] = [this.backButton(() => this.showList())];
    const w = 400;
    const total = niveis.length * w + (niveis.length - 1) * 80;
    niveis.forEach((nivel, i) => {
      buttons.push({
        id: nivel,
        x: BASE_W / 2 - total / 2 + i * (w + 80),
        y: 170,
        w,
        h: 230,
        label: nivel === 'facil' ? T.musicas.facil : T.musicas.normal,
        fontSize: 60,
        color: nivel === 'facil' ? '#2aa86a' : COR.laranja,
        content: (g, bx, by, bw, bh) => {
          const n = nivel === 'facil' ? 1 : 2;
          for (let s = 0; s < n; s++) drawStar(g, bx + bw / 2 + (s - (n - 1) / 2) * 70, by + 80, 30, true);
          text(g, nivel === 'facil' ? T.musicas.facil : T.musicas.normal, bx + bw / 2, by + bh - 70, {
            size: 60,
            outline: 'rgba(36,22,61,0.55)',
          });
        },
        onSelect: () => this.start(nivel),
      });
    });
    if (show) {
      buttons.push({
        id: 'dupla',
        x: 330,
        y: 450,
        w: 290,
        h: 150,
        label: T.musicas.dupla,
        icon: iconDuo,
        color: '#4a3a7a',
        selected: this.dupla,
        onSelect: () => {
          this.dupla = !this.dupla;
          this.showLevels();
        },
      });
      buttons.push({
        id: 'estatua',
        x: 660,
        y: 450,
        w: 290,
        h: 150,
        label: T.musicas.estatua,
        icon: iconIce,
        color: '#4a3a7a',
        selected: this.estatua,
        onSelect: () => {
          this.estatua = !this.estatua;
          this.showLevels();
        },
      });
    }
    this.ui.setButtons(buttons);
  }

  private start(nivel: Nivel): void {
    if (!this.chosen || this.starting) return;
    this.starting = true;
    const cfg: PlayConfig = {
      songId: this.chosen.id,
      nivel,
      modo: this.params.modo,
      dupla: this.dupla,
      estatua: this.estatua,
      choreo: this.chosen.origem === 'surpresa' ? this.chosen : undefined,
    };
    void this.game.startMatch(cfg).then((ok) => {
      if (!ok) this.starting = false;
    });
  }

  private drawSongCard(
    g: CanvasRenderingContext2D,
    song: Choreo,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const game = this.game;
    const locked = !game.hasAudio(song);
    // pose do refrão como "capa" da música
    const nivel: Nivel = song.niveis.facil ? 'facil' : 'normal';
    const events = expandSections(song, nivel);
    const capa = events.find((e) => e.secao.startsWith('refrao')) ?? events[0];
    const pose = capa ? game.catalog[capa.pose] : undefined;
    roundRect(g, x + 24, y + 22, w - 48, 190, 22);
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.fill();
    if (pose) drawStickFigure(g, pose.angles, x + w / 2, y + 122, 165, { color: COR.amarelo });
    text(g, song.title, x + w / 2, y + 248, { size: 36, maxWidth: w - 28, outline: 'rgba(36,22,61,0.55)' });
    if (song.tema) {
      g.save();
      textBlock(g, song.tema, x + w / 2, y + 290, w - 36, { size: 21, weight: 600 });
      g.restore();
    }
    const best = game.bestStars(song.id);
    for (let i = 0; i < 3; i++) drawStar(g, x + w / 2 + (i - 1) * 54, y + h - 46, 21, i < best);
    if (locked) {
      roundRect(g, x, y, w, h, 34);
      g.fillStyle = 'rgba(20,8,48,0.62)';
      g.fill();
      padlock(g, x + w / 2, y + 120, 110);
      roundRect(g, x + 10, y + 222, w - 20, 132, 20);
      g.fillStyle = 'rgba(20,8,48,0.94)';
      g.fill();
      text(g, song.title, x + w / 2, y + 250, { size: 32, maxWidth: w - 40, color: COR.amarelo });
      g.save();
      textBlock(g, T.musicas.cadeado, x + w / 2, y + 292, w - 36, { size: 22 });
      g.restore();
    }
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    this.ui.pointer(kind, x, y);
  }

  update(dt: number): void {
    this.ui.update(dt, this.game.cursors());
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const game = this.game;
    drawBackdrop(g, v, game.time, '#24306b', '#8a4dff');
    const treino = this.params.modo === 'treino';
    const titulo = this.chosen ? this.chosen.title : treino ? T.menu.treino : T.musicas.titulo;
    text(g, titulo, BASE_W / 2 + 40, 72, { size: 60, outline: COR.roxo, maxWidth: 940 });
    this.ui.draw(g);
    if (!this.chosen && this.pages > 1) {
      for (let i = 0; i < this.pages; i++) {
        g.beginPath();
        g.arc(BASE_W / 2 + (i - (this.pages - 1) / 2) * 34, 600, i === this.page ? 12 : 8, 0, Math.PI * 2);
        g.fillStyle = i === this.page ? COR.amarelo : 'rgba(255,255,255,0.5)';
        g.fill();
      }
    }
    drawCursors(g, game.cursors(), game.time);
  }
}
