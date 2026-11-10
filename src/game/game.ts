// Estado global do jogo: motor, áudio, dados e opções de URL. As cenas recebem este objeto.
import { AudioEngine } from '../core/audio';
import { DEMO_BPM, renderDemoSong } from '../core/demoSong';
import { Sfx } from '../core/sfx';
import type { Catalog } from '../core/types';
import type { Choreo } from '../data/schema';
import { loadBaseData } from '../data/songs';
import type { Engine } from './engine';

export interface Flags {
  /** Troca a câmera pela pose simulada. Só no servidor de desenvolvimento. */
  sim: boolean;
  test: boolean;
  debug: boolean;
  cena: string | null;
  /** Força o caminho "sem voz pt-BR" da narração. */
  semVoz: boolean;
  /** Só em desenvolvimento: encerra a música nesta batida, para testes curtos. */
  fim: number | null;
  semente: number | null;
  pessoas: number;
}

export function readFlags(search: string, dev: boolean): Flags {
  const q = new URLSearchParams(search);
  const num = (k: string): number | null => {
    const v = q.get(k);
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    sim: dev && q.get('sim') === '1',
    test: dev && q.get('test') === '1',
    debug: q.get('debug') === '1',
    cena: q.get('cena'),
    semVoz: q.get('semvoz') === '1',
    fim: dev ? num('fim') : null,
    semente: num('semente'),
    pessoas: Math.max(1, Math.min(2, num('pessoas') ?? 1)),
  };
}

export class Game {
  readonly audio = new AudioEngine();
  readonly sfx = new Sfx(this.audio);
  readonly dataErrors: string[];
  /** Catálogo e músicas que vêm com o jogo (sem as edições guardadas no aparelho). */
  readonly baseCatalog: Catalog;
  readonly baseSongs: Choreo[];
  catalog: Catalog;
  songs: Choreo[];
  private demoBuffer: AudioBuffer | null = null;

  constructor(
    readonly engine: Engine,
    readonly flags: Flags,
  ) {
    const base = loadBaseData();
    this.dataErrors = base.errors;
    this.baseCatalog = base.catalog;
    this.baseSongs = base.songs;
    this.catalog = { ...base.catalog };
    this.songs = [...base.songs];
  }

  song(id: string): Choreo | undefined {
    return this.songs.find((s) => s.id === id);
  }

  /** Áudio da música de demonstração, sintetizado na primeira vez. */
  demoAudio(): AudioBuffer {
    if (!this.demoBuffer) {
      const ctx = this.audio.ensure();
      this.demoBuffer = this.audio.fromSamples(renderDemoSong(ctx.sampleRate), ctx.sampleRate);
    }
    return this.demoBuffer;
  }

  get demoBpm(): number {
    return DEMO_BPM;
  }
}
