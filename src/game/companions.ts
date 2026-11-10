// O grupo que dança junto: as 3 idols, o cachorro, o gato, o desenho dela e os amigos resgatados na turnê.
import { sway } from '../core/drawing';
import type { Angles } from '../core/types';
import { drawIdol } from './draw/idol';
import { drawPet, type PetKind } from './draw/pets';
import type { View } from './engine';
import type { Game } from './game';
import { TURNE } from './texts';

const JUMP_SECONDS = 0.6;

export class Companions {
  /** Quantas vezes os pets pularam (um pulo por "Perfeito!"). */
  jumps = 0;
  private jumpT = 1;
  private img: HTMLImageElement | null = null;
  private imgSrc: string | null = null;

  constructor(private readonly game: Game) {}

  onPerfect(): void {
    this.jumps++;
    this.jumpT = 0;
  }

  update(dt: number): void {
    this.jumpT = Math.min(1, this.jumpT + dt / JUMP_SECONDS);
  }

  /** O desenho dela, já sem fundo, pronto para desenhar (ou null). */
  drawing(): HTMLImageElement | null {
    const src = this.game.characters.desenho;
    if (src !== this.imgSrc) {
      this.imgSrc = src;
      this.img = null;
      if (src) {
        const img = new Image();
        img.src = src;
        this.img = img;
      }
    }
    return this.img && this.img.complete && this.img.naturalWidth > 0 ? this.img : null;
  }

  /** Desenha o desenho dela balançando no ritmo, com a base em (x, y) e cabendo em `max` pixels. */
  drawDrawing(g: CanvasRenderingContext2D, x: number, y: number, max: number, beat: number): void {
    const img = this.drawing();
    if (!img) return;
    const k = max / Math.max(img.naturalWidth, img.naturalHeight);
    const w = img.naturalWidth * k;
    const h = img.naturalHeight * k;
    const s = sway(beat);
    g.save();
    g.translate(x, y - s.hop * 10);
    g.rotate(s.angle);
    g.drawImage(img, -w / 2, -h, w, h);
    g.restore();
  }

  /** Amigos resgatados na turnê, na ordem dos shows. */
  rescued(): PetKind[] {
    return TURNE.slice(0, this.game.progress.historia).map((p) => p.pet as PetKind);
  }

  private idle(beat: number, i: number): Angles {
    const a = Math.sin(beat * Math.PI + i * 1.1);
    return { lShoulder: 40 + a * 22, rShoulder: 40 - a * 22, lElbow: 140, rElbow: 140 };
  }

  draw(
    g: CanvasRenderingContext2D,
    _v: View,
    beat: number,
    pose: Angles | null,
    where: 'danca' | 'menu',
  ): void {
    const { idols } = this.game.characters;
    const frac = beat - Math.floor(beat);
    const bob = Math.max(0, 1 - frac * 2.5);
    const hop = (i: number): number =>
      Math.max(0, 1 - frac * 3) * 8 * (i % 2 === Math.floor(beat) % 2 ? 1 : 0.4);
    const ang = (i: number): Angles => pose ?? this.idle(beat, i);
    if (where === 'danca') {
      drawIdol(g, idols[1], ang(1), 150, 230 - hop(1), 200);
      drawIdol(g, idols[0], ang(0), 1060, 290 - hop(0), 190);
      drawIdol(g, idols[2], ang(2), 1200, 290 - hop(2), 190);
      this.drawDrawing(g, 1130, 470, 96, beat);
      drawPet(g, 'cachorro', 1030, 516, 78, bob, this.jumpT);
      drawPet(g, 'gato', 1238, 516, 74, bob, Math.max(0, this.jumpT - 0.12) / 0.88);
    } else {
      this.drawDrawing(g, 320, 708, 100, beat);
      drawPet(g, 'cachorro', 420, 706, 74, bob, this.jumpT);
      idols.forEach((idol, i) => drawIdol(g, idol, ang(i), 520 + i * 120, 652 - hop(i), 118));
      drawPet(g, 'gato', 860, 706, 70, bob, this.jumpT);
      this.rescued().forEach((kind, i) => drawPet(g, kind, 940 + i * 44, 708, 44, bob, 1));
    }
  }
}
