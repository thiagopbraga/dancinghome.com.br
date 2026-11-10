// Partículas simples: estouro de estrelas na nota e confete no resultado.
import type { View } from '../engine';
import { star } from './util';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  rot: number;
  spin: number;
  shape: 'star' | 'rect' | 'dot';
  gravity: number;
}

const CONFETTI = ['#ff5fa8', '#ffd640', '#38c6ff', '#3ddc84', '#b06bff', '#ff9a3d'];

export class Particles {
  private list: Particle[] = [];

  get count(): number {
    return this.list.length;
  }

  burst(x: number, y: number, color: string, n = 18, power = 420): void {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = power * (0.4 + Math.random() * 0.6);
      this.list.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        life: 0,
        max: 0.6 + Math.random() * 0.5,
        size: 8 + Math.random() * 12,
        color: i % 3 === 0 ? '#ffffff' : color,
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 10,
        shape: i % 2 === 0 ? 'star' : 'dot',
        gravity: 600,
      });
    }
  }

  confetti(v: View, n = 12): void {
    if (this.list.length > 400) return;
    for (let i = 0; i < n; i++) {
      this.list.push({
        x: v.left + Math.random() * (v.right - v.left),
        y: v.top - 20,
        vx: (Math.random() - 0.5) * 120,
        vy: 140 + Math.random() * 220,
        life: 0,
        max: 3.5,
        size: 8 + Math.random() * 10,
        color: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
        rot: Math.random() * 6,
        spin: (Math.random() - 0.5) * 12,
        shape: 'rect',
        gravity: 60,
      });
    }
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.life += dt;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
    this.list = this.list.filter((p) => p.life < p.max);
  }

  draw(g: CanvasRenderingContext2D): void {
    g.save();
    for (const p of this.list) {
      const k = 1 - p.life / p.max;
      g.globalAlpha = Math.min(1, k * 2);
      g.fillStyle = p.color;
      if (p.shape === 'star') {
        star(g, p.x, p.y, p.size * (0.5 + k * 0.5), p.rot);
        g.fill();
      } else if (p.shape === 'dot') {
        g.beginPath();
        g.arc(p.x, p.y, p.size * 0.4 * k + 1, 0, Math.PI * 2);
        g.fill();
      } else {
        g.save();
        g.translate(p.x, p.y);
        g.rotate(p.rot);
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        g.restore();
      }
    }
    g.restore();
  }
}
