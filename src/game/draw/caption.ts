// Legenda grande da narração, para quando não há voz pt-BR no aparelho.
import { COR, font, roundRect, wrapLines } from './util';

/** `top`: desenha no alto da tela (no menu, onde os botões ocupam a parte de baixo). */
export function drawCaption(g: CanvasRenderingContext2D, caption: string | null, top = false): void {
  if (!caption) return;
  g.save();
  const size = 44;
  g.font = font(size);
  const lines = wrapLines(g, caption, 1000);
  const lh = size * 1.2;
  const w = Math.min(1080, Math.max(...lines.map((l) => g.measureText(l).width)) + 80);
  const h = lines.length * lh + 36;
  const y = top ? 14 : 700 - h;
  roundRect(g, 640 - w / 2, y, w, h, 30);
  g.fillStyle = 'rgba(255,250,240,0.96)';
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = COR.rosa;
  g.stroke();
  g.fillStyle = COR.tinta;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, 640, y + 18 + lh * (i + 0.5)));
  g.restore();
}
