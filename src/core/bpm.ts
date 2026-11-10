// Detector de BPM simples: envelope de energia, autocorrelação e fase da batida.
// Serve para o modo surpresa e para o editor da Área dos Pais. Não precisa ser perfeito: o adulto pode corrigir.

export interface Tempo {
  bpm: number;
  /** Tempo, em ms, do primeiro ataque forte que cai na grade de batidas. */
  offsetMs: number;
  /** 0 a 1: quanto a batida encontrada se destaca. Abaixo de 0,15 a música quase não tem pulso claro. */
  confianca: number;
}

export const BPM_MIN = 80;
export const BPM_MAX = 180;
const FPS = 200;
const MAX_SECONDS = 60;

/** Força dos ataques (subidas de energia) a 200 quadros por segundo. */
export function onsetEnvelope(samples: Float32Array, sampleRate: number): Float32Array {
  const hop = Math.max(1, Math.round(sampleRate / FPS));
  const n = Math.min(Math.floor(samples.length / hop), MAX_SECONDS * FPS);
  const energy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let e = 0;
    const start = i * hop;
    const end = Math.min(samples.length, start + hop * 2);
    for (let j = start; j < end; j++) e += samples[j] * samples[j];
    energy[i] = Math.log1p(e * 100);
  }
  const onset = new Float32Array(n);
  for (let i = 1; i < n; i++) onset[i] = Math.max(0, energy[i] - energy[i - 1]);
  return onset;
}

function autocorr(x: Float32Array, maxLag: number): Float32Array {
  const out = new Float32Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = lag; i < x.length; i++) s += x[i] * x[i - lag];
    out[lag] = s / Math.max(1, x.length - lag);
  }
  return out;
}

function interp(a: Float32Array, pos: number): number {
  const i = Math.floor(pos);
  if (i + 1 >= a.length) return 0;
  const f = pos - i;
  return a[i] * (1 - f) + a[i + 1] * f;
}

/** Acha o andamento entre 80 e 180 BPM. Entre candidatos quase empatados, fica o mais rápido. */
export function detectBpm(samples: Float32Array, sampleRate: number): Tempo | null {
  const onset = onsetEnvelope(samples, sampleRate);
  if (onset.length < FPS * 4) return null;
  const fps = sampleRate / Math.max(1, Math.round(sampleRate / FPS));
  const maxPeriod = (60 / BPM_MIN) * fps;
  const acf = autocorr(onset, Math.ceil(maxPeriod * 4) + 2);
  if (acf[0] <= 0) return null;
  let best = 0;
  const scores: { bpm: number; score: number }[] = [];
  for (let bpm = BPM_MIN; bpm <= BPM_MAX; bpm += 0.25) {
    const period = (60 / bpm) * fps;
    let score = 0;
    for (let k = 1; k <= 4; k++) score += interp(acf, k * period);
    score /= 4 * acf[0];
    scores.push({ bpm, score });
    if (score > best) best = score;
  }
  if (best <= 0) return null;
  // o mais rápido entre os que chegam a 92% do melhor (evita cair na metade do andamento)
  let pick = scores[0];
  for (const s of scores) if (s.score >= best * 0.92 && s.bpm > pick.bpm) pick = s;
  // sobe até o pico local, para não parar na beirada da faixa dos 92%
  let idx = scores.indexOf(pick);
  while (idx > 0 && scores[idx - 1].score > scores[idx].score) idx--;
  while (idx < scores.length - 1 && scores[idx + 1].score > scores[idx].score) idx++;
  pick = scores[idx];

  // fase: onde a grade de batidas pega mais ataques
  const period = (60 / pick.bpm) * fps;
  let bestPhase = 0;
  let bestSum = -1;
  for (let p = 0; p < period; p++) {
    let sum = 0;
    for (let t = p; t < onset.length; t += period) sum += onset[Math.round(t)] ?? 0;
    if (sum > bestSum) {
      bestSum = sum;
      bestPhase = p;
    }
  }
  return {
    bpm: Math.round(pick.bpm * 4) / 4,
    offsetMs: Math.round((bestPhase / fps) * 1000),
    confianca: Math.max(0, Math.min(1, pick.score)),
  };
}

/** Junta os canais de um AudioBuffer num só, para o detector. */
export function monoOf(buffer: {
  numberOfChannels: number;
  length: number;
  getChannelData(c: number): Float32Array;
}): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const out = new Float32Array(buffer.length);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < out.length; i++) out[i] += d[i] / buffer.numberOfChannels;
  }
  return out;
}
