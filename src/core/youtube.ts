// Música do YouTube tocando dentro do jogo, com o tempo do vídeo como relógio da dança.
// Usa a YouTube IFrame Player API: o vídeo é embutido num player pequeno no canto da tela.
// Nada é baixado nem extraído: o som sai do próprio player do YouTube.
import type { MusicClock, MusicPlayer } from './clock';

// ---------- link do vídeo ----------

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Tira o id de 11 letras de um link do YouTube (watch, youtu.be, shorts, embed, music) ou do próprio id. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (ID_RE.test(s)) return s;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = url.pathname.split('/')[1] ?? null;
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      id = m ? m[1] : null;
    }
  }
  return id && ID_RE.test(id) ? id : null;
}

// ---------- relógio ----------

/**
 * Relógio da dança que segue o tempo do vídeo.
 * O player só informa a posição de tempos em tempos; entre uma leitura e outra o relógio anda com o
 * relógio da página e corrige devagar quando a leitura muda (salto só se a diferença for grande).
 */
export class VideoClock implements MusicClock {
  rate = 1;
  running = false;
  private anchorPos = 0;
  private anchorWall = 0;
  private lastRaw: number | null = null;

  constructor(
    /** Posição atual do vídeo em segundos, como o player informa. */
    private readonly video: () => number | null,
    /** Relógio da página em segundos (performance.now() / 1000). */
    private readonly wall: () => number,
    public bpm: number,
    public offsetMs: number,
  ) {}

  /** O vídeo começou (ou voltou) a tocar na posição `position`. */
  start(position: number, rate = this.rate): void {
    this.anchorPos = position;
    this.anchorWall = this.wall();
    this.rate = rate;
    this.running = true;
    this.lastRaw = this.video();
  }

  /** O vídeo parou (pausa, carregando ou fim): o relógio congela. */
  hold(position?: number): void {
    this.anchorPos = position ?? this.position();
    this.running = false;
    this.lastRaw = null;
  }

  /** Coloca o relógio parado numa posição (antes de o vídeo começar). */
  seek(position: number): void {
    this.anchorPos = position;
    this.anchorWall = this.wall();
    this.lastRaw = null;
  }

  pause(): number {
    if (this.running) this.hold();
    return this.anchorPos;
  }

  resume(): void {
    if (this.running) return;
    this.start(this.anchorPos);
  }

  setRate(rate: number): void {
    if (this.running) {
      this.anchorPos = this.position();
      this.anchorWall = this.wall();
    }
    this.rate = rate;
  }

  position(): number {
    if (!this.running) return this.anchorPos;
    const w = this.wall();
    let p = this.anchorPos + (w - this.anchorWall) * this.rate;
    const raw = this.video();
    if (raw !== null && Number.isFinite(raw) && raw !== this.lastRaw) {
      this.lastRaw = raw;
      const err = raw - p;
      if (Math.abs(err) > 0.25) {
        // salto de verdade (o vídeo engasgou ou pulou): segue o vídeo
        this.anchorPos = raw;
        this.anchorWall = w;
        p = raw;
      } else {
        // corrige aos poucos, sem tremer os cartões
        this.anchorPos += err * 0.2;
        p += err * 0.2;
      }
    }
    return p;
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

  positionOfBeat(b: number): number {
    return this.timeOfBeat(b) + this.offsetMs / 1000;
  }
}

// ---------- a API do YouTube ----------

/** O pedaço da YouTube IFrame Player API que o jogo usa. */
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  cueVideoById(opts: { videoId: string; startSeconds?: number }): void;
  destroy(): void;
}

interface YTEvent {
  target: YTPlayer;
  data: number;
}

interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: YTEvent) => void;
        onStateChange?: (e: YTEvent) => void;
        onError?: (e: YTEvent) => void;
      };
    },
  ) => YTPlayer;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export const YT_STATE = { naoIniciado: -1, fim: 0, tocando: 1, pausado: 2, carregando: 3, pronto: 5 };

let apiPromise: Promise<YTNamespace> | null = null;

