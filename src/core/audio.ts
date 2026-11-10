// Web Audio: carregar, tocar, pausar, retomar, playbackRate e fade. O relógio do jogo vem daqui.
import { SongClock, type MusicPlayer } from './clock';

export class AudioEngine implements MusicPlayer {
  ctx: AudioContext | null = null;
  clock: SongClock | null = null;
  buffer: AudioBuffer | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private volume = 0.9;
  private fading = false;

  /** Cria o AudioContext. Precisa ser chamado dentro de um toque (botão "Começar"). */
  ensure(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.8;
      this.sfxGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  get ready(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** Saída para efeitos sonoros. */
  get sfxOut(): GainNode | null {
    return this.sfxGain;
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.02);
  }

  async decode(data: ArrayBuffer): Promise<AudioBuffer> {
    return this.ensure().decodeAudioData(data.slice(0));
  }

  fromSamples(samples: Float32Array, sampleRate: number): AudioBuffer {
    const ctx = this.ensure();
    const buf = ctx.createBuffer(1, samples.length, sampleRate);
    buf.getChannelData(0).set(samples);
    return buf;
  }

  /** Prepara uma música e devolve o relógio dela. */
  load(buffer: AudioBuffer, bpm: number, offsetMs: number): SongClock {
    this.stop();
    const ctx = this.ensure();
    this.buffer = buffer;
    this.clock = new SongClock(ctx, bpm, offsetMs);
    return this.clock;
  }

  private startSource(position: number, rate: number, at: number): void {
    if (!this.ctx || !this.buffer || !this.music) return;
    this.killSource();
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = rate;
    src.connect(this.music);
    const pos = Math.max(0, Math.min(position, this.buffer.duration));
    const delay = position < 0 ? -position / rate : 0;
    src.start(at + delay, pos);
    this.source = src;
  }

  private killSource(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        // a fonte ainda não tinha começado
      }
      this.source.disconnect();
      this.source = null;
    }
  }

  /** Toca a partir de `position` segundos do arquivo, com uma pequena espera para agendar. */
  play(position = 0, rate = 1, lead = 0.08): void {
    if (!this.ctx || !this.clock || !this.music) return;
    this.fading = false;
    this.music.gain.cancelScheduledValues(this.ctx.currentTime);
    this.music.gain.setValueAtTime(1, this.ctx.currentTime);
    const at = this.ctx.currentTime + lead;
    this.startSource(position, rate, at);
    this.clock.start(position, rate, at);
  }

  pause(): void {
    if (!this.clock || !this.clock.running) return;
    this.clock.pause();
    this.killSource();
  }

  resume(): void {
    if (!this.ctx || !this.clock || this.clock.running) return;
    const at = this.ctx.currentTime + 0.03;
    this.startSource(this.clock.position(), this.clock.rate, at);
    this.clock.resume(at);
  }

  setRate(rate: number): void {
    if (!this.clock) return;
    this.clock.setRate(rate);
    if (this.source) this.source.playbackRate.value = rate;
  }

  /** Abaixa o volume da música até zero em `seconds`. */
  fadeOut(seconds: number): void {
    if (!this.ctx || !this.music || this.fading) return;
    this.fading = true;
    const t = this.ctx.currentTime;
    this.music.gain.cancelScheduledValues(t);
    this.music.gain.setValueAtTime(this.music.gain.value, t);
    this.music.gain.linearRampToValueAtTime(0, t + seconds);
  }

  stop(): void {
    this.killSource();
    if (this.clock) this.clock.pause();
    this.clock = null;
    this.fading = false;
  }

  /** Duração do arquivo carregado, em segundos. */
  get duration(): number {
    return this.buffer?.duration ?? 0;
  }
}
