// Estado global do jogo: motor, áudio, dados e opções de URL. As cenas recebem este objeto.
import { AudioEngine } from '../core/audio';
import type { MusicClock } from '../core/clock';
import { renderClickTrack } from '../core/clickTrack';
import { YouTubeMusic } from '../core/youtube';
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
import {
  applyMatch,
  bestStars,
  newAchievements,
  totalStars,
  unlockedBetween,
  type Conquista,
} from '../data/progress';
import { levelRange } from '../data/choreo';
import type { Characters, Choreo, Progress, Settings, YoutubeRef } from '../data/schema';
import { DEMO_ID, loadBaseData } from '../data/songs';
import { defaultCharacters, defaultProgress, defaultSettings, Storage } from '../data/storage';
import type { Companions } from './companions';
import type { Engine, Scene, View } from './engine';
import type { MatchSetup, Outcome, PlayConfig } from './match';
import { ACESSORIOS, CENARIOS, T, TURNE } from './texts';

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

/** Cenas em que o vídeo do YouTube da partida continua aberto. */
const MATCH_SCENES = new Set(['calibracao', 'contagem', 'danca']);

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
  /** Música tocando de um vídeo do YouTube, quando a música não tem arquivo no aparelho. */
  readonly youtube = new YouTubeMusic();
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
  drawCompanions:
    | ((
        g: CanvasRenderingContext2D,
        v: View,
        beat: number,
        pose: Angles | null,
        where: 'danca' | 'menu',
      ) => void)
    | null = null;
  /** O grupo que dança junto (idols, pets e o desenho dela). */
  companions: Companions | null = null;
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
  /** Dados guardados no aparelho. Fica null se o navegador não deixar usar o IndexedDB. */
  store: Storage | null = null;
  settings: Settings = defaultSettings();
  progress: Progress = defaultProgress();
  characters: Characters = defaultCharacters();
  /** Músicas dançadas em seguida nesta sessão, para a dica de água. */
  seguidas = 0;
  /** Ferramentas extras do editor de seções (o detector de BPM entra aqui). */
  readonly editorTools: {
    id: string;
    nome: string;
    run: (buffer: AudioBuffer) => { bpm?: number; offsetMs?: number; mensagem: string };
  }[] = [];
  /** Chamado quando uma medalha nova é liberada. */
  onAchievements: ((novas: Conquista[]) => void) | null = null;
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

  /** Abre o armazenamento e carrega tudo que está guardado. Sem IndexedDB o jogo segue só na memória. */
  async init(): Promise<void> {
    try {
      this.store = await Storage.open();
      this.loadAudioData = async (id) => (await this.store?.audio(id))?.dados ?? null;
      await this.reload();
    } catch (err) {
      console.warn('Não consegui abrir os dados guardados', err);
      this.store = null;
    }
    this.applySettings();
  }

  /** Relê do armazenamento: configurações, progresso, personagens, poses, músicas e lista de áudios. */
  async reload(): Promise<void> {
    const st = this.store;
    if (!st) return;
    this.settings = await st.settings();
    this.progress = await st.progress();
    this.characters = await st.characters();
    this.catalog = { ...this.baseCatalog, ...(await st.poses()) };
    const saved = await st.choreos();
    const byId = new Map(saved.map((c) => [c.id, c]));
    this.songs = [
      ...this.baseSongs.map((c) => byId.get(c.id) ?? c),
      ...saved.filter((c) => !this.baseSongs.some((b) => b.id === c.id)),
    ];
    this.audioIds.clear();
    for (const id of await st.audioIds()) this.audioIds.add(id);
    this.audioCache.clear();
    this.applySettings();
  }

  applySettings(): void {
    this.limites = { ...this.settings.limites };
    this.narrator.enabled = this.settings.voz;
    this.audio.setVolume(this.settings.volume);
    this.youtube.setVolume(this.settings.volume);
    this.cenario = this.characters.cenario;
    this.groupName = this.characters.grupo;
  }

  async saveSettings(s: Settings): Promise<void> {
    this.settings = s;
    this.applySettings();
    await this.store?.saveSettings(s);
  }

  async saveProgress(p: Progress): Promise<void> {
    this.progress = p;
    await this.store?.saveProgress(p);
  }

  async saveCharacters(c: Characters): Promise<void> {
    this.characters = c;
    this.applySettings();
    await this.store?.saveCharacters(c);
  }

  /** Confere as medalhas, guarda as novas e devolve a lista delas. */
  async checkAchievements(): Promise<Conquista[]> {
    const novas = newAchievements(this.progress);
    if (novas.length > 0) {
      await this.saveProgress({
        ...this.progress,
        conquistas: [...this.progress.conquistas, ...novas.map((c) => c.id)],
      });
      this.onAchievements?.(novas);
    }
    return novas;
  }

  /** Troca de cena pelo nome registrado em scenes/index.ts. */
  go(name: string, params?: unknown): void {
    const route = this.routes[name];
    if (!route) throw new Error(`cena desconhecida: ${name}`);
    this.narrator.caption = null;
    // o vídeo só fica aberto do começo da partida até o fim da dança
    if (!MATCH_SCENES.has(name)) this.youtube.stop();
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
    return this.settings.modelo;
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
    return totalStars(this.progress);
  }

  /** Melhor número de estrelas de uma música, em qualquer nível. */
  bestStars(songId: string): number {
    return bestStars(this.progress, songId);
  }

  /** Um cenário abre pelo total de estrelas ou pelo show da turnê que o entrega. */
  cenarioLiberado(id: string): boolean {
    const c = CENARIOS.find((x) => x.id === id);
    if (!c) return false;
    if (this.totalStars() >= c.estrelas) return true;
    const show = TURNE.findIndex((p) => p.cenario === id);
    return show >= 0 && show < this.progress.historia;
  }

  /** A música tem como tocar? Arquivo no aparelho ou vídeo do YouTube (a demonstração sempre tem). */
  hasAudio(choreo: Choreo): boolean {
    return this.hasAudioFile(choreo) || !!this.youtubeOf(choreo);
  }

  /** A música tem arquivo de áudio no aparelho? (o gravador e o editor de partes precisam dele) */
  hasAudioFile(choreo: Choreo): boolean {
    const id = choreo.audioDe ?? choreo.id;
    return id === DEMO_ID || this.audioIds.has(id) || this.tempAudio.has(id);
  }

  /** Vídeo do YouTube da música (as danças gravadas usam o da música de origem). */
  youtubeOf(choreo: Choreo): YoutubeRef | null {
    if (choreo.youtube) return choreo.youtube;
    if (choreo.audioDe) return this.song(choreo.audioDe)?.youtube ?? null;
    return null;
  }

  /** Guarda (ou tira, com null) o vídeo do YouTube de uma música. */
  async saveYoutube(songId: string, ref: YoutubeRef | null): Promise<void> {
    const song = this.song(songId);
    if (!song) return;
    const next: Choreo = { ...song };
    if (ref) next.youtube = ref;
    else delete next.youtube;
    if (this.store) {
      await this.store.saveChoreo(next);
      await this.reload();
    } else {
      this.songs = this.songs.map((c) => (c.id === songId ? next : c));
    }
  }

  /** Relógio da música que está tocando agora (arquivo ou YouTube). */
  musicClock(): MusicClock | null {
    return this.youtube.clock ?? this.audio.clock;
  }

  /** Palminhas no ritmo da música, para dançar quando o vídeo não pode tocar. */
  clickTrack(choreo: Choreo): AudioBuffer {
    const ctx = this.audio.ensure();
    const rate = Math.min(ctx.sampleRate, 16000);
    return this.audio.fromSamples(renderClickTrack(choreo.bpm, Math.ceil(choreo.duracaoBeats)), rate);
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
    const yt = buffer ? null : this.youtubeOf(choreo);
    if (!buffer && !yt) {
      this.narrator.say(T.narrador.cadeado);
      return false;
    }
    void this.startPose(cfg.dupla ? 2 : 1);
    const setup: MatchSetup = { cfg, choreo, buffer };
    if (yt) {
      // o vídeo carrega enquanto ela se posiciona na calibração
      const inicio = levelRange(choreo, cfg.nivel).inicio;
      const start = (inicio * 60) / choreo.bpm + yt.offsetMs / 1000;
      setup.youtube = { id: yt.id, offsetMs: yt.offsetMs, pronto: this.youtube.prepare(yt.id, start) };
    }
    this.go('calibracao', setup);
    return true;
  }

  /** Fecha a partida: calcula estrelas e devolve o que a tela de resultado mostra. */
  async finishMatch(outcome: Outcome): Promise<MatchReport> {
    const { cfg, choreo } = outcome;
    const resumos = outcome.resultados.map(summarize);
    const novidades: string[] = [];
    // no modo dupla, vale a melhor das duas para o recorde da música
    let melhor = 0;
    resumos.forEach((r, i) => {
      if (r.score + (outcome.bonus[i] ?? 0) > resumos[melhor].score + (outcome.bonus[melhor] ?? 0))
        melhor = i;
    });
    const treino = cfg.modo === 'treino';
    const surpresa = choreo.origem === 'surpresa';
    const antes = this.totalStars();
    const { progress, recorde } = applyMatch(this.progress, {
      key: treino || surpresa ? null : `${choreo.id}:${cfg.nivel}`,
      summary: resumos[melhor],
      pontos: resumos[melhor].score + (outcome.bonus[melhor] ?? 0),
      treino,
      dupla: cfg.dupla,
      surpresa,
      estatuas: this.estatuasFeitas,
    });
    this.estatuasFeitas = 0;
    if (cfg.historia !== undefined && !treino && cfg.historia + 1 > progress.historia) {
      progress.historia = Math.min(5, cfg.historia + 1);
      const parada = TURNE[cfg.historia];
      if (parada) novidades.push(`${T.narrador.historiaPet} ${parada.petNome}!`);
      const cen = CENARIOS.find((c) => c.id === parada?.cenario);
      if (cen && antes < cen.estrelas) novidades.push(`${T.resultado.desbloqueou}: ${cen.nome}!`);
    }
    await this.saveProgress(progress);
    const depois = this.totalStars();
    for (const c of unlockedBetween(CENARIOS, antes, depois)) {
      novidades.push(`${T.resultado.desbloqueou}: ${c.nome}!`);
    }
    for (const a of unlockedBetween(ACESSORIOS, antes, depois)) {
      novidades.push(`${T.resultado.desbloqueou}: ${a.nome}!`);
    }
    for (const m of await this.checkAchievements())
      novidades.push(`${T.resultado.novaConquista}: ${m.nome}!`);
    if (!treino) {
      this.seguidas += 1;
      if (this.seguidas % 3 === 0) novidades.push(T.resultado.agua);
    }
    return { resumos, recorde, novidades };
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
