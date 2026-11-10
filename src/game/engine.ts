// Loop de quadros, troca de cenas e escala 16:9 com cenário estendido nas laterais.

export const BASE_W = 1280;
export const BASE_H = 720;

/** Área visível em coordenadas virtuais. A área de jogo é sempre 0..1280 x 0..720. */
export interface View {
  left: number;
  right: number;
  top: number;
  bottom: number;
  scale: number;
}

export type PointerKind = 'down' | 'move' | 'up';

export interface Scene {
  readonly name: string;
  /** Botões da cena, quando existem (os testes apontam para eles). */
  readonly ui?: unknown;
  enter?(): void;
  exit?(): void;
  update(dt: number): void;
  draw(g: CanvasRenderingContext2D, view: View): void;
  pointer?(kind: PointerKind, x: number, y: number): void;
  key?(code: string): void;
}

export function computeView(cssW: number, cssH: number): View {
  const scale = Math.min(cssW / BASE_W, cssH / BASE_H) || 1;
  const extraX = (cssW / scale - BASE_W) / 2;
  const extraY = (cssH / scale - BASE_H) / 2;
  return { left: 0 - extraX, right: BASE_W + extraX, top: 0 - extraY, bottom: BASE_H + extraY, scale };
}

export class Engine {
  readonly canvas: HTMLCanvasElement;
  readonly g: CanvasRenderingContext2D;
  view: View = computeView(BASE_W, BASE_H);
  scene: Scene | null = null;
  fps = 60;
  /** Chamado antes da cena, uma vez por quadro. */
  beforeUpdate: ((dt: number) => void) | null = null;
  /** Desenhado por cima da cena (legendas, depuração). */
  afterDraw: ((g: CanvasRenderingContext2D, view: View) => void) | null = null;
  onSceneChange: ((name: string) => void) | null = null;
  private last = 0;
  private running = false;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const g = canvas.getContext('2d');
    if (!g) throw new Error('Canvas 2D indisponível');
    this.g = g;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => this.resize());
    const handler = (kind: PointerKind) => (ev: PointerEvent) => {
      const p = this.toVirtual(ev.clientX, ev.clientY);
      this.scene?.pointer?.(kind, p.x, p.y);
    };
    canvas.addEventListener('pointerdown', handler('down'));
    canvas.addEventListener('pointermove', handler('move'));
    window.addEventListener('pointerup', handler('up'));
    window.addEventListener('pointercancel', handler('up'));
    window.addEventListener('keydown', (ev) => {
      const el = ev.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) return;
      this.scene?.key?.(ev.code);
    });
  }

  toVirtual(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.view.scale + this.view.left,
      y: (clientY - rect.top) / this.view.scale + this.view.top,
    };
  }

  resize(): void {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.view = computeView(cssW, cssH);
  }

  setScene(scene: Scene): void {
    this.scene?.exit?.();
    this.scene = scene;
    scene.enter?.();
    this.onSceneChange?.(scene.name);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number) => {
      if (!this.running) return;
      const dt = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
      this.last = now;
      if (dt > 0) this.fps = this.fps * 0.9 + (1 / dt) * 0.1;
      this.frame(dt);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private frame(dt: number): void {
    const g = this.g;
    const v = this.view;
    this.beforeUpdate?.(dt);
    this.scene?.update(dt);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const s = v.scale * this.dpr;
    g.setTransform(s, 0, 0, s, -v.left * s, -v.top * s);
    this.scene?.draw(g, v);
    this.afterDraw?.(g, v);
  }
}
