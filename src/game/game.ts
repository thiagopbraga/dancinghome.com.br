// Estado global do jogo: motor, áudio, dados e opções de URL. As cenas recebem este objeto.
import { AudioEngine } from '../core/audio';
import { DEFAULT_THRESHOLDS, type Thresholds } from '../core/judge';
import { Narrator } from '../core/narrator';
import { summarize, type Summary } from '../core/stars';
import { CameraError, type CameraProblem } from '../core/camera';
import { handCursors, type Cursor } from '../core/gestures';
import { MediaPipePoseSource } from '../core/poseSource';
import type { SimulatedPoseSource } from '../core/simPose';
import { PoseTracker } from '../core/tracker';
import { DEMO_BPM, renderDemoSong } from '../core/demoSong';
import { Sfx } from '../core/sfx';
import type { Angles, Catalog, PoseResult } from '../core/types';
import type { Choreo } from '../data/schema';
import { DEMO_ID, loadBaseData } from '../data/songs';
import type { Engine, Scene, View } from './engine';
import type { MatchSetup, Outcome, PlayConfig } from './match';
import { T } from './texts';
import type { Button } from './ui';

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

export type Route = (game: Game, params?: unknown) => Scene;
/** O que a tela de resultado mostra além das estrelas. */
export interface MatchReport {
  resumos: Summary[];
  recorde: boolean;
  /** Frases de novidade: medalhas, desbloqueios, dica de água. */
  novidades: string[];
}

export type PoseState = 'desligada' | 'carregando' | 'pronta' | 'erro';

export class Game {
  readonly audio = new AudioEngine();
  readonly tracker = new PoseTracker();
  readonly routes: Record<string, Route> = {};
  readonly video = document.getElementById('camera') as HTMLVideoElement;
  /** Pose simulada, quando o jogo abre com ?sim=1. */
  sim: SimulatedPoseSource | null = null;
  poseState: PoseState = 'desligada';
  cameraProblem: CameraProblem | null = null;
  readonly narrator: Narrator;
  /** Limites de nota (ajustáveis na Área dos Pais). */
  limites: Thresholds = { ...DEFAULT_THRESHOLDS };
  /** Cenário escolhido na tela de personagens. */
  cenario = 'sala';
  /** Partida em andamento, para os testes lerem os resultados ao vivo. */
  partida: { resultados: PoseResult[][]; cena: unknown } | null = null;
  estatuasFeitas = 0;
  /** A narração de boas-vindas já tocou nesta sessão? */
  welcomed = false;
  welcomedCaption = false;
  /** Nome do grupo de idols (tela de personagens). */
  groupName = '';
  /** Ganchos preenchidos por outras partes do jogo. */
  onMusic: ((playing: boolean) => void) | null = null;
  onPerfect: (() => void) | null = null;
  drawCompanions: ((g: CanvasRenderingContext2D, v: View, beat: number, pose: Angles | null) => void) | null =
    null;
  /** Chamado no toque em "Começar" (tela cheia, Wake Lock...). */
  onStart: (() => void) | null = null;
  /** Tempo de parede em segundos, para animações. */
  time = 0;
  private posePeople = 1;
  readonly sfx = new Sfx(this.audio);
  readonly dataErrors: string[];
  /** Catálogo e músicas que vêm com o jogo (sem as edições guardadas no aparelho). */
  readonly baseCatalog: Catalog;
  readonly baseSongs: Choreo[];
  catalog: Catalog;
  songs: Choreo[];
  /** Músicas com arquivo de áudio guardado no aparelho. */
  readonly audioIds = new Set<string>();
  /** Áudio que vive só na memória (modo surpresa). */
  readonly tempAudio = new Map<string, AudioBuffer>();
  /** Lê os bytes do áudio guardado (preenchido pelo armazenamento). */
  loadAudioData: (id: string) => Promise<ArrayBuffer | null> = async () => null;
  private readonly audioCache = new Map<string, AudioBuffer>();
  private demoBuffer: AudioBuffer | null = null;

  constructor(
    readonly engine: Engine,
    readonly flags: Flags,
  ) {
    this.narrator = new Narrator(flags.semVoz, () => this.sfx.play('fala'));
    const base = loadBaseData();
    this.dataErrors = base.errors;
    this.baseCatalog = base.catalog;
    this.baseSongs = base.songs;
    this.catalog = { ...base.catalog };
    this.songs = [...base.songs];
  }

