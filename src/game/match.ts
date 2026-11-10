// Configuração e resultado de uma partida.
import type { Nivel, PoseResult } from '../core/types';
import type { Choreo } from '../data/schema';

export interface PlayConfig {
  songId: string;
  nivel: Nivel;
  modo: 'show' | 'treino';
  dupla: boolean;
  estatua: boolean;
  /** Parada da turnê (0 a 4), quando a partida vem do modo história. */
  historia?: number;
  /** Coreografia temporária do modo surpresa (não fica no menu). */
  choreo?: Choreo;
}

export interface MatchSetup {
  cfg: PlayConfig;
  choreo: Choreo;
  buffer: AudioBuffer;
}

export interface Outcome {
  cfg: PlayConfig;
  choreo: Choreo;
  /** Uma lista de resultados por pessoa (duas no modo dupla). */
  resultados: PoseResult[][];
  /** Bônus da pose congelada, por pessoa. */
  bonus: number[];
}

export function defaultConfig(songId: string, nivel: Nivel = 'facil'): PlayConfig {
  return { songId, nivel, modo: 'show', dupla: false, estatua: false };
}
