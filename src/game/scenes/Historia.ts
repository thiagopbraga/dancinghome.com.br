// Modo história: a Grande Turnê. Cinco shows, um por música; cada show resgata um amigo e pode abrir um cenário.
import { drawBackdrop } from '../draw/backdrop';
import { iconArrow } from '../draw/icons';
import { drawPet, type PetKind } from '../draw/pets';
import { COR, drawStar, padlock, roundRect, text, textBlock } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { defaultConfig } from '../match';
import { CENARIOS, T, TURNE } from '../texts';
import { ButtonSet, drawCursors, type Button } from '../ui';

const W = 220;
const H = 330;

export class HistoriaScene implements Scene {
  readonly name = 'historia';
  readonly ui: ButtonSet;
  private starting = false;

  constructor(private readonly game: Game) {
    const feitos = game.progress.historia;
    const buttons: Button[] = [
      {
        id: 'voltar',
        x: 30,
        y: 22,
        w: 190,
        h: 100,
        label: '',
        icon: iconArrow(-1),
        color: COR.roxoClaro,
        onSelect: () => game.go('menu'),
      },
    ];
    TURNE.forEach((parada, i) => {
      const song = game.song(parada.musica);
      const aberto = i <= feitos;
      buttons.push({
        id: `show-${i}`,
        x: 40 + i * (W + 25),
        y: 170 + (i % 2) * 40,
        w: W,
        h: H,
        label: parada.cidade,
        color: i < feitos ? '#2aa86a' : aberto ? COR.laranja : '#4a3a7a',
        disabled: !aberto,
        content: (g, x, y, w, h) => this.drawStop(g, i, x, y, w, h),
        onSelect: () => {
          if (this.starting) return;
          if (!song || !game.hasAudio(song)) {
            game.narrator.say(T.narrador.cadeado, { interrupt: true });
            return;
          }
          this.starting = true;
          void game.startMatch({ ...defaultConfig(song.id), historia: i }).then((ok) => {
            if (!ok) this.starting = false;
          });
        },
      });
    });
    this.ui = new ButtonSet(buttons, () => game.sfx.play('select'));
  }

  enter(): void {
    const fim = this.game.progress.historia >= TURNE.length;
    this.game.narrator.say(fim ? T.historia.fim : T.historia.titulo, { caption: false });
  }

  private drawStop(g: CanvasRenderingContext2D, i: number, x: number, y: number, w: number, h: number): void {
    const game = this.game;
    const parada = TURNE[i];
    const feitos = game.progress.historia;
    const song = game.song(parada.musica);
    const beat = game.time * 2;
    const bob = Math.max(0, 1 - (beat - Math.floor(beat)) * 2.5);
    text(g, `${T.historia.show} ${i + 1}`, x + w / 2, y + 30, { size: 26, color: COR.amarelo });
    g.save();
    textBlock(g, parada.cidade, x + w / 2, y + 68, w - 20, { size: 23 });
    g.restore();
    if (i < feitos) {
      drawPet(g, parada.pet as PetKind, x + w / 2, y + 222, 96, bob, 1);
      g.save();
      textBlock(g, parada.petNome, x + w / 2, y + 250, w - 16, { size: 19, weight: 700 });
      g.restore();
      text(g, T.historia.feito, x + w / 2, y + h - 22, { size: 22, color: COR.amarelo });
    } else if (i === feitos) {
      // o amigo espera ser resgatado: aparece em sombra
      g.save();
      g.globalAlpha = 0.35;
      drawPet(g, parada.pet as PetKind, x + w / 2, y + 222, 96, 0, 1);
      g.restore();
      text(g, '?', x + w / 2, y + 160, { size: 70, color: COR.branco, outline: COR.roxo });
      const semAudio = !song || !game.hasAudio(song);
      g.save();
      textBlock(g, semAudio ? T.musicas.cadeado : (song?.title ?? ''), x + w / 2, y + 256, w - 16, {
        size: semAudio ? 17 : 22,
        weight: 700,
      });
      g.restore();
      if (!semAudio) drawStar(g, x + w / 2, y + h - 26, 16, true, Math.sin(game.time * 3) * 0.2);
    } else {
      padlock(g, x + w / 2, y + 180, 80);
    }
    const cen = parada.cenario ? CENARIOS.find((c) => c.id === parada.cenario) : null;
    if (cen && i >= feitos && i <= feitos) {
      text(g, `+ ${cen.nome}`, x + w / 2, y + h - 54, { size: 16, color: COR.amarelo, maxWidth: w - 12 });
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
    drawBackdrop(g, v, game.time, '#1f3a8a', '#ff9a3d');
    text(g, T.historia.titulo, BASE_W / 2 + 40, 66, { size: 54, outline: COR.roxo, maxWidth: 800 });
    // a estrada da turnê, ligando as paradas
    g.strokeStyle = 'rgba(255,255,255,0.55)';
    g.lineWidth = 10;
    g.setLineDash([22, 18]);
    g.beginPath();
    TURNE.forEach((_, i) => {
      const cx = 40 + i * (W + 25) + W / 2;
      const cy = 170 + (i % 2) * 40 + H + 30;
      if (i === 0) g.moveTo(cx, cy);
      else g.lineTo(cx, cy);
    });
    g.stroke();
    g.setLineDash([]);
    if (game.progress.historia >= TURNE.length) {
      roundRect(g, 240, 610, 800, 76, 30);
      g.fillStyle = 'rgba(20,8,48,0.7)';
      g.fill();
      text(g, T.historia.fim, BASE_W / 2, 648, { size: 32, color: COR.amarelo, maxWidth: 760 });
    }
    this.ui.draw(g);
    drawCursors(g, game.cursors(), game.time);
  }
}
