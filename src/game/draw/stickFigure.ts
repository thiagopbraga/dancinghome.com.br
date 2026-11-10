// Boneco desenhado a partir dos ângulos da pose. É o desenho de todos os cartões, sem arquivos de imagem.
// Sai espelhado, como ela se vê: o braço direito dela aparece do lado direito do desenho.
import { buildSkeleton, type Pt, type Skeleton } from '../../core/skeleton';
import type { Angles } from '../../core/types';

export interface FigureStyle {
  color?: string;
  skin?: string;
  outline?: string;
  /** false desenha como a câmera vê (sem espelhar). */
  mirror?: boolean;
  lineScale?: number;
}

/** Altura total do boneco em unidades de tronco (cabeça aos pés). */
export const FIGURE_UNITS = 3.25;

/** Desenha o boneco com os quadris em (cx, cy); `size` é a altura total em pixels virtuais. */
export function drawStickFigure(
  g: CanvasRenderingContext2D,
  angles: Angles,
  cx: number,
  cy: number,
  size: number,
  style: FigureStyle = {},
): void {
  const sk: Skeleton = buildSkeleton(angles);
  const u = size / FIGURE_UNITS;
  const flip = style.mirror === false ? 1 : -1;
  const P = (p: Pt): Pt => ({ x: cx + flip * p.x * u, y: cy + p.y * u });
  const color = style.color ?? '#ff5fa8';
  const skin = style.skin ?? '#ffe0c2';
  const lw = Math.max(3, u * 0.2 * (style.lineScale ?? 1));

  const limb = (a: Pt, b: Pt, c: Pt, stroke: string, width: number): void => {
    g.beginPath();
    g.moveTo(P(a).x, P(a).y);
    g.lineTo(P(b).x, P(b).y);
    g.lineTo(P(c).x, P(c).y);
    g.strokeStyle = stroke;
    g.lineWidth = width;
    g.stroke();
  };

  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const pass = (outline: boolean): void => {
    const extra = outline ? lw * 0.5 : 0;
    const c = (fill: string): string => (outline ? (style.outline ?? 'rgba(36,22,61,0.9)') : fill);
    // pernas
    limb(sk.lHip, sk.lKnee, sk.lAnkle, c('#5b2bb5'), lw + extra);
    limb(sk.rHip, sk.rKnee, sk.rAnkle, c('#5b2bb5'), lw + extra);
    // tronco
    g.beginPath();
    const pts = [sk.lShoulder, sk.rShoulder, sk.rHip, sk.lHip].map(P);
    g.moveTo(pts[0].x, pts[0].y);
    for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
    g.closePath();
    g.fillStyle = c(color);
    g.strokeStyle = c(color);
    g.lineWidth = lw + extra;
    g.fill();
    g.stroke();
    // braços
    limb(sk.lShoulder, sk.lElbow, sk.lWrist, c(skin), lw * 0.85 + extra);
    limb(sk.rShoulder, sk.rElbow, sk.rWrist, c(skin), lw * 0.85 + extra);
    // mãos e pés
    for (const p of [sk.lWrist, sk.rWrist]) {
      g.beginPath();
      g.arc(P(p).x, P(p).y, lw * 0.62 + extra / 2, 0, Math.PI * 2);
      g.fillStyle = c(skin);
      g.fill();
    }
    for (const p of [sk.lAnkle, sk.rAnkle]) {
      g.beginPath();
      g.arc(P(p).x, P(p).y, lw * 0.6 + extra / 2, 0, Math.PI * 2);
      g.fillStyle = c('#ffd640');
      g.fill();
    }
    // cabeça
    const head = P({ x: sk.nose.x, y: sk.nose.y - 0.08 });
    g.beginPath();
    g.arc(head.x, head.y, u * 0.34 + extra / 2, 0, Math.PI * 2);
    g.fillStyle = c(skin);
    g.fill();
  };
  pass(true);
  pass(false);
  // rosto
  const head = P({ x: sk.nose.x, y: sk.nose.y - 0.08 });
  g.fillStyle = '#24163d';
  for (const dx of [-0.12, 0.12]) {
    g.beginPath();
    g.arc(head.x + dx * u, head.y - u * 0.03, u * 0.04, 0, Math.PI * 2);
    g.fill();
  }
  g.beginPath();
  g.arc(head.x, head.y + u * 0.06, u * 0.12, 0.15 * Math.PI, 0.85 * Math.PI);
  g.strokeStyle = '#24163d';
  g.lineWidth = Math.max(1.5, u * 0.035);
  g.stroke();
  g.restore();
}
