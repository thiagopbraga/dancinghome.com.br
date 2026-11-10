// AudioClock: o relógio do jogo é sempre o AudioContext.currentTime, nunca o tempo do quadro.
import type { AudioClock } from './types';

/** O pedaço do AudioContext que o relógio usa (permite um contexto falso nos testes). */
export interface TimeSource {
  readonly currentTime: number;
  readonly outputLatency?: number;
  readonly baseLatency?: number;
}

export class SongClock implements AudioClock {
  rate = 1;
  running = false;
  private anchorCtx = 0;
  private anchorPos = 0;
  /** Com pré-rolagem, o tempo pode ficar negativo antes de o som começar (contagem). */
  private preroll = false;

  constructor(
    private readonly time: TimeSource,
    public bpm: number,
    public offsetMs: number,
  ) {}

  private latency(): number {
    const l = this.time.outputLatency ?? this.time.baseLatency ?? 0;
    return Number.isFinite(l) && l > 0 ? Math.min(l, 0.5) : 0;
  }

  /** O som começa na posição `position` (s) do arquivo, no instante `at` do contexto. */
  start(position = 0, rate = 1, at = this.time.currentTime): void {
    this.anchorCtx = at;
    this.anchorPos = position;
    this.rate = rate;
    this.running = true;
    this.preroll = true;
  }

  /** Posição do arquivo que está sendo ouvida agora, em segundos. */
  position(): number {
    if (!this.running) return this.anchorPos;
    let elapsed = this.time.currentTime - this.latency() - this.anchorCtx;
    if (elapsed < 0 && !this.preroll) elapsed = 0;
    return this.anchorPos + elapsed * this.rate;
  }

  /** Congela o relógio no ponto que está sendo ouvido. Devolve a posição para retomar o som. */
  pause(): number {
    if (this.running) {
      this.anchorPos = this.position();
      this.running = false;
    }
    return this.anchorPos;
  }

  /** Retoma do ponto congelado, sem salto. */
  resume(at = this.time.currentTime): void {
    if (this.running) return;
    this.anchorCtx = at;
    this.running = true;
    this.preroll = false;
  }

  setRate(rate: number): void {
    if (this.running) {
      const now = this.time.currentTime;
      this.anchorPos = this.anchorPos + (now - this.anchorCtx) * this.rate;
      this.anchorCtx = now;
    }
    this.rate = rate;
  }

  now(): number {
    return this.position() - this.offsetMs / 1000;
  }

  beat(): number {
    return (this.now() * this.bpm) / 60;
  }

  timeOfBeat(b: number): number {
    return (b * 60) / this.bpm;
  }

  /** Posição no arquivo (s) em que cai a batida b. */
  positionOfBeat(b: number): number {
    return this.timeOfBeat(b) + this.offsetMs / 1000;
  }
}