/** Carrega o script da API uma vez só. Falha sem internet ou se o YouTube estiver bloqueado. */
export function loadYouTubeApi(timeoutMs = 15_000): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('A API do YouTube não respondeu')), timeoutMs);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      window.clearTimeout(timer);
      if (window.YT?.Player) resolve(window.YT);
      else reject(new Error('A API do YouTube veio incompleta'));
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Sem acesso ao YouTube'));
    };
    document.head.append(s);
  }).catch((err: unknown) => {
    apiPromise = null; // deixa tentar de novo depois
    throw err;
  });
  return apiPromise;
}

/** Mensagens para o adulto, pelo código de erro do player. */
export function youTubeErrorText(code: number): string {
  if (code === 101 || code === 150 || code === 153)
    return 'O dono deste vídeo não deixa ele tocar fora do YouTube. Tente outro vídeo da mesma música.';
  if (code === 100) return 'Este vídeo não existe mais ou é privado.';
  if (code === 2) return 'O link do vídeo parece errado.';
  if (code === 5) return 'O navegador não conseguiu tocar este vídeo.';
  return `O YouTube não tocou o vídeo (erro ${code}).`;
}

export type YtEstado = 'parado' | 'preparando' | 'pronto' | 'erro';

/**
 * A música vinda do YouTube. Tem os mesmos comandos do AudioEngine (tocar, pausar, retomar, fade),
 * então a cena de dança usa um ou outro sem saber a diferença.
 */
export class YouTubeMusic implements MusicPlayer {
  clock: VideoClock | null = null;
  estado: YtEstado = 'parado';
  /** Última mensagem de erro, para o adulto. */
  erro: string | null = null;
  videoId = '';
  /** O player está esperando o vídeo carregar (o relógio fica parado). */
  buffering = false;
  /** Pedimos para tocar, mas o vídeo ainda não começou. */
  waitingStart = false;
  /** Quando começou a espera, em segundos da página (para avisar "toque no vídeo"). */
  waitingSince = 0;
  private player: YTPlayer | null = null;
  private playerId = '';
  private readyResolve: (() => void) | null = null;
  private stateListeners = new Set<(s: number) => void>();
  private errorListeners = new Set<(code: number) => void>();
  private want: 'tocar' | 'parar' = 'parar';
  private wantRate = 1;
  private volume = 90;
  private fadeTimer = 0;
  private warming = false;
  private ended = false;
  private seekTarget = 0;
  private prepareToken = 0;

  constructor(private readonly hostId = 'youtube') {}

  private get host(): HTMLElement | null {
    return document.getElementById(this.hostId);
  }

  private wall(): number {
    return performance.now() / 1000;
  }

  /** Mostra o player no canto (durante a dança) ou deixa ele quase invisível (aquecendo). */
  show(mode: 'escondido' | 'aquecendo' | 'visivel'): void {
    const h = this.host;
    if (!h) return;
    h.dataset.modo = mode;
  }

  setVolume(v: number): void {
    this.volume = Math.round(Math.max(0, Math.min(1, v)) * 100);
    if (this.player && !this.fadeTimer) this.player.setVolume(this.volume);
  }

  get duration(): number {
    const d = this.player?.getDuration() ?? 0;
    return d > 0 ? d : Number.POSITIVE_INFINITY;
  }

  /** Posição do vídeo informada pelo player. */
  rawTime(): number | null {
    if (!this.player) return null;
    const t = this.player.getCurrentTime();
    return Number.isFinite(t) ? t : null;
  }

