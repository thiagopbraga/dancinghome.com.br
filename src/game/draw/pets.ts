// Bichinhos desenhados em código: o cachorro e o gato do grupo e os amigos resgatados na turnê.

export type PetKind = 'cachorro' | 'gato' | 'coelho' | 'passaro' | 'tartaruga' | 'hamster' | 'porquinho';

const CORPO: Record<PetKind, string> = {
  cachorro: '#c98a4b',
  gato: '#9aa3b5',
  coelho: '#f4f1ec',
  passaro: '#38c6ff',
  tartaruga: '#5fbf6b',
  hamster: '#f0b56a',
  porquinho: '#ffa9c4',
};

/**
 * Desenha um bichinho sentado, com os pés em (x, y). `s` é a altura aproximada;
 * `bob` (0 a 1) é o balanço no ritmo e `jump` (0 a 1) é o pulo do "Perfeito!".
 */
export function drawPet(
  g: CanvasRenderingContext2D,
  kind: PetKind,
  x: number,
  y: number,
  s: number,
  bob = 0,
  jump = 0,
): void {
  const up = Math.sin(Math.min(1, Math.max(0, jump)) * Math.PI) * s * 0.55;
  const squash = 1 - bob * 0.07;
  g.save();
  // sombra no chão
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath();
  g.ellipse(x, y, s * 0.36 * (1 - up / (s * 1.4)), s * 0.07, 0, 0, Math.PI * 2);
  g.fill();
  g.translate(x, y - up);
  g.scale(1 / squash, squash);
  const cor = CORPO[kind];
  const line = 'rgba(36,22,61,0.9)';
  g.lineWidth = Math.max(2, s * 0.045);
  g.strokeStyle = line;
  g.lineJoin = 'round';
  const oval = (cx: number, cy: number, rx: number, ry: number, fill: string): void => {
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fillStyle = fill;
    g.fill();
    g.stroke();
  };
  const tri = (
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    fill: string,
  ): void => {
    g.beginPath();
    g.moveTo(ax, ay);
    g.lineTo(bx, by);
    g.lineTo(cx, cy);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.stroke();
  };
  const hy = -s * 0.62;
  const hr = s * 0.26;
  // rabo, corpo e orelhas mudam por bicho; o rosto é o mesmo
  if (kind === 'cachorro') {
    oval(s * 0.3, -s * 0.3 - bob * s * 0.06, s * 0.07, s * 0.16, cor);
    oval(0, -s * 0.24, s * 0.26, s * 0.25, cor);
    oval(-hr * 0.95, hy + hr * 0.2, hr * 0.32, hr * 0.7, '#8a5a2b');
    oval(hr * 0.95, hy + hr * 0.2, hr * 0.32, hr * 0.7, '#8a5a2b');
  } else if (kind === 'gato') {
    oval(s * 0.3, -s * 0.34, s * 0.05, s * 0.24, cor);
    oval(0, -s * 0.24, s * 0.24, s * 0.25, cor);
    tri(-hr * 0.9, hy - hr * 0.3, -hr * 0.55, hy - hr * 1.35, -hr * 0.1, hy - hr * 0.8, cor);
    tri(hr * 0.9, hy - hr * 0.3, hr * 0.55, hy - hr * 1.35, hr * 0.1, hy - hr * 0.8, cor);
  } else if (kind === 'coelho') {
    oval(0, -s * 0.24, s * 0.24, s * 0.25, cor);
    oval(-hr * 0.45, hy - hr * 1.4, hr * 0.24, hr * 0.8, cor);
    oval(hr * 0.45, hy - hr * 1.4, hr * 0.24, hr * 0.8, cor);
  } else if (kind === 'passaro') {
    oval(0, -s * 0.26, s * 0.24, s * 0.24, cor);
    tri(-s * 0.2, -s * 0.3, -s * 0.42, -s * 0.2 - bob * s * 0.1, -s * 0.18, -s * 0.12, '#1f8fd0');
    tri(s * 0.2, -s * 0.3, s * 0.42, -s * 0.2 - bob * s * 0.1, s * 0.18, -s * 0.12, '#1f8fd0');
  } else if (kind === 'tartaruga') {
    oval(0, -s * 0.2, s * 0.34, s * 0.2, '#2f8f4a');
    oval(-s * 0.22, -s * 0.04, s * 0.08, s * 0.05, cor);
    oval(s * 0.22, -s * 0.04, s * 0.08, s * 0.05, cor);
  } else if (kind === 'hamster') {
    oval(0, -s * 0.22, s * 0.28, s * 0.23, cor);
    oval(-hr * 0.75, hy - hr * 0.8, hr * 0.28, hr * 0.28, '#e89a4a');
    oval(hr * 0.75, hy - hr * 0.8, hr * 0.28, hr * 0.28, '#e89a4a');
  } else {
    oval(0, -s * 0.24, s * 0.28, s * 0.25, cor);
    tri(-hr * 0.9, hy - hr * 0.4, -hr * 0.7, hy - hr * 1.15, -hr * 0.2, hy - hr * 0.85, cor);
    tri(hr * 0.9, hy - hr * 0.4, hr * 0.7, hy - hr * 1.15, hr * 0.2, hy - hr * 0.85, cor);
  }
  // cabeça
  oval(0, hy, hr, hr * 0.92, cor);
  // olhos
  g.fillStyle = '#24163d';
  for (const dx of [-0.38, 0.38]) {
    g.beginPath();
    g.arc(dx * hr, hy - hr * 0.1, hr * 0.11, 0, Math.PI * 2);
    g.fill();
  }
  // focinho
  if (kind === 'passaro') {
    tri(-hr * 0.2, hy + hr * 0.15, hr * 0.2, hy + hr * 0.15, 0, hy + hr * 0.55, '#ffd640');
  } else if (kind === 'porquinho') {
    oval(0, hy + hr * 0.3, hr * 0.3, hr * 0.2, '#ff7fa8');
  } else {
    g.beginPath();
    g.arc(0, hy + hr * 0.22, hr * 0.1, 0, Math.PI * 2);
    g.fillStyle = kind === 'gato' || kind === 'coelho' ? '#ff7fa8' : '#24163d';
    g.fill();
    g.beginPath();
    g.arc(0, hy + hr * 0.32, hr * 0.22, 0.15 * Math.PI, 0.85 * Math.PI);
    g.stroke();
  }
  g.restore();
}
