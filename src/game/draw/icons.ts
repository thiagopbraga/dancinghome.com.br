// Ícones desenhados em código para os botões (ela não precisa ler para jogar).
import { COR, drawStar, roundRect } from './util';

export type Icon = (g: CanvasRenderingContext2D, cx: number, cy: number, s: number) => void;

export const iconPlay: Icon = (g, cx, cy, s) => {
  g.beginPath();
  g.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
  g.fillStyle = COR.branco;
  g.fill();
  g.beginPath();
  g.moveTo(cx - s * 0.15, cy - s * 0.25);
  g.lineTo(cx + s * 0.28, cy);
  g.lineTo(cx - s * 0.15, cy + s * 0.25);
  g.closePath();
  g.fillStyle = COR.rosa;
  g.fill();
};

export const iconNote: Icon = (g, cx, cy, s) => {
  g.fillStyle = COR.branco;
  g.strokeStyle = COR.branco;
  g.lineWidth = s * 0.09;
  g.lineCap = 'round';
  g.beginPath();
  g.ellipse(cx - s * 0.2, cy + s * 0.28, s * 0.17, s * 0.13, -0.4, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(cx + s * 0.28, cy + s * 0.18, s * 0.17, s * 0.13, -0.4, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.moveTo(cx - s * 0.06, cy + s * 0.26);
  g.lineTo(cx - s * 0.06, cy - s * 0.32);
  g.lineTo(cx + s * 0.42, cy - s * 0.42);
  g.lineTo(cx + s * 0.42, cy + s * 0.16);
  g.stroke();
};

/** Tartaruga: o modo treino, devagar. */
export const iconTurtle: Icon = (g, cx, cy, s) => {
  g.fillStyle = '#b7f5c9';
  g.beginPath();
  g.arc(cx + s * 0.42, cy + s * 0.02, s * 0.15, 0, Math.PI * 2);
  g.fill();
  for (const dx of [-0.25, 0.2]) {
    g.beginPath();
    g.arc(cx + dx * s, cy + s * 0.27, s * 0.1, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.arc(cx, cy + s * 0.1, s * 0.36, Math.PI, 0);
  g.closePath();
  g.fillStyle = COR.verde;
  g.fill();
  g.lineWidth = s * 0.05;
  g.strokeStyle = '#1c7a3d';
  g.stroke();
  g.fillStyle = COR.tinta;
  g.beginPath();
  g.arc(cx + s * 0.47, cy - s * 0.01, s * 0.03, 0, Math.PI * 2);
  g.fill();
};

/** Varinha com estrela: criar dança. */
export const iconWand: Icon = (g, cx, cy, s) => {
  g.strokeStyle = COR.branco;
  g.lineWidth = s * 0.1;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - s * 0.35, cy + s * 0.4);
  g.lineTo(cx + s * 0.1, cy - s * 0.05);
  g.stroke();
  drawStar(g, cx + s * 0.2, cy - s * 0.18, s * 0.3, true, 0.2);
};

/** Três cabeças: meu grupo. */
export const iconGroup: Icon = (g, cx, cy, s) => {
  const cores = [COR.azul, COR.amarelo, COR.verde];
  [-0.34, 0.34, 0].forEach((dx, i) => {
    const y = cy + (i === 2 ? 0.02 : -0.06) * s;
    const r = (i === 2 ? 0.2 : 0.16) * s;
    g.beginPath();
    g.arc(cx + dx * s, y + r * 2.1, r * 1.5, Math.PI, 0);
    g.fillStyle = cores[i];
    g.fill();
    g.beginPath();
    g.arc(cx + dx * s, y, r, 0, Math.PI * 2);
    g.fillStyle = '#ffe0c2';
    g.fill();
  });
};

export const iconMedal: Icon = (g, cx, cy, s) => {
  g.fillStyle = COR.azul;
  g.beginPath();
  g.moveTo(cx - s * 0.25, cy - s * 0.48);
  g.lineTo(cx + s * 0.25, cy - s * 0.48);
  g.lineTo(cx + s * 0.1, cy - s * 0.05);
  g.lineTo(cx - s * 0.1, cy - s * 0.05);
  g.closePath();
  g.fill();
  g.beginPath();
  g.arc(cx, cy + s * 0.14, s * 0.3, 0, Math.PI * 2);
  g.fillStyle = COR.amarelo;
  g.fill();
  g.lineWidth = s * 0.05;
  g.strokeStyle = '#e09a00';
  g.stroke();
  drawStar(g, cx, cy + s * 0.14, s * 0.16, true);
};

/** Ônibus da turnê. */
export const iconBus: Icon = (g, cx, cy, s) => {
  roundRect(g, cx - s * 0.48, cy - s * 0.28, s * 0.96, s * 0.5, s * 0.1);
  g.fillStyle = COR.amarelo;
  g.fill();
  g.fillStyle = '#bfeaff';
  for (let i = 0; i < 3; i++) {
    roundRect(g, cx - s * 0.4 + i * s * 0.28, cy - s * 0.2, s * 0.22, s * 0.2, s * 0.04);
    g.fill();
  }
  g.fillStyle = COR.tinta;
  for (const dx of [-0.26, 0.26]) {
    g.beginPath();
    g.arc(cx + dx * s, cy + s * 0.24, s * 0.11, 0, Math.PI * 2);
    g.fill();
  }
};

export const iconArrow =
  (dir: 1 | -1): Icon =>
  (g, cx, cy, s) => {
    g.beginPath();
    g.moveTo(cx - dir * s * 0.3, cy - s * 0.42);
    g.lineTo(cx + dir * s * 0.34, cy);
    g.lineTo(cx - dir * s * 0.3, cy + s * 0.42);
    g.closePath();
    g.fillStyle = COR.branco;
    g.fill();
  };

/** Duas pessoas: modo dupla. */
export const iconDuo: Icon = (g, cx, cy, s) => {
  [COR.rosa, COR.azul].forEach((cor, i) => {
    const x = cx + (i === 0 ? -0.22 : 0.22) * s;
    g.beginPath();
    g.arc(x, cy + s * 0.42, s * 0.24, Math.PI, 0);
    g.fillStyle = cor;
    g.fill();
    g.lineWidth = s * 0.04;
    g.strokeStyle = COR.branco;
    g.stroke();
    g.beginPath();
    g.arc(x, cy - s * 0.05, s * 0.17, 0, Math.PI * 2);
    g.fillStyle = '#ffe0c2';
    g.fill();
  });
};

/** Floco de neve: pose congelada. */
export const iconIce: Icon = (g, cx, cy, s) => {
  g.strokeStyle = '#dff6ff';
  g.lineWidth = s * 0.09;
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    g.beginPath();
    g.moveTo(cx - Math.cos(a) * s * 0.42, cy - Math.sin(a) * s * 0.42);
    g.lineTo(cx + Math.cos(a) * s * 0.42, cy + Math.sin(a) * s * 0.42);
    g.stroke();
  }
};

/** Presente: modo surpresa. */
export const iconGift: Icon = (g, cx, cy, s) => {
  roundRect(g, cx - s * 0.36, cy - s * 0.12, s * 0.72, s * 0.52, s * 0.06);
  g.fillStyle = COR.amarelo;
  g.fill();
  roundRect(g, cx - s * 0.42, cy - s * 0.26, s * 0.84, s * 0.18, s * 0.05);
  g.fillStyle = COR.laranja;
  g.fill();
  g.fillStyle = COR.rosa;
  g.fillRect(cx - s * 0.06, cy - s * 0.26, s * 0.12, s * 0.66);
  g.beginPath();
  g.arc(cx - s * 0.12, cy - s * 0.34, s * 0.11, 0, Math.PI * 2);
  g.arc(cx + s * 0.12, cy - s * 0.34, s * 0.11, 0, Math.PI * 2);
  g.fill();
};

/** Engrenagem simples: Área dos Pais. */
export const iconGear: Icon = (g, cx, cy, s) => {
  g.fillStyle = COR.branco;
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.beginPath();
    g.arc(cx + Math.cos(a) * s * 0.36, cy + Math.sin(a) * s * 0.36, s * 0.1, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.arc(cx, cy, s * 0.34, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(cx, cy, s * 0.14, 0, Math.PI * 2);
  g.fillStyle = COR.roxoClaro;
  g.fill();
};
