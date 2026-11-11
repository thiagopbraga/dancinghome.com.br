// Tipos enxutos para o Cloudflare Worker + D1 + Rate Limiting, compatíveis com TypeScript estrito sem dependências extras.

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta?: {
    changes?: number;
    last_row_id?: number;
  };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

export interface ScheduledControllerLike {
  scheduledTime?: number;
  cron?: string;
}

export interface WorkerEnv {
  DB: D1Database;
  FICHA_SEGREDO?: string;
  LIMITE_FICHA?: RateLimiter;
  LIMITE_ENVIO?: RateLimiter;
  ASSETS?: Fetcher;
  ADMIN_TOKEN?: string;
}

export interface FichaPayload {
  jti: string;
  musica: string;
  nivel: 'facil' | 'normal';
  versao: number;
  inicio: number;
}

export interface MusicaRow {
  id: string;
  titulo: string;
  nivel: 'facil' | 'normal';
  versao: number;
  duracao_ms: number;
  num_poses: number;
  ativa: number;
}

export interface PontuacaoRow {
  id: number;
  musica_id: string;
  nivel: 'facil' | 'normal';
  versao: number;
  apelido: string;
  pontos: number;
  estrelas: number;
  perfeitos: number;
  poses: number;
  semana: string;
  criado_em: number;
  oculta: number;
}
