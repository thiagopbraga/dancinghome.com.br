// Ajudantes de desenho em Canvas 2D usados por todas as cenas.
import type { View } from '../engine';

export const FONT = "'Trebuchet MS', 'Arial Rounded MT Bold', 'Nunito', system-ui, sans-serif";

export const COR = {
  roxo: '#2a1052',
  roxoClaro: '#5b2bb5',
  rosa: '#ff5fa8',
  amarelo: '#ffd640',
  azul: '#38c6ff',
  verde: '#3ddc84',
  laranja: '#ff9a3d',
  branco: '#ffffff',
  tinta: '#24163d',
};

export function font(size: number, weight = 800): string {
  return `${weight} ${size}px ${FONT}`;
}

export function roundRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

export interface TextOpts {
  size?: number;
  color?: string;
  outline?: string;
  outlineWidth?: number;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  weight?: number;
  maxWidth?: number;
}

/** Texto com contorno; encolhe a fonte para caber em maxWidth. */
export function text(g: CanvasRenderingContext2D, str: string, x: number, y: number, o: TextOpts = {}): void {
  let size = o.size ?? 32;
  g.font = font(size, o.weight ?? 800);
  if (o.maxWidth) {
    const w = g.measureText(str).width;
    if (w > o.maxWidth) {
      size = Math.max(10, (size * o.maxWidth) / w);
      g.font = font(size, o.weight ?? 800);
    }
  }
  g.textAlign = o.align ?? 'center';
  g.textBaseline = o.baseline ?? 'middle';
  if (o.outline) {
    g.lineJoin = 'round';
    g.lineWidth = o.outlineWidth ?? Math.max(4, size / 6);
    g.strokeStyle = o.outline;
    g.strokeText(str, x, y);
  }
  g.fillStyle = o.color ?? COR.branco;
  g.fillText(str, x, y);
}

/** Quebra o texto em linhas que cabem em maxWidth (a fonte já deve estar definida em g). */
export function wrapLines(g: CanvasRenderingContext2D, str: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of str.split(' ')) {
    const tryLine = line ? `${line} ${word}` : word;
    if (line && g.measureText(tryLine).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = tryLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function textBlock(
  g: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  maxWidth: number,
  o: TextOpts = {},
): number {
  const size = o.size ?? 32;
  g.font = font(size, o.weight ?? 800);
  const lines = wrapLines(g, str, maxWidth);
  const lh = size * 1.2;
  lines.forEach((l, i) => text(g, l, x, y + i * lh, { ...o, maxWidth }));
  return lines.length * lh;
}

export function star(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, rot = 0): void {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + rad * Math.cos(a);
    const py = cy + rad * Math.sin(a);
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

export function drawStar(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  filled: boolean,
  rot = 0,
): void {
  star(g, cx, cy, r, rot);
  g.fillStyle = filled ? COR.amarelo : 'rgba(255,255,255,0.18)';
  g.fill();
  g.lineWidth = Math.max(2, r / 9);
  g.strokeStyle = filled ? '#e09a00' : 'rgba(255,255,255,0.45)';
  g.lineJoin = 'round';
  g.stroke();
}

export function heart(g: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 1.4, cy - s * 0.1, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
  g.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.4, cy - s * 0.1, cx, cy + s * 0.9);
  g.closePath();
}

export function padlock(g: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  g.lineWidth = s * 0.16;
  g.strokeStyle = COR.branco;
  g.beginPath();
  g.arc(cx, cy - s * 0.25, s * 0.3, Math.PI, 0);
  g.stroke();
  roundRect(g, cx - s * 0.45, cy - s * 0.25, s * 0.9, s * 0.7, s * 0.12);
  g.fillStyle = COR.amarelo;
  g.fill();
  g.fillStyle = COR.tinta;
  g.beginPath();
  g.arc(cx, cy + s * 0.08, s * 0.09, 0, Math.PI * 2);
  g.fill();
}

export function fillView(g: CanvasRenderingContext2D, v: View, style: string | CanvasGradient): void {
  g.fillStyle = style;
  g.fillRect(v.left, v.top, v.right - v.left, v.bottom - v.top);
}

export function verticalGradient(
  g: CanvasRenderingContext2D,
  v: View,
  top: string,
  bottom: string,
): CanvasGradient {
  const grad = g.createLinearGradient(0, v.top, 0, v.bottom);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  return grad;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Gerador pseudoaleatório com semente (mulberry32), para sorteios reproduzíveis nos testes. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
