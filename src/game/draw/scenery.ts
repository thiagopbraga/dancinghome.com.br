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

/** Luzinhas no alto que piscam no ritmo (todas as cenas têm). */
function luzinhas(g: CanvasRenderingContext2D, v: View, beat: number, cores: string[]): void {
  const w = v.right - v.left;
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
    g.fillStyle = cores[i % cores.length];
    g.fill();
  }
}

/** Palco de show: cortinas, holofotes que balançam e plateia de luzinhas. */
function palco(g: CanvasRenderingContext2D, v: View, beat: number): void {
  fillView(g, v, verticalGradient(g, v, '#12082e', '#4a1470'));
  const w = v.right - v.left;
  // holofotes
  g.save();
  g.globalCompositeOperation = 'lighter';
  const cores = ['rgba(255,95,168,0.20)', 'rgba(56,198,255,0.20)', 'rgba(255,214,64,0.18)'];
  for (let i = 0; i < 5; i++) {
    const x0 = v.left + (i + 0.5) * (w / 5);
    const sway = Math.sin(beat * 0.5 + i * 1.3) * 140;
    g.beginPath();
    g.moveTo(x0 - 14, v.top);
    g.lineTo(x0 + 14, v.top);
    g.lineTo(x0 + sway + 130, 540);
    g.lineTo(x0 + sway - 130, 540);
    g.closePath();
    g.fillStyle = cores[i % 3];
    g.fill();
  }
  g.restore();
  // cortinas nas laterais
  for (const side of [-1, 1]) {
    const edge = side < 0 ? v.left : v.right;
    for (let k = 0; k < 4; k++) {
      const x = edge - side * k * 34;
      g.beginPath();
      g.moveTo(x, v.top);
      g.quadraticCurveTo(x - side * 30, 280, x - side * (10 + k * 4), 540);
      g.lineTo(edge, 540);
      g.lineTo(edge, v.top);
      g.closePath();
      g.fillStyle = k % 2 ? '#a3123f' : '#c2185b';
      g.fill();
    }
  }
  // chão do palco
  const floor = g.createLinearGradient(0, 520, 0, v.bottom);
  floor.addColorStop(0, '#6b3fa0');
  floor.addColorStop(1, '#2a1052');
  g.fillStyle = floor;
  g.fillRect(v.left, 520, w, v.bottom - 520);
  g.fillStyle = 'rgba(255,255,255,0.14)';
  g.fillRect(v.left, 520, w, 6);
  luzinhas(g, v, beat, ['#ffd640', '#ff5fa8', '#38c6ff']);
}

/** Parque de patins: céu, árvores, rampa e pista lisa. */
function patins(g: CanvasRenderingContext2D, v: View, beat: number): void {
  fillView(g, v, verticalGradient(g, v, '#6ec6ff', '#d8f3ff'));
  const w = v.right - v.left;
  // sol e nuvens que andam devagar
  g.fillStyle = '#ffe680';
  g.beginPath();
  g.arc(v.right - 150, 110, 60, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 4; i++) {
    const x = v.left + ((i * 380 + beat * 6) % (w + 300)) - 150;
    const y = 80 + (i % 2) * 70;
    for (const [dx, r] of [
      [0, 34],
      [38, 44],
      [82, 32],
    ] as const) {
      g.beginPath();
      g.arc(x + dx, y, r, 0, Math.PI * 2);
      g.fill();
    }
  }
  // árvores
  for (let x = Math.floor(v.left / 260) * 260 + 60; x < v.right; x += 260) {
    g.fillStyle = '#8a5a2b';
    g.fillRect(x - 9, 380, 18, 150);
    g.fillStyle = '#3fae5a';
    g.beginPath();
    g.arc(x, 350, 62, 0, Math.PI * 2);
    g.arc(x - 44, 386, 44, 0, Math.PI * 2);
    g.arc(x + 44, 386, 44, 0, Math.PI * 2);
    g.fill();
  }
  // rampa de skate ao fundo
  g.fillStyle = '#b9c2d6';
  g.beginPath();
  g.moveTo(v.left, 520);
  g.lineTo(v.left, 440);
  g.quadraticCurveTo(v.left + 150, 440, v.left + 230, 520);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(v.right, 520);
  g.lineTo(v.right, 440);
  g.quadraticCurveTo(v.right - 150, 440, v.right - 230, 520);
  g.closePath();
  g.fill();
  // pista
  const floor = g.createLinearGradient(0, 520, 0, v.bottom);
  floor.addColorStop(0, '#9aa7c2');
  floor.addColorStop(1, '#6f7b99');
  g.fillStyle = floor;
  g.fillRect(v.left, 520, w, v.bottom - 520);
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = 5;
  g.setLineDash([40, 30]);
  g.beginPath();
  g.moveTo(v.left, 540);
  g.lineTo(v.right, 540);
  g.stroke();
  g.setLineDash([]);
  luzinhas(g, v, beat, ['#ff5fa8', '#ffd640', '#ffffff']);
}

