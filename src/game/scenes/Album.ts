// Álbum de conquistas: as medalhas que ela já ganhou e as que faltam.
import { CONQUISTAS } from '../../data/progress';
import { drawBackdrop } from '../draw/backdrop';
import { iconArrow } from '../draw/icons';
import { COR, drawStar, padlock, roundRect, text, textBlock } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { T } from '../texts';
import { ButtonSet, drawCursors } from '../ui';

const COLS = 4;

export class AlbumScene implements Scene {
  readonly name = 'album';
  readonly ui: ButtonSet;

  constructor(private readonly game: Game) {
    this.ui = new ButtonSet(
      [
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
      ],
      () => game.sfx.play('select'),
    );
  }

  enter(): void {
    // medalhas que o progresso já merece entram no álbum ao abrir
    void this.game.checkAchievements();
  }

  /** Medalhas ganhas, na ordem do álbum (os testes leem). */
  ganhas(): string[] {
    return CONQUISTAS.filter((c) => this.game.progress.conquistas.includes(c.id)).map((c) => c.id);
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    this.ui.pointer(kind, x, y);
  }

  update(dt: number): void {
    this.ui.update(dt, this.game.cursors());
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const game = this.game;
    drawBackdrop(g, v, game.time, '#3d1a85', '#d9589b');
    const ganhas = this.ganhas();
    text(g, T.album.titulo, BASE_W / 2 + 40, 60, { size: 50, outline: COR.roxo, maxWidth: 800 });
    text(g, `${ganhas.length} / ${CONQUISTAS.length}`, 1160, 62, {
      size: 40,
      color: COR.amarelo,
      outline: COR.roxo,
    });
    const w = 285;
    const h = 176;
    CONQUISTAS.forEach((c, i) => {
      const x = 46 + (i % COLS) * (w + 16);
      const y = 132 + Math.floor(i / COLS) * (h + 14);
      const tem = ganhas.includes(c.id);
      roundRect(g, x, y, w, h, 24);
      g.fillStyle = tem ? 'rgba(255,214,64,0.95)' : 'rgba(20,8,48,0.55)';
      g.fill();
      g.lineWidth = 4;
      g.strokeStyle = tem ? COR.branco : 'rgba(255,255,255,0.35)';
      g.stroke();
      if (tem) {
        // medalha: fita, disco e estrela, com um brilho que gira devagar
        g.fillStyle = COR.rosa;
        g.fillRect(x + 36, y + 14, 14, 40);
        g.fillStyle = COR.azul;
        g.fillRect(x + 54, y + 14, 14, 40);
        g.beginPath();
        g.arc(x + 52, y + 78, 34, 0, Math.PI * 2);
        g.fillStyle = '#ff9a3d';
        g.fill();
        g.lineWidth = 4;
        g.strokeStyle = COR.branco;
        g.stroke();
        drawStar(g, x + 52, y + 78, 20, true, Math.sin(game.time * 2 + i) * 0.15);
      } else {
        padlock(g, x + 52, y + 74, 54);
      }
      const cor = tem ? COR.tinta : COR.branco;
      g.save();
      textBlock(g, c.nome, x + 180, y + 50, 180, { size: 25, color: cor });
      g.restore();
      g.save();
      textBlock(g, c.descricao, x + w / 2, y + 128, w - 24, { size: 18, weight: 600, color: cor });
      g.restore();
    });
    this.ui.draw(g);
    drawCursors(g, game.cursors(), game.time);
  }
}
