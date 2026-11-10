// Contratos principais do jogo (ver docs/plano-de-construcao.md, "Arquitetura e contratos").

export type AngleName = 'lShoulder' | 'rShoulder' | 'lElbow' | 'rElbow' | 'lHip' | 'rHip' | 'lKnee' | 'rKnee';

export const ANGLE_NAMES: readonly AngleName[] = [
  'lShoulder',
  'rShoulder',
  'lElbow',
  'rElbow',
  'lHip',
  'rHip',
  'lKnee',
  'rKnee',
];

/** Graus, 0..180. */
export type Angles = Partial<Record<AngleName, number>>;

/** Coordenadas normalizadas 0..1 do quadro da câmera (sem espelhar). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

/** t = AudioClock.now() em segundos. */
export interface PoseFrame {
  t: number;
  people: Landmark[][];
}

export interface PoseSource {
  /** Largura / altura do quadro de vídeo, usada no cálculo dos ângulos. */
  readonly aspect: number;
  start(video?: HTMLVideoElement): Promise<void>;
  /** Chamado uma vez por quadro. */
  next(t: number): PoseFrame | null;
  stop(): void;
}

export type Nivel = 'facil' | 'normal';

export interface PoseDef {
  nome: string;
  nivel: Nivel;
  angles: Angles;
  descricao: string;
}

export type Catalog = Record<string, PoseDef>;

export interface ChoreoEvent {
  beat: number;
  pose: string;
  mirror: boolean;
  holdBeats: number;
  secao: string;
}

export interface AudioClock {
  /** Segundos de música, já descontados offsetMs e outputLatency. */
  now(): number;
  /** now() * bpm / 60 */
  beat(): number;
  timeOfBeat(b: number): number;
}

export type Rating = 'perfeito' | 'muitoBem' | 'quase' | 'tenteiDeNovo';

export interface PoseResult {
  event: ChoreoEvent;
  bestDiff: number;
  rating: Rating;
  points: number;
  energy: number;
}