/** Ciclovia à beira-mar no fim de tarde: mar, coqueiros e a faixa vermelha. */
function ciclovia(g: CanvasRenderingContext2D, v: View, beat: number): void {
  fillView(g, v, verticalGradient(g, v, '#ff9a5a', '#ffd9a0'));
  const w = v.right - v.left;
  // sol baixando
  g.fillStyle = '#fff1b8';
  g.beginPath();
  g.arc(v.left + w * 0.72, 330, 80, 0, Math.PI * 2);
  g.fill();
  // mar com ondas que se mexem
  g.fillStyle = '#2f8fe0';
  g.fillRect(v.left, 380, w, 150);
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = 4;
  for (let row = 0; row < 3; row++) {
    g.beginPath();
    for (let x = v.left; x <= v.right; x += 20) {
      const y = 405 + row * 38 + Math.sin(x / 60 + beat * 0.8 + row) * 6;
      if (x === v.left) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // coqueiros
  for (let x = Math.floor(v.left / 340) * 340 + 110; x < v.right; x += 340) {
    g.strokeStyle = '#7a4a21';
    g.lineWidth = 16;
    g.beginPath();
    g.moveTo(x, 525);
    g.quadraticCurveTo(x + 26, 400, x + 8, 300);
    g.stroke();
    g.strokeStyle = '#2f9e4f';
    g.lineWidth = 12;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.sin(beat * 0.5 + x) * 0.05;
      g.beginPath();
      g.moveTo(x + 8, 300);
      g.quadraticCurveTo(
        x + 8 + Math.cos(a) * 60,
        270 + Math.sin(a) * 30,
        x + 8 + Math.cos(a) * 105,
        310 + Math.sin(a) * 50,
      );
      g.stroke();
    }
  }
  // calçada e faixa da ciclovia
  g.fillStyle = '#e8d9b8';
  g.fillRect(v.left, 520, w, 24);
  g.fillStyle = '#c94a3a';
  g.fillRect(v.left, 544, w, v.bottom - 544);
  g.strokeStyle = '#ffffff';
  g.lineWidth = 6;
  g.setLineDash([60, 50]);
  g.beginPath();
  g.moveTo(v.left - ((beat * 12) % 110), v.bottom - 18);
  g.lineTo(v.right, v.bottom - 18);
  g.stroke();
  g.setLineDash([]);
  luzinhas(g, v, beat, ['#ffd640', '#ffffff', '#38c6ff']);
}

export type ScenarioPainter = (g: CanvasRenderingContext2D, v: View, beat: number) => void;

export const SCENARIOS: Record<string, ScenarioPainter> = { sala, palco, patins, ciclovia };

export function drawScenario(g: CanvasRenderingContext2D, v: View, id: string, beat: number): void {
  (SCENARIOS[id] ?? sala)(g, v, beat);
}