  private async ensurePlayer(videoId: string): Promise<YTPlayer> {
    const YT = await loadYouTubeApi();
    if (this.player && this.playerId === videoId) return this.player;
    if (this.player && this.playerId !== videoId) {
      this.playerId = videoId;
      const ready = new Promise<void>((r) => (this.readyResolve = r));
      this.player.cueVideoById({ videoId });
      // o cue não chama onReady de novo: espera o estado "pronto" (5)
      const unsub = this.onState((s) => {
        if (s === YT_STATE.pronto) this.readyResolve?.();
      });
      await Promise.race([ready, sleep(4000)]);
      unsub();
      return this.player;
    }
    const host = this.host;
    if (!host) throw new Error('falta o lugar do player na página');
    const slot = document.createElement('div');
    host.replaceChildren(slot);
    this.playerId = videoId;
    const ready = new Promise<void>((r) => (this.readyResolve = r));
    this.player = new YT.Player(slot, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        playsinline: 1,
        controls: 0,
        disablekb: 1,
        rel: 0,
        fs: 0,
        iv_load_policy: 3,
        origin: location.origin,
      },
      events: {
        onReady: () => this.readyResolve?.(),
        onStateChange: (e) => this.handleState(e.data),
        onError: (e) => this.handleError(e.data),
      },
    });
    await ready;
    return this.player;
  }

  private onState(fn: (s: number) => void): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  private onError(fn: (code: number) => void): () => void {
    this.errorListeners.add(fn);
    return () => this.errorListeners.delete(fn);
  }

  private handleError(code: number): void {
    this.erro = youTubeErrorText(code);
    this.estado = 'erro';
    this.buffering = false;
    for (const fn of this.errorListeners) fn(code);
  }

  /** O relógio da dança segue o que o vídeo está fazendo de verdade. */
  private handleState(s: number): void {
    for (const fn of this.stateListeners) fn(s);
    if (this.warming) return;
    const clock = this.clock;
    const p = this.player;
    if (s === YT_STATE.tocando) {
      const afterSeek = this.waitingStart;
      this.buffering = false;
      this.waitingStart = false;
      if (this.want !== 'tocar') {
        // tocou sem a gente pedir (por exemplo, toque no vídeo durante a pausa): para de novo
        p?.pauseVideo();
        return;
      }
      if (clock && p) {
        const raw = p.getCurrentTime();
        let pos = Number.isFinite(raw) ? raw : this.seekTarget;
        // logo depois de um seek o vídeo sai exatamente do ponto pedido; a leitura pode vir atrasada
        if (afterSeek && Math.abs(pos - this.seekTarget) <= 0.3) pos = this.seekTarget;
        clock.start(pos, p.getPlaybackRate() || this.wantRate);
      }
    } else if (s === YT_STATE.carregando) {
      this.buffering = true;
      if (clock?.running) clock.hold(this.rawTime() ?? undefined);
    } else if (s === YT_STATE.pausado) {
      this.buffering = false;
      if (clock?.running) clock.hold(this.rawTime() ?? undefined);
      // pausou sem a gente pedir: tenta continuar
      if (this.want === 'tocar') p?.playVideo();
    } else if (s === YT_STATE.fim) {
      this.ended = true;
      this.buffering = false;
      if (clock) clock.hold(Math.max(clock.position(), this.duration));
    }
  }

  /**
   * Abre o vídeo e deixa ele pronto para começar em `start` segundos.
   * Toca um pouquinho sem som para carregar (e passar algum anúncio antes) e para de novo.
   * Devolve false se o vídeo não puder tocar: o jogo então usa as palminhas no lugar da música.
   */
  async prepare(videoId: string, start: number, timeoutMs = 45_000): Promise<boolean> {
    const token = ++this.prepareToken;
    this.estado = 'preparando';
    this.erro = null;
    this.ended = false;
    this.want = 'parar';
    this.show('aquecendo');
    try {
      const p = await withTimeout(this.ensurePlayer(videoId), 20_000, 'O vídeo não abriu');
      if (token !== this.prepareToken) return false;
      this.warming = true;
      p.mute();
      p.seekTo(Math.max(0, start), true);
      p.playVideo();
      await withTimeout(this.waitPlaying(start), timeoutMs, 'O vídeo demorou demais para começar');
      if (token !== this.prepareToken) return false;
      p.pauseVideo();
      p.seekTo(Math.max(0, start), true);
      p.unMute();
      p.setVolume(this.volume);
      this.warming = false;
      this.estado = 'pronto';
      this.videoId = videoId;
      return true;
    } catch (err) {
      if (token !== this.prepareToken) return false;
      this.warming = false;
      this.estado = 'erro';
      if (!this.erro) this.erro = err instanceof Error ? err.message : 'O YouTube não respondeu.';
      try {
        this.player?.pauseVideo();
      } catch {
        // player quebrado: nada a fazer
      }
      this.show('escondido');
      console.warn('YouTube indisponível', err);
      return false;
    }
  }

  /** Espera o vídeo de verdade tocar (depois de um eventual anúncio) ou dar erro. */
  private waitPlaying(start: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const check = (): boolean => {
        const p = this.player;
        if (!p) return false;
        const t = p.getCurrentTime();
        return p.getPlayerState() === YT_STATE.tocando && p.getDuration() > 0 && t >= start - 1;
      };
      const timer = window.setInterval(() => {
        if (check()) done();
      }, 100);
      const offErr = this.onError(() => {
        cleanup();
        reject(new Error(this.erro ?? 'erro do YouTube'));
      });
      const offState = this.onState(() => {
        if (check()) done();
      });
      const cleanup = (): void => {
        window.clearInterval(timer);
        offErr();
        offState();
      };
      const done = (): void => {
        cleanup();
        resolve();
      };
    });
  }

  /** Cria o relógio da dança para a música preparada. */
  load(bpm: number, offsetMs: number): VideoClock {
    this.clock = new VideoClock(
      () => this.rawTime(),
      () => this.wall(),
      bpm,
      offsetMs,
    );
    return this.clock;
  }

  play(position = 0, rate = 1): void {
    const p = this.player;
    if (!p || !this.clock) return;
    this.stopFade();
    p.setVolume(this.volume);
    this.want = 'tocar';
    this.wantRate = rate;
    this.ended = false;
    this.seekTarget = Math.max(0, position);
    this.clock.seek(this.seekTarget);
    this.clock.rate = rate;
    p.setPlaybackRate(rate);
    p.seekTo(this.seekTarget, true);
    p.playVideo();
    this.waitingStart = true;
    this.waitingSince = this.wall();
    this.show('visivel');
  }

  pause(): void {
    if (!this.player || this.want === 'parar') return;
    this.want = 'parar';
    this.waitingStart = false;
    if (this.clock) this.clock.hold(this.clock.position());
    this.player.pauseVideo();
  }

  resume(): void {
    if (!this.player || !this.clock || this.want === 'tocar') return;
    this.want = 'tocar';
    // volta exatamente do ponto em que o relógio parou
    this.seekTarget = this.clock.position();
    this.player.seekTo(this.seekTarget, true);
    this.player.playVideo();
    this.waitingStart = true;
    this.waitingSince = this.wall();
  }

  setRate(rate: number): void {
    this.wantRate = rate;
    this.clock?.setRate(rate);
    this.player?.setPlaybackRate(rate);
  }

  fadeOut(seconds: number): void {
    const p = this.player;
    if (!p || this.fadeTimer) return;
    const t0 = this.wall();
    const v0 = this.volume;
    this.fadeTimer = window.setInterval(() => {
      const k = Math.min(1, (this.wall() - t0) / Math.max(0.05, seconds));
      p.setVolume(Math.round(v0 * (1 - k)));
      if (k >= 1) this.stopFade(false);
    }, 50);
  }

  private stopFade(restore = true): void {
    if (this.fadeTimer) window.clearInterval(this.fadeTimer);
    this.fadeTimer = 0;
    if (restore) this.player?.setVolume(this.volume);
  }

  /** Para tudo e esconde o player. O player continua criado para a próxima música abrir rápido. */
  stop(): void {
    this.prepareToken++;
    this.want = 'parar';
    this.warming = false;
    this.waitingStart = false;
    this.buffering = false;
    this.stopFade();
    try {
      this.player?.pauseVideo();
    } catch {
      // ignora: player ainda carregando
    }
    this.clock?.hold();
    this.clock = null;
    if (this.estado !== 'erro') this.estado = 'parado';
    this.show('escondido');
  }

  /** O vídeo terminou. */
  get over(): boolean {
    return this.ended;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => window.setTimeout(r, ms));
}

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error(msg)), ms);
    p.then(
      (v) => {
        window.clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        window.clearTimeout(t);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    );
  });
}