  /** Troca de cena pelo nome registrado em scenes/index.ts. */
  go(name: string, params?: unknown): void {
    const route = this.routes[name];
    if (!route) throw new Error(`cena desconhecida: ${name}`);
    this.narrator.caption = null;
    this.engine.setScene(route(this, params));
  }

  /** Liga a câmera e o MediaPipe (ou a pose simulada). Nunca lança: o estado fica em poseState. */
  async startPose(numPoses = 1): Promise<void> {
    if (this.poseState === 'carregando') return;
    if (this.poseState === 'pronta' && numPoses === this.posePeople) return;
    this.poseState = 'carregando';
    this.cameraProblem = null;
    try {
      if (this.flags.sim) {
        if (!this.sim) {
          const { SimulatedPoseSource } = await import('../core/simPose');
          this.sim = new SimulatedPoseSource();
          await this.sim.start();
          this.tracker.setSource(this.sim);
        }
        this.sim.numPeople = numPoses;
      } else {
        const source = new MediaPipePoseSource({ model: this.poseModel(), numPoses });
        await source.start(this.video);
        this.tracker.setSource(source);
      }
      this.posePeople = numPoses;
      this.poseState = 'pronta';
    } catch (err) {
      this.cameraProblem = err instanceof CameraError ? err.problem : 'outro';
      this.poseState = 'erro';
      this.tracker.setSource(null);
      console.warn('Não foi possível ligar a câmera', err);
    }
  }

  /** Modelo do MediaPipe escolhido nas configurações. */
  poseModel(): 'lite' | 'full' {
    return 'lite';
  }

  /** Cursores das mãos da primeira pessoa, em coordenadas de tela. */
  cursors(): Cursor[] {
    const person = this.tracker.people[0];
    return person ? handCursors(person.lm, this.tracker.aspect) : [];
  }

  /** O vídeo da câmera, ou null na simulação. */
  get mirrorVideo(): HTMLVideoElement | null {
    return this.flags.sim ? null : this.video;
  }

  /** Total de estrelas (soma do melhor resultado de cada música e nível). */
  totalStars(): number {
    return 0;
  }

  /** Melhor número de estrelas de uma música, em qualquer nível. */
  bestStars(_songId: string): number {
    return 0;
  }

  /** Cartões extras da seleção de músicas (o modo surpresa entra aqui). */
  extraSongCards(): Button[] {
    return [];
  }

  /** A música tem áudio pronto para tocar? (a demonstração sempre tem) */
  hasAudio(choreo: Choreo): boolean {
    const id = choreo.audioDe ?? choreo.id;
    return id === DEMO_ID || this.audioIds.has(id) || this.tempAudio.has(id);
  }

  /** Áudio decodificado de uma música, ou null se ninguém carregou o arquivo ainda. */
  async audioFor(choreo: Choreo): Promise<AudioBuffer | null> {
    const id = choreo.audioDe ?? choreo.id;
    if (id === DEMO_ID) return this.demoAudio();
    const temp = this.tempAudio.get(id);
    if (temp) return temp;
    const cached = this.audioCache.get(id);
    if (cached) return cached;
    const data = await this.loadAudioData(id);
    if (!data) return null;
    try {
      const buffer = await this.audio.decode(data);
      this.audioCache.clear();
      this.audioCache.set(id, buffer);
      return buffer;
    } catch (err) {
      console.warn('Não consegui abrir o áudio', err);
      return null;
    }
  }

  /** Começa uma partida: carrega o áudio, liga a câmera e vai para a calibração. */
  async startMatch(cfg: PlayConfig): Promise<boolean> {
    const choreo = cfg.choreo ?? this.song(cfg.songId);
    if (!choreo) return false;
    const buffer = await this.audioFor(choreo);
    if (!buffer) {
      this.narrator.say(T.narrador.cadeado);
      return false;
    }
    void this.startPose(cfg.dupla ? 2 : 1);
    const setup: MatchSetup = { cfg, choreo, buffer };
    this.go('calibracao', setup);
    return true;
  }

  /** Fecha a partida: calcula estrelas e devolve o que a tela de resultado mostra. */
  async finishMatch(outcome: Outcome): Promise<MatchReport> {
    return { resumos: outcome.resultados.map(summarize), recorde: false, novidades: [] };
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
