// Botões gigantes que funcionam por gesto (mão sobre o botão por 1 s, com anel de progresso) e por toque.
import type { Cursor } from '../core/gestures';
import { COR, roundRect, text } from './draw/util';
import type { PointerKind } from './engine';

export interface Button {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  color?: string;
  /** Desenho opcional acima do texto. */
  icon?: (g: CanvasRenderingContext2D, cx: number, cy: number, size: number) => void;
  /** Só responde ao toque (para ações de adulto). */
  touchOnly?: boolean;
  /** Precisa segurar o toque por este tempo, em segundos. */
  holdSeconds?: number;
  disabled?: boolean;
  hidden?: boolean;
  selected?: boolean;
  fontSize?: number;
  onSelect: () => void;
}

export const DWELL_SECONDS = 1;

export class ButtonSet {
  hoverId: string | null = null;
  progress = 0;
  private armed = true;
  private grace = 0.5;
  private holdId: string | null = null;
  private holdTime = 0;

  constructor(
    public buttons: Button[],
    private readonly onFeedback?: (kind: 'select' | 'hover') => void,
    private readonly dwell = DWELL_SECONDS,
  ) {}

  find(id: string): Button | undefined {
    return this.buttons.find((b) => b.id === id);
  }

  private hit(x: number, y: number, gesture: boolean): Button | undefined {
    return this.buttons.find(
      (b) =>
        !b.hidden &&
        !b.disabled &&
        !(gesture && (b.touchOnly || b.holdSeconds)) &&
        x >= b.x &&
        x <= b.x + b.w &&
        y >= b.y &&
        y <= b.y + b.h,
    );
  }

  private select(b: Button): void {
    this.onFeedback?.('select');
    b.onSelect();
  }

  update(dt: number, cursors: Cursor[]): void {
    if (this.grace > 0) this.grace -= dt;
    if (this.holdId) {
      const b = this.find(this.holdId);
      this.holdTime += dt;
      if (b && this.holdTime >= (b.holdSeconds ?? 0)) {
        this.holdId = null;
        this.holdTime = 0;
        this.select(b);
      }
    }
    let over: Button | undefined;
    for (const c of cursors) {
      over = this.hit(c.x, c.y, true);
      if (over) break;
    }
    if (!over) {
      this.hoverId = null;
      this.progress = 0;
      this.armed = true;
      return;
    }
    if (this.grace > 0 || !this.armed) return;
    if (over.id !== this.hoverId) {
      this.hoverId = over.id;
      this.progress = 0;
      this.onFeedback?.('hover');
    }
    this.progress += dt / this.dwell;
    if (this.progress >= 1) {
      this.progress = 0;
      this.armed = false;
      this.hoverId = null;
      this.select(over);
    }
  }

  pointer(kind: PointerKind, x: number, y: number): boolean {
    if (kind === 'down') {
      const b = this.hit(x, y, false);
      if (!b) return false;
      if (b.holdSeconds) {
        this.holdId = b.id;
        this.holdTime = 0;
      } else {
        this.select(b);
      }
      return true;
    }
    if (kind === 'up') {
      this.holdId = null;
      this.holdTime = 0;
    }
    return false;
  }

  draw(g: CanvasRenderingContext2D): void {
    for (const b of this.buttons) {
      if (b.hidden) continue;
      const hover = b.id === this.hoverId;
      const holding = b.id === this.holdId;
      const grow = hover ? 6 : 0;
      const x = b.x - grow;
      const y = b.y - grow;
      const w = b.w + grow * 2;
      const h = b.h + grow * 2;
      const r = Math.min(34, h / 3);
      g.save();
      g.globalAlpha = b.disabled ? 0.45 : 1;
      roundRect(g, x, y + 6, w, h, r);
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fill();
      roundRect(g, x, y, w, h, r);
      g.fillStyle = b.color ?? COR.rosa;
      g.fill();
      g.lineWidth = b.selected || hover ? 8 : 4;
      g.strokeStyle = b.selected ? COR.amarelo : COR.branco;
      g.stroke();
      const size = b.fontSize ?? Math.min(48, h * 0.32);
      if (b.icon) {
        const iconSize = Math.min(w, h) * (b.label ? 0.42 : 0.6);
        b.icon(g, x + w / 2, y + h * (b.label ? 0.38 : 0.5), iconSize);
        if (b.label)
          text(g, b.label, x + w / 2, y + h * 0.8, {
            size: size * 0.82,
            maxWidth: w - 20,
            outline: 'rgba(36,22,61,0.55)',
          });
      } else {
        text(g, b.label, x + w / 2, y + h / 2, { size, maxWidth: w - 24, outline: 'rgba(36,22,61,0.55)' });
      }
      const p = hover ? this.progress : holding ? this.holdTime / (b.holdSeconds ?? 1) : 0;
      if (p > 0) {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rad = Math.min(w, h) / 2 - 6;
        g.beginPath();
        g.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, p));
        g.strokeStyle = COR.amarelo;
        g.lineWidth = 14;
        g.lineCap = 'round';
        g.stroke();
      }
      g.restore();
    }
  }
}

/** A mãozinha que mostra onde a mão dela está apontando. */
export function drawCursors(g: CanvasRenderingContext2D, cursors: Cursor[], time: number): void {
  for (const c of cursors) {
    if (c.y > 760 || c.y < -40 || c.x < -200 || c.x > 1480) continue;
    const pulse = 1 + 0.08 * Math.sin(time * 6);
    g.save();
    g.beginPath();
    g.arc(c.x, c.y, 30 * pulse, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,214,64,0.35)';
    g.fill();
    g.beginPath();
    g.arc(c.x, c.y, 17, 0, Math.PI * 2);
    g.fillStyle = COR.amarelo;
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = COR.branco;
    g.stroke();
    g.restore();
  }
}
