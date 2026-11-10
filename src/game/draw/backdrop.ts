// Fundo animado das telas de menu.
import type { View } from '../engine';
import { drawStar, fillView, verticalGradient } from './util';

export function drawBackdrop(
  g: CanvasRenderingContext2D,
  v: View,
  time: number,
  top = '#2a1052',
  bottom = '#b0369e',
): void {
  fillView(g, v, verticalGradient(g, v, top, bottom));
  const w = v.right - v.left;
  const h = v.bottom - v.top;
  g.save();
  for (let i = 0; i < 18; i++) {
    const px = v.left + ((i * 211.7 + 60) % w);
    const py = v.top + ((i * 137.3 + time * (8 + (i % 5) * 3)) % h);
    g.globalAlpha = 0.12 + 0.1 * Math.sin(time * 1.5 + i);
    drawStar(g, px, py, 10 + (i % 4) * 5, true, time * 0.3 + i);
  }
  g.restore();
}
