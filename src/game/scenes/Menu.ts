// Menu principal: botões gigantes escolhidos pela mão (1 s em cima) ou pelo toque.
import { drawBackdrop } from '../draw/backdrop';
import { iconBus, iconGear, iconGroup, iconMedal, iconPlay, iconTurtle, iconWand } from '../draw/icons';
import { COR, drawStar, roundRect, text } from '../draw/util';
import { BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { T } from '../texts';
import { ButtonSet, drawCursors, type Button } from '../ui';

export class MenuScene implements Scene {
  readonly name = 'menu';
  readonly ui: ButtonSet;

  constructor(private readonly game: Game) {
    const has = (route: string): boolean => !!game.routes[route];
    const buttons: Button[] = [
      {
        id: 'jogar',
        x: 430,
        y: 120,
        w: 420,
        h: 250,
        label: T.menu.jogar,
        fontSize: 64,
        icon: iconPlay,
        color: COR.rosa,
        onSelect: () => game.go('musicas', { modo: 'show' }),
      },
    ];
    if (has('historia')) {
      buttons.push({
        id: 'historia',
        x: 70,
        y: 150,
        w: 310,
        h: 200,
        label: T.menu.historia,
        icon: iconBus,
        color: COR.laranja,
        onSelect: () => game.go('historia'),
      });
    }
    if (has('treinoMusicas')) {
      buttons.push({
        id: 'treino',
        x: 900,
        y: 150,
        w: 310,
        h: 200,
        label: T.menu.treino,
        icon: iconTurtle,
        color: '#2aa86a',
        onSelect: () => game.go('treinoMusicas'),
      });
    }
    const row: Button[] = [];
    if (has('gravador'))
      row.push({
        id: 'criar',
        x: 0,
        y: 410,
        w: 300,
        h: 170,
        label: T.menu.criar,
        icon: iconWand,
        color: COR.roxoClaro,
        onSelect: () => game.go('gravador'),
      });
    if (has('personagens'))
      row.push({
        id: 'personagens',
        x: 0,
        y: 410,
        w: 300,
        h: 170,
        label: T.menu.personagens,
        icon: iconGroup,
        color: '#2f8fe0',
        onSelect: () => game.go('personagens'),
      });
    if (has('album'))
      row.push({
        id: 'album',
        x: 0,
        y: 410,
        w: 300,
        h: 170,
        label: T.menu.album,
        icon: iconMedal,
        color: '#d9589b',
        onSelect: () => game.go('album'),
      });
    const gap = 40;
    const total = row.length * 300 + Math.max(0, row.length - 1) * gap;
    row.forEach((b, i) => (b.x = BASE_W / 2 - total / 2 + i * (300 + gap)));
    buttons.push(...row);
    if (has('pais')) {
      buttons.push({
        id: 'pais',
        x: 1130,
        y: 610,
        w: 130,
        h: 96,
        label: T.menu.pais,
        fontSize: 24,
        icon: iconGear,
        color: '#4a3a7a',
        holdSeconds: 3,
        onSelect: () => game.go('pais'),
      });
    }
    this.ui = new ButtonSet(buttons, (kind) => {
      if (kind === 'select') game.sfx.play('select');
    });
    this.ui.grace = 1;
  }

  enter(): void {
    const game = this.game;
    game.sim?.resetScripts();
    if (!game.welcomed) {
      game.welcomed = true;
      game.narrator.say(T.narrador.boasVindas);
    }
    game.narrator.say(T.narrador.menu, { caption: !game.welcomedCaption });
    game.welcomedCaption = true;
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    this.ui.pointer(kind, x, y);
  }

  update(dt: number): void {
    this.ui.update(dt, this.game.cursors());
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const game = this.game;
    drawBackdrop(g, v, game.time);
    game.drawCompanions?.(g, v, game.time * 2, null, 'menu');
    text(g, game.groupName || T.titulo, BASE_W / 2, 60, { size: 58, outline: COR.roxo, maxWidth: 760 });
    // total de estrelas
    roundRect(g, 40, 26, 190, 72, 36);
    g.fillStyle = 'rgba(20,8,48,0.6)';
    g.fill();
    drawStar(g, 82, 62, 24, true);
    text(g, String(game.totalStars()), 152, 64, { size: 44 });
    this.ui.draw(g);
    if (game.routes.pais)
      text(g, T.menu.segurePais, 1195, 596, { size: 15, color: 'rgba(255,255,255,0.75)', maxWidth: 170 });
    if (game.poseState === 'carregando') {
      text(g, T.preparandoCamera, BASE_W / 2, 668, { size: 32, color: COR.amarelo, outline: COR.roxo });
    } else if (game.cursors().length === 0 && game.poseState === 'pronta') {
      text(g, T.menu.dicaMao, BASE_W / 2, 668, { size: 32, outline: COR.roxo, maxWidth: 1000 });
    }
    drawCursors(g, game.cursors(), game.time);
  }
}
