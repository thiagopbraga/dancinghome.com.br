// Coisas do aparelho: tela cheia, orientação, tela sempre acesa e economia de detecção em celular lento.

/** Na vertical o jogo mostra o aviso "Gire o celular". */
export function isPortrait(width: number, height: number): boolean {
  return height > width;
}

/** Tela cheia e trava em paisagem (Android). Em quem não deixa, segue sem. */
export async function enterFullscreen(el: HTMLElement = document.documentElement): Promise<void> {
  try {
    if (!document.fullscreenElement && el.requestFullscreen)
      await el.requestFullscreen({ navigationUI: 'hide' });
  } catch {
    // iPhone e alguns navegadores não têm tela cheia para páginas; o jogo funciona igual
  }
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.('landscape');
  } catch {
    // a trava só existe no Android em tela cheia; o aviso "Gire o celular" cobre o resto
  }
}

/** Mostra o aviso na vertical e avisa quem quiser pausar. Devolve a função que desliga. */
export function watchOrientation(aviso: HTMLElement, onPortrait: () => void): () => void {
  const check = (): void => {
    const portrait = isPortrait(window.innerWidth, window.innerHeight);
    if (portrait && aviso.hidden) onPortrait();
    aviso.hidden = !portrait;
  };
  check();
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  return () => {
    window.removeEventListener('resize', check);
    window.removeEventListener('orientationchange', check);
  };
}

interface Sentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', cb: () => void): void;
}

/** Mantém a tela acesa enquanto a música toca. O navegador solta a trava quando a aba some, então pedimos de novo na volta. */
export class ScreenAwake {
  wanted = false;
  private sentinel: Sentinel | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.wanted) void this.acquire();
      });
    }
  }

  get active(): boolean {
    return this.sentinel !== null;
  }

  set(on: boolean): void {
    this.wanted = on;
    if (on) void this.acquire();
    else void this.release();
  }

  private async acquire(): Promise<void> {
    if (this.sentinel) return;
    const wl = (navigator as Navigator & { wakeLock?: { request(type: 'screen'): Promise<Sentinel> } })
      .wakeLock;
    if (!wl) return;
    try {
      const s = await wl.request('screen');
      this.sentinel = s;
      s.addEventListener('release', () => {
        if (this.sentinel === s) this.sentinel = null;
      });
      if (!this.wanted) await this.release();
    } catch {
      // bateria fraca ou navegador sem suporte: a tela pode apagar, mas o jogo segue
    }
  }

  private async release(): Promise<void> {
    const s = this.sentinel;
    this.sentinel = null;
    try {
      await s?.release();
    } catch {
      // já tinha sido solta
    }
  }
}

export const SLOW_FPS = 20;
export const SLOW_SECONDS = 2;

/**
 * Vigia a taxa de quadros. Depois de 2 s seguidos abaixo de 20 fps, liga a detecção em quadros alternados
 * e deixa ligada até o fim da sessão (desligar faria o aparelho voltar a engasgar).
 */
export class FpsWatch {
  fps = 60;
  alternate = false;
  private slowFor = 0;

  update(dt: number): boolean {
    if (dt <= 0) return this.alternate;
    const inst = 1 / dt;
    this.fps += (inst - this.fps) * Math.min(1, dt * 4);
    if (this.fps < SLOW_FPS) this.slowFor += dt;
    else this.slowFor = 0;
    if (this.slowFor >= SLOW_SECONDS) this.alternate = true;
    return this.alternate;
  }
}
