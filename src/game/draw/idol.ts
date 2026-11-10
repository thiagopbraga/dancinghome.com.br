// As personagens do grupo dela: o boneco das poses com cabelo, cor de figurino e acessório.
// Tudo original e desenhado em código.
import { buildSkeleton } from '../../core/skeleton';
import type { Angles } from '../../core/types';
import type { Idol } from '../../data/schema';
import { star } from './util';
import { drawStickFigure, FIGURE_UNITS } from './stickFigure';

export const HAIR_STYLES = 4;

/** Desenha uma idol com os quadris em (cx, cy) e altura `size`. */
export function drawIdol(
  g: CanvasRenderingContext2D,
  idol: Idol,
  angles: Angles,
  cx: number,
  cy: number,
  size: number,
): void {
  drawStickFigure(g, angles, cx, cy, size, { color: idol.cor });
  const u = size / FIGURE_UNITS;
  const sk = buildSkeleton(angles);
  const hx = cx - sk.nose.x * u;
  const hy = cy + (sk.nose.y - 0.08) * u;
  const r = u * 0.34;
  g.save();
  g.fillStyle = idol.cabeloCor;
  g.strokeStyle = 'rgba(36,22,61,0.9)';
  g.lineWidth = Math.max(1.5, u * 0.04);
  g.lineJoin = 'round';
  // franja: uma calota em cima da cabeça, igual para todos os penteados
  g.beginPath();
  g.arc(hx, hy, r * 1.06, Math.PI * 1.02, Math.PI * 1.98);
  g.quadraticCurveTo(hx, hy - r * 0.45, hx - r * 1.05, hy - r * 0.06);
  g.closePath();
  g.fill();
  g.stroke();
  const blob = (x: number, y: number, rx: number, ry: number): void => {
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  };
  switch (idol.cabelo) {
    case 0: // duas marias-chiquinhas
      blob(hx - r * 1.25, hy - r * 0.1, r * 0.42, r * 0.6);
      blob(hx + r * 1.25, hy - r * 0.1, r * 0.42, r * 0.6);
      break;
    case 1: // rabo de cavalo alto
      blob(hx + r * 0.9, hy - r * 1.05, r * 0.5, r * 0.75);
      break;
    case 2: // coques
      blob(hx - r * 0.75, hy - r * 1.05, r * 0.38, r * 0.38);
      blob(hx + r * 0.75, hy - r * 1.05, r * 0.38, r * 0.38);
      break;
    default: // cabelo comprido dos lados
      blob(hx - r * 1.05, hy + r * 0.55, r * 0.3, r * 0.95);
      blob(hx + r * 1.05, hy + r * 0.55, r * 0.3, r * 0.95);
  }
  // acessório
  if (idol.acessorio === 'laco') {
    g.fillStyle = '#ff4d8d';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(hx, hy - r * 1.02);
      g.lineTo(hx + s * r * 0.6, hy - r * 1.4);
      g.lineTo(hx + s * r * 0.6, hy - r * 0.72);
      g.closePath();
      g.fill();
      g.stroke();
    }
  } else if (idol.acessorio === 'oculos') {
    g.fillStyle = '#ffd640';
    for (const s of [-1, 1]) {
      star(g, hx + s * r * 0.38, hy - r * 0.08, r * 0.32);
      g.fill();
      g.stroke();
    }
  } else if (idol.acessorio === 'coroa') {
    g.fillStyle = '#ffd640';
    g.beginPath();
    g.moveTo(hx - r * 0.6, hy - r * 0.95);
    g.lineTo(hx - r * 0.6, hy - r * 1.55);
    g.lineTo(hx - r * 0.3, hy - r * 1.25);
    g.lineTo(hx, hy - r * 1.65);
    g.lineTo(hx + r * 0.3, hy - r * 1.25);
    g.lineTo(hx + r * 0.6, hy - r * 1.55);
    g.lineTo(hx + r * 0.6, hy - r * 0.95);
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.restore();
}
