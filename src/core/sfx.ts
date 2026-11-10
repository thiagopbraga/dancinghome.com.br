// Efeitos sonoros sintetizados com osciladores. Nenhum arquivo de som no repositório.
import type { AudioEngine } from './audio';

export type SfxName =
  | 'perfeito'
  | 'muitoBem'
  | 'quase'
  | 'boa'
  | 'tick'
  | 'go'
  | 'select'
  | 'fanfarra'
  | 'estrela'
  | 'congela'
  | 'fala'
  | 'clique';

type Note = [freq: number, start: number, dur: number, type?: OscillatorType, gain?: number];

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

const SOUNDS: Record<SfxName, Note[]> = {
  perfeito: [
    [E5, 0, 0.1, 'triangle'],
    [G5, 0.08, 0.1, 'triangle'],
    [C6, 0.16, 0.25, 'triangle'],
  ],
  muitoBem: [
    [C5, 0, 0.1, 'triangle'],
    [G5, 0.09, 0.2, 'triangle'],
  ],
  quase: [[C5, 0, 0.16, 'sine']],
  boa: [[392, 0, 0.12, 'sine', 0.5]],
  tick: [[880, 0, 0.07, 'square', 0.35]],
  go: [
    [C5, 0, 0.12, 'square', 0.35],
    [C6, 0.1, 0.3, 'square', 0.35],
  ],
  select: [
    [G5, 0, 0.08, 'triangle'],
    [C6, 0.07, 0.16, 'triangle'],
  ],
  fanfarra: [
    [C5, 0, 0.14, 'triangle'],
    [E5, 0.14, 0.14, 'triangle'],
    [G5, 0.28, 0.14, 'triangle'],
    [C6, 0.42, 0.5, 'triangle'],
    [E5, 0.42, 0.5, 'sine', 0.5],
  ],
  estrela: [
    [C6, 0, 0.09, 'sine'],
    [1318.5, 0.07, 0.25, 'sine'],
  ],
  congela: [
    [1568, 0, 0.3, 'sine', 0.5],
    [1174.7, 0.05, 0.4, 'sine', 0.4],
  ],
  fala: [
    [660, 0, 0.09, 'sine', 0.5],
    [880, 0.1, 0.14, 'sine', 0.5],
  ],
  clique: [[1500, 0, 0.03, 'square', 0.3]],
};

export class Sfx {
  /** Quantas vezes cada som tocou (os testes conferem por aqui). */
  readonly counts: Partial<Record<SfxName, number>> = {};

  constructor(private readonly audio: AudioEngine) {}

  play(name: SfxName, when = 0): void {
    this.counts[name] = (this.counts[name] ?? 0) + 1;
    const ctx = this.audio.ctx;
    const out = this.audio.sfxOut;
    if (!ctx || !out || ctx.state !== 'running') return;
    const t0 = Math.max(ctx.currentTime, when);
    for (const [freq, start, dur, type, gain] of SOUNDS[name]) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type ?? 'sine';
      osc.frequency.value = freq;
      const peak = 0.3 * (gain ?? 1);
      g.gain.setValueAtTime(0.0001, t0 + start);
      g.gain.exponentialRampToValueAtTime(peak, t0 + start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
      osc.connect(g);
      g.connect(out);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.02);
    }
  }
}
