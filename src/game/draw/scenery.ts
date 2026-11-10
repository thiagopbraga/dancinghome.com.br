// Cenários desenhados em código. Cobrem toda a área visível, inclusive as laterais de telas 20:9.
import type { View } from '../engine';
import { fillView, verticalGradient } from './util';

function sala(g: CanvasRenderingContext2D, v: View, beat: number): void {
  fillView(g, v, verticalGradient(g, v, '#3a1f7a', '#7a3fb8'));
  const w = v.right - v.left;
  // espelho da sala de ensaio: faixas de luz
  g.save();
  g.globalAlpha = 0.1;
  g.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i++) {
    const x = v.left + (i + 0.2) * (w / 8);
    g.beginPath();
    g.moveTo(x, v.top);
    g.lineTo(x + 70, v.top);
    g.lineTo(x - 40, 520);
    g.lineTo(x - 110, 520);
    g.closePath();
    g.fill();
  }
  g.restore();
  // chão de madeira
  const floor = g.createLinearGradient(0, 520, 0, v.bottom);
  floor.addColorStop(0, '#c98a4b');
  floor.addColorStop(1, '#8a5a2b');
  g.fillStyle = floor;
  g.fillRect(v.left, 520, w, v.bottom - 520);
  g.strokeStyle = 'rgba(0,0,0,0.12)';
  g.lineWidth = 2;
  for (let x = Math.floor(v.left / 90) * 90; x < v.right; x += 90) {
    g.beginPath();
    g.moveTo(x, 520);
    g.lineTo(x - 30, v.bottom);
    g.stroke();
  }
  // barra de balé
  g.strokeStyle = '#f2d9b0';
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(v.left, 430);
  g.lineTo(v.right, 430);
  g.stroke();
  // luzinhas que piscam no ritmo
  const pulse = Math.max(0, 1 - (beat - Math.floor(beat)) * 2.5);
  for (let i = 0; i < 14; i++) {
    const x = v.left + (i + 0.5) * (w / 14);
    g.beginPath();
    g.arc(
      x,
      v.top + 26 + 8 * Math.sin(i),
      9 + (i % 2 === Math.floor(beat) % 2 ? pulse * 6 : 0),
      0,
      Math.PI * 2,
    );
    g.fillStyle = ['#ffd640', '#ff5fa8', '#38c6ff'][i % 3];
    g.fill();
  }
}

export type ScenarioPainter = (g: CanvasRenderingContext2D, v: View, beat: number) => void;

export const SCENARIOS: Record<string, ScenarioPainter> = { sala };

export function drawScenario(g: CanvasRenderingContext2D, v: View, id: string, beat: number): void {
  (SCENARIOS[id] ?? sala)(g, v, beat);
}
