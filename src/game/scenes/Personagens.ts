// Tela "Meu grupo": as 3 idols (nome, cor, cabelo, acessório), os pets, o cenário e o desenho dela.
// Figurinos e cenários novos abrem com 5, 15 e 30 estrelas.
import { removeWhite } from '../../core/drawing';
import type { Characters, Idol } from '../../data/schema';
import { drawBackdrop } from '../draw/backdrop';
import { iconArrow } from '../draw/icons';
import { drawIdol, HAIR_STYLES } from '../draw/idol';
import { drawPet } from '../draw/pets';
import { SCENARIOS } from '../draw/scenery';
import { COR, drawStar, padlock, roundRect, text } from '../draw/util';
import { BASE_H, BASE_W, type PointerKind, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { ACESSORIOS, CENARIOS, CORES_CABELO, CORES_FIGURINO, T } from '../texts';
import { ButtonSet, drawCursors, type Button } from '../ui';

const HAIR_NAMES = ['Chiquinhas', 'Rabo alto', 'Coques', 'Comprido'];
const MAX_DRAWING = 360;

/** Tira o fundo branco de uma foto e devolve um PNG (data URL) recortado, ou null se não sobrou desenho. */
export function processDrawing(source: CanvasImageSource, sw: number, sh: number): string | null {
  if (sw <= 0 || sh <= 0) return null;
  const k = Math.min(1, MAX_DRAWING / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * k));
  const h = Math.max(1, Math.round(sh * k));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(source, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h);
  const box = removeWhite(data.data, w, h);
  if (!box || box.w < 8 || box.h < 8) return null;
  g.putImageData(data, 0, 0);
  const out = document.createElement('canvas');
  out.width = box.w;
  out.height = box.h;
  out.getContext('2d')?.drawImage(c, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return out.toDataURL('image/png');
}

export class PersonagensScene implements Scene {
  readonly name = 'personagens';
  readonly ui: ButtonSet;
  /** Idol que está sendo editada. */
  sel = 0;
  /** Modo câmera, para fotografar o desenho. */
  foto = false;
  aviso = '';
  private dialog: HTMLElement | null = null;
  private readonly file: HTMLInputElement;

  constructor(private readonly game: Game) {
    this.ui = new ButtonSet([], () => game.sfx.play('select'));
    this.file = document.createElement('input');
    this.file.type = 'file';
    this.file.accept = 'image/*';
    this.file.hidden = true;
    this.file.id = 'desenho-arquivo';
    this.file.addEventListener('change', () => void this.loadFile());
    this.build();
  }

  enter(): void {
    document.getElementById('ui')!.append(this.file);
    this.game.narrator.say(T.personagens.titulo, { caption: false });
  }

  exit(): void {
    this.file.remove();
    this.dialog?.remove();
  }

  private get chars(): Characters {
    return this.game.characters;
  }

  private async change(patch: Partial<Characters>): Promise<void> {
    await this.game.saveCharacters({ ...this.chars, ...patch });
    this.build();
  }

  private changeIdol(patch: Partial<Idol>): void {
    const idols = this.chars.idols.map((idol, i) => (i === this.sel ? { ...idol, ...patch } : idol));
    void this.change({ idols });
  }

  private build(): void {
    const game = this.game;
    const total = game.totalStars();
    const idol = this.chars.idols[this.sel];
    if (this.foto) {
      this.ui.setButtons([
        {
          id: 'capturar',
          x: 490,
          y: 590,
          w: 300,
          h: 110,
          label: T.personagens.capturar,
          color: COR.rosa,
          touchOnly: true,
          onSelect: () => this.capture(),
        },
        {
          id: 'voltar',
          x: 30,
          y: 22,
          w: 190,
          h: 100,
          label: '',
          icon: iconArrow(-1),
          color: COR.roxoClaro,
          touchOnly: true,
          onSelect: () => {
            this.foto = false;
            this.build();
          },
        },
      ]);
      return;
    }
    const b: Button[] = [
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
    this.chars.idols.forEach((it, i) => {
      b.push({
        id: `idol-${i}`,
        x: 40 + i * 205,
        y: 140,
        w: 195,
        h: 330,
        label: it.nome,
        color: '#3a2a6b',
        selected: i === this.sel,
        content: (g, x, y, w, h) => {
          drawIdol(g, it, this.idle(i), x + w / 2, y + 175, 240);
          text(g, it.nome, x + w / 2, y + h - 30, { size: 30, maxWidth: w - 16 });
        },
        onSelect: () => {
          this.sel = i;
          this.build();
        },
      });
    });
    const locked =
      (
        falta: number,
        draw: (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => void,
      ) =>
      (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void => {
        draw(g, x, y, w, h);
        if (falta > 0) {
          roundRect(g, x, y, w, h, 18);
          g.fillStyle = 'rgba(20,8,48,0.88)';
          g.fill();
          padlock(g, x + w / 2, y + h / 2 - 6, Math.min(w, h) * 0.5);
          text(g, `${falta}`, x + w / 2, y + h - 13, { size: 17, color: COR.amarelo });
        }
      };
    // cor do figurino
    CORES_FIGURINO.forEach((c, i) => {
      const falta = Math.max(0, c.estrelas - total);
      b.push({
        id: `cor-${i}`,
        x: 690 + i * 72,
        y: 138,
        w: 64,
        h: 72,
        label: '',
        color: c.cor,
        disabled: falta > 0,
        selected: idol.cor === c.cor,
        content: locked(falta, () => undefined),
        onSelect: () => this.changeIdol({ cor: c.cor }),
      });
    });
    // penteado e cor do cabelo
    for (let i = 0; i < HAIR_STYLES; i++) {
      b.push({
        id: `cabelo-${i}`,
        x: 690 + i * 144,
        y: 236,
        w: 134,
        h: 76,
        label: HAIR_NAMES[i],
        fontSize: 21,
        color: '#4a3a7a',
        selected: idol.cabelo === i,
        onSelect: () => this.changeIdol({ cabelo: i }),
      });
    }
    CORES_CABELO.forEach((cor, i) => {
      b.push({
        id: `cabelocor-${i}`,
        x: 690 + i * 96,
        y: 326,
        w: 86,
        h: 62,
        label: '',
        color: cor,
        selected: idol.cabeloCor === cor,
        content: () => undefined,
        onSelect: () => this.changeIdol({ cabeloCor: cor }),
      });
    });
    ACESSORIOS.forEach((a, i) => {
      const falta = Math.max(0, a.estrelas - total);
      b.push({
        id: `acessorio-${a.id}`,
        x: 690 + i * 144,
        y: 412,
        w: 134,
        h: 76,
        label: a.nome,
        fontSize: 19,
        color: '#4a3a7a',
        disabled: falta > 0,
        selected: idol.acessorio === a.id,
        content: locked(falta, (g, x, y, w, h) =>
          text(g, a.nome, x + w / 2, y + h / 2, { size: 19, maxWidth: w - 10 }),
        ),
        onSelect: () => this.changeIdol({ acessorio: a.id }),
      });
    });
    CENARIOS.forEach((c, i) => {
      const falta = Math.max(0, c.estrelas - total);
      b.push({
        id: `cenario-${c.id}`,
        x: 690 + i * 144,
        y: 532,
        w: 134,
        h: 104,
        label: c.nome,
        color: '#24163d',
        disabled: falta > 0,
        selected: this.chars.cenario === c.id,
        content: locked(falta, (g, x, y, w, h) => {
          // miniatura do cenário
          g.save();
          roundRect(g, x + 5, y + 5, w - 10, h - 34, 12);
          g.clip();
          g.translate(x + 5, y + 5);
          const k = (w - 10) / BASE_W;
          g.scale(k, k);
          SCENARIOS[c.id]?.(g, { left: 0, right: BASE_W, top: 0, bottom: BASE_H, scale: 1 }, game.time * 2);
          g.restore();
          text(g, c.nome, x + w / 2, y + h - 15, { size: 16, maxWidth: w - 8 });
        }),
        onSelect: () => void this.change({ cenario: c.id }),
      });
    });
    // ações de toque: nomes e o desenho dela
    b.push({
      id: 'renomear',
      x: 40,
      y: 500,
      w: 290,
      h: 84,
      label: T.personagens.renomear,
      fontSize: 30,
      color: '#4a3a7a',
      touchOnly: true,
      onSelect: () => this.openNames(),
    });
    b.push({
      id: 'arquivo',
      x: 350,
      y: 500,
      w: 290,
      h: 84,
      label: T.personagens.arquivo,
      fontSize: 30,
      color: '#2f8fe0',
      touchOnly: true,
      onSelect: () => this.file.click(),
    });
    if (game.mirrorVideo) {
      b.push({
        id: 'foto',
        x: 40,
        y: 600,
        w: 290,
        h: 84,
        label: T.personagens.foto,
        fontSize: 22,
        color: '#2f8fe0',
        touchOnly: true,
        onSelect: () => {
          this.foto = true;
          void game.startPose();
          this.build();
        },
      });
    }
    if (this.chars.desenho) {
      b.push({
        id: 'tirar',
        x: 350,
        y: 600,
        w: 290,
        h: 84,
        label: T.personagens.tirar,
        fontSize: 26,
        color: '#4a3a7a',
        touchOnly: true,
        onSelect: () => void this.change({ desenho: null }),
      });
    }
    this.ui.setButtons(b, 0.3);
  }

  private idle(i: number): { lShoulder: number; rShoulder: number; lElbow: number; rElbow: number } {
    const a = Math.sin(this.game.time * 3 + i * 1.3);
    return { lShoulder: 45 + a * 20, rShoulder: 45 - a * 20, lElbow: 140, rElbow: 140 };
  }

  private async setDrawing(url: string | null): Promise<void> {
    if (!url) {
      this.aviso = T.personagens.semDesenho;
      return;
    }
    this.aviso = '';
    await this.change({ desenho: url });
  }

  private async loadFile(): Promise<void> {
    const file = this.file.files?.[0];
    this.file.value = '';
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      await this.setDrawing(processDrawing(bmp, bmp.width, bmp.height));
      bmp.close();
    } catch {
      this.aviso = T.personagens.semDesenho;
    }
  }

  private capture(): void {
    const v = this.game.mirrorVideo;
    this.foto = false;
    if (v && v.videoWidth > 0) void this.setDrawing(processDrawing(v, v.videoWidth, v.videoHeight));
    this.build();
  }

  /** Caixa (HTML) para mudar o nome do grupo, das idols e dos pets. */
  private openNames(): void {
    if (this.dialog) return;
    const c = this.chars;
    const box = document.createElement('div');
    box.className = 'dialogo';
    box.id = 'personagens-nomes';
    const h = document.createElement('h2');
    h.textContent = T.personagens.renomear;
    box.append(h);
    const campo = (rotulo: string, valor: string, chave: string, max: number): HTMLInputElement => {
      const label = document.createElement('label');
      label.textContent = rotulo;
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = max;
      input.value = valor;
      input.dataset.nome = chave;
      label.append(input);
      box.append(label);
      return input;
    };
    const grupo = campo(T.personagens.grupo, c.grupo, 'grupo', 24);
    const idols = c.idols.map((idol, i) =>
      campo(`${T.personagens.idol} ${i + 1}`, idol.nome, `idol-${i}`, 20),
    );
    const cachorro = campo(T.personagens.cachorro, c.cachorro, 'cachorro', 20);
    const gato = campo(T.personagens.gato, c.gato, 'gato', 20);
    const acoes = document.createElement('div');
    acoes.className = 'acoes';
    const ok = document.createElement('button');
    ok.className = 'primario';
    ok.id = 'nomes-ok';
    ok.textContent = 'OK';
    ok.addEventListener('click', () => {
      box.remove();
      this.dialog = null;
      void this.change({
        grupo: grupo.value.trim() || c.grupo,
        idols: c.idols.map((idol, i) => ({ ...idol, nome: idols[i].value.trim() || idol.nome })),
        cachorro: cachorro.value.trim() || c.cachorro,
        gato: gato.value.trim() || c.gato,
      });
    });
    acoes.append(ok);
    box.append(acoes);
    document.getElementById('ui')!.append(box);
    this.dialog = box;
  }

  pointer(kind: PointerKind, x: number, y: number): void {
    if (this.dialog) return;
    this.ui.pointer(kind, x, y);
  }

  update(dt: number): void {
    this.ui.update(dt, this.dialog || this.foto ? [] : this.game.cursors());
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    const game = this.game;
    drawBackdrop(g, v, game.time, '#24306b', '#b0478f');
    if (this.foto) {
      const video = game.mirrorVideo;
      const w = 720;
      const h = 540;
      roundRect(g, 280, 30, w, h, 24);
      g.fillStyle = '#16121f';
      g.fill();
      if (video && video.videoWidth > 0) {
        g.save();
        roundRect(g, 280, 30, w, h, 24);
        g.clip();
        g.drawImage(video, 280, 30, w, h);
        g.restore();
      }
      text(g, T.personagens.fotoDica, BASE_W / 2, 560, { size: 26, outline: COR.roxo, maxWidth: 1000 });
      this.ui.draw(g);
      return;
    }
    text(g, `${T.personagens.titulo}: ${this.chars.grupo}`, 560, 72, {
      size: 46,
      outline: COR.roxo,
      maxWidth: 640,
    });
    drawStar(g, 1130, 70, 24, true);
    text(g, String(game.totalStars()), 1195, 72, { size: 40 });
    // rótulos das fileiras
    const rot = (s: string, y: number): void => {
      g.save();
      g.textAlign = 'left';
      text(g, s, 690, y, { size: 19, color: COR.amarelo, align: 'left' });
      g.restore();
    };
    rot(`${T.personagens.cor} · ${this.chars.idols[this.sel].nome}`, 124);
    rot(T.personagens.cabelo, 224);
    rot(T.personagens.acessorio, 400);
    rot(`${T.personagens.cenario} · ${T.personagens.cadeado}`, 518);
    this.ui.draw(g);
    // pets e o desenho dela, embaixo dos cenários
    const beat = game.time * 2;
    const bob = Math.max(0, 1 - (beat - Math.floor(beat)) * 2.5);
    drawPet(g, 'cachorro', 740, 712, 62, bob, 1);
    text(g, this.chars.cachorro, 740, 652, { size: 16 });
    drawPet(g, 'gato', 850, 712, 58, bob, 1);
    text(g, this.chars.gato, 850, 652, { size: 16 });
    game.companions?.rescued().forEach((kind, i) => drawPet(g, kind, 940 + i * 56, 712, 46, bob, 1));
    game.companions?.drawDrawing(g, 1210, 716, 76, beat);
    if (this.aviso) text(g, this.aviso, 340, 700, { size: 20, color: COR.amarelo, maxWidth: 620 });
    drawCursors(g, game.cursors(), game.time);
  }
}
