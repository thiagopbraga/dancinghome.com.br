// Cartão de pose: o boneco da pose-alvo (espelhado como ela se vê), sem arquivos de imagem.
import type { Angles } from '../../core/types';
import { drawStickFigure } from './stickFigure';
import { COR, roundRect, text } from './util';

export const CARD_W = 150;
export const CARD_H = 172;

export function drawPoseCard(
  g: CanvasRenderingContext2D,
  angles: Angles,
  cx: number,
  cy: number,
  opts: {
    scale?: number;
    color?: string;
    label?: string;
    alpha?: number;
    faded?: boolean;
    w?: number;
    h?: number;
  } = {},
): void {
  const s = opts.scale ?? 1;
  const w = (opts.w ?? CARD_W) * s;
  const h = (opts.h ?? CARD_H) * s;
  g.save();
  g.globalAlpha = opts.alpha ?? 1;
  roundRect(g, cx - w / 2, cy - h / 2 + 5, w, h, 22 * s);
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fill();
  roundRect(g, cx - w / 2, cy - h / 2, w, h, 22 * s);
  g.fillStyle = opts.faded ? '#d9d2ea' : '#fffaf0';
  g.fill();
  g.lineWidth = 7 * s;
  g.strokeStyle = opts.color ?? COR.rosa;
  g.stroke();
  const labelH = opts.label ? 26 * s : 0;
  const figH = h - 26 * s - labelH;
  // Os quadris ficam um pouco abaixo do meio, para caber braço para cima e pernas.
  drawStickFigure(g, angles, cx, cy - h / 2 + 12 * s + figH * 0.5, figH, { color: opts.color ?? COR.rosa });
  if (opts.label) {
    text(g, opts.label, cx, cy + h / 2 - 20 * s, { size: 19 * s, color: COR.tinta, maxWidth: w - 14 * s });
  }
  g.restore();
}
