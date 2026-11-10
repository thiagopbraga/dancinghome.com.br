// O "espelho": vídeo da câmera espelhado e o esqueleto desenhado por cima.
import { LM } from '../../core/skeleton';
import type { Landmark } from '../../core/types';
import { roundRect } from './util';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Mapper = (lx: number, ly: number) => { x: number; y: number };

/** Converte um ponto normalizado da câmera para a tela, espelhando e cobrindo todo o retângulo. */
export function mirrorMapper(rect: Rect, aspect: number): Mapper {
  const s = Math.max(rect.w / aspect, rect.h);
  const ox = rect.x + (rect.w - s * aspect) / 2;
  const oy = rect.y + (rect.h - s) / 2;
  return (lx, ly) => ({ x: ox + (1 - lx) * s * aspect, y: oy + ly * s });
}

export function drawMirror(
  g: CanvasRenderingContext2D,
  rect: Rect,
  video: HTMLVideoElement | null,
  aspect: number,
  radius = 28,
): void {
  g.save();
  roundRect(g, rect.x, rect.y, rect.w, rect.h, radius);
  g.clip();
  const grad = g.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  grad.addColorStop(0, '#1b1038');
  grad.addColorStop(1, '#3a2470');
  g.fillStyle = grad;
  g.fillRect(rect.x, rect.y, rect.w, rect.h);
  if (video && video.readyState >= 2 && video.videoWidth > 0) {
    const s = Math.max(rect.w / aspect, rect.h);
    const w = s * aspect;
    const ox = rect.x + (rect.w - w) / 2;
    const oy = rect.y + (rect.h - s) / 2;
    g.translate(ox + w, oy);
    g.scale(-1, 1);
    g.drawImage(video, 0, 0, w, s);
  }
  g.restore();
}

const BONES: readonly [number, number][] = [
  [LM.lShoulder, LM.rShoulder],
  [LM.lShoulder, LM.lElbow],
  [LM.lElbow, LM.lWrist],
  [LM.rShoulder, LM.rElbow],
  [LM.rElbow, LM.rWrist],
  [LM.lShoulder, LM.lHip],
  [LM.rShoulder, LM.rHip],
  [LM.lHip, LM.rHip],
  [LM.lHip, LM.lKnee],
  [LM.lKnee, LM.lAnkle],
  [LM.rHip, LM.rKnee],
  [LM.rKnee, LM.rAnkle],
];

export function drawSkeleton(
  g: CanvasRenderingContext2D,
  lm: Landmark[],
  map: Mapper,
  color = '#ffd640',
  width = 9,
): void {
  if (lm.length < 29) return;
  g.save();
  g.lineCap = 'round';
  for (const outline of [true, false]) {
    g.strokeStyle = outline ? 'rgba(36,22,61,0.75)' : color;
    g.lineWidth = outline ? width + 5 : width;
    for (const [a, b] of BONES) {
      const pa = lm[a];
      const pb = lm[b];
      if (pa.visibility < 0.3 || pb.visibility < 0.3) continue;
      const sa = map(pa.x, pa.y);
      const sb = map(pb.x, pb.y);
      g.beginPath();
      g.moveTo(sa.x, sa.y);
      g.lineTo(sb.x, sb.y);
      g.stroke();
    }
  }
  const nose = lm[LM.nose];
  const ls = map(lm[LM.lShoulder].x, lm[LM.lShoulder].y);
  const rs = map(lm[LM.rShoulder].x, lm[LM.rShoulder].y);
  if (nose.visibility >= 0.3) {
    const n = map(nose.x, nose.y);
    g.beginPath();
    g.arc(n.x, n.y, Math.max(10, Math.abs(ls.x - rs.x) * 0.42), 0, Math.PI * 2);
    g.strokeStyle = color;
    g.lineWidth = width * 0.8;
    g.stroke();
  }
  g.fillStyle = '#ffffff';
  for (const i of [LM.lWrist, LM.rWrist, LM.lElbow, LM.rElbow, LM.lKnee, LM.rKnee, LM.lAnkle, LM.rAnkle]) {
    if (lm[i].visibility < 0.3) continue;
    const p = map(lm[i].x, lm[i].y);
    g.beginPath();
    g.arc(p.x, p.y, width * 0.75, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}
