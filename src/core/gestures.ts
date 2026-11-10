// Gestos: cursor da mão para o menu (mão sobre o botão por 1 s) e duas mãos para o alto por 1 s.
import { LM } from './skeleton';
import type { Landmark } from './types';

/** Área de jogo em coordenadas virtuais. */
const W = 1280;
const H = 720;

/**
 * O cursor é relativo ao corpo, então funciona a qualquer distância da câmera:
 * a largura da tela vale RANGE_X alturas de tronco para cada lado do meio dos ombros.
 */
export const CURSOR = { rangeX: 1.5, rangeY: 1.0, centerY: -0.2 };

export interface Cursor {
  x: number;
  y: number;
  hand: 'l' | 'r';
}

interface Body {
  cx: number;
  cy: number;
  torso: number;
}

function body(lm: Landmark[], aspect: number): Body | null {
  const ls = lm[LM.lShoulder];
  const rs = lm[LM.rShoulder];
  const lh = lm[LM.lHip];
  const rh = lm[LM.rHip];
  if (!ls || !rs || !lh || !rh) return null;
  if (Math.min(ls.visibility, rs.visibility) < 0.5) return null;
  const cx = (ls.x + rs.x) / 2;
  const cy = (ls.y + rs.y) / 2;
  const hx = (lh.x + rh.x) / 2;
  const hy = (lh.y + rh.y) / 2;
  const hipsOk = Math.min(lh.visibility, rh.visibility) >= 0.3;
  // Sem os quadris à vista, estima o tronco pela largura dos ombros.
  const torso = hipsOk ? Math.hypot((cx - hx) * aspect, cy - hy) : Math.abs(ls.x - rs.x) * aspect * 1.4;
  if (torso < 0.03) return null;
  return { cx, cy, torso };
}

/** Posição na tela (espelhada, como ela se vê) de cada mão visível. */
export function handCursors(lm: Landmark[], aspect: number): Cursor[] {
  const b = body(lm, aspect);
  if (!b) return [];
  const out: Cursor[] = [];
  for (const hand of ['l', 'r'] as const) {
    const tip = lm[hand === 'l' ? LM.lIndex : LM.rIndex];
    const wrist = lm[hand === 'l' ? LM.lWrist : LM.rWrist];
    const p = tip && tip.visibility >= 0.5 ? tip : wrist;
    if (!p || p.visibility < 0.5) continue;
    const nx = ((p.x - b.cx) * aspect) / b.torso / CURSOR.rangeX;
    const ny = ((p.y - b.cy) / b.torso - CURSOR.centerY) / CURSOR.rangeY;
    out.push({ x: W / 2 - (nx * W) / 2, y: H / 2 + (ny * H) / 2, hand });
  }
  return out;
}

/** Inverso de handCursors: onde a mão precisa estar no quadro para o cursor cair em (x, y). */
export function landmarkForCursor(
  x: number,
  y: number,
  lm: Landmark[],
  aspect: number,
): { x: number; y: number } | null {
  const b = body(lm, aspect);
  if (!b) return null;
  const nx = (W / 2 - x) / (W / 2);
  const ny = (y - H / 2) / (H / 2);
  return {
    x: b.cx + (nx * CURSOR.rangeX * b.torso) / aspect,
    y: b.cy + (ny * CURSOR.rangeY + CURSOR.centerY) * b.torso,
  };
}

/** As duas mãos acima do nariz. */
export function bothHandsUp(lm: Landmark[]): boolean {
  const nose = lm[LM.nose];
  const l = lm[LM.lWrist];
  const r = lm[LM.rWrist];
  if (!nose || !l || !r) return false;
  if (l.visibility < 0.5 || r.visibility < 0.5) return false;
  return l.y < nose.y && r.y < nose.y;
}

/** Dispara quando uma condição fica verdadeira por `seconds` seguidos. */
export class HoldDetector {
  progress = 0;
  private armed = true;

  constructor(private readonly seconds = 1) {}

  /** Devolve true no quadro em que completa. Só rearma depois que a condição cai. */
  update(active: boolean, dt: number): boolean {
    if (!active) {
      this.progress = 0;
      this.armed = true;
      return false;
    }
    if (!this.armed) return false;
    this.progress = Math.min(1, this.progress + dt / this.seconds);
    if (this.progress >= 1) {
      this.armed = false;
      this.progress = 0;
      return true;
    }
    return false;
  }

  reset(): void {
    this.progress = 0;
    this.armed = true;
  }
}
