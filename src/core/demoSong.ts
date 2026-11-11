// Músicas públicas sintetizadas em código (Web Audio, zero bytes de áudio no repositório, 100% autorais):
// - "ensaio-aquecimento" ("Aquecimento"): 120 BPM, 64 batidas (32 s)
// - "ensaio-brisa" ("Brisa Solar"): 100 BPM, 64 batidas (38,4 s)
// - "ensaio-festa" ("Festa Estelar"): 136 BPM, 104 batidas (~45,9 s)

export const DEMO_BPM = 120;
export const DEMO_BEATS = 64;

export const BRISA_BPM = 100;
export const BRISA_BEATS = 64;

export const FESTA_BPM = 136;
export const FESTA_BEATS = 104;

const NOTE = (semitonesFromA4: number): number => 440 * Math.pow(2, semitonesFromA4 / 12);
// Dó maior pentatônica: C4 D4 E4 G4 A4 C5
const SCALE = [-9, -7, -5, -2, 0, 3].map(NOTE);
// Sol maior pentatônica suave: G4 A4 B4 D5 E5 G5
const SCALE_BRISA = [-2, 0, 2, 5, 7, 10].map(NOTE);
// Fá maior pentatônica brilhante: F4 G4 A4 C5 D5 F5
const SCALE_FESTA = [-4, -2, 0, 3, 5, 8].map(NOTE);

// Uma frase de 16 meias-batidas, repetida com uma variação no refrão.
const PHRASE_A = [0, 2, 3, 2, 4, 3, 2, 0, 0, 2, 3, 5, 4, 3, 2, 3];
const PHRASE_B = [5, 4, 3, 4, 5, 3, 2, 3, 5, 4, 3, 2, 3, 2, 0, 0];
const BASS = [NOTE(-33), NOTE(-33), NOTE(-28), NOTE(-26)]; // C2 C2 F2 G2

const BRISA_A = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 4, 3, 2, 1, 2, 0];
const BRISA_B = [3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1, 2, 0, 0];
const BASS_BRISA = [NOTE(-26), NOTE(-29), NOTE(-33), NOTE(-31)]; // G2 E2 C2 D2

const FESTA_A = [0, 2, 3, 5, 4, 3, 2, 3, 0, 2, 4, 5, 3, 2, 1, 0];
const FESTA_B = [5, 3, 4, 5, 3, 2, 3, 4, 5, 4, 3, 5, 4, 2, 3, 0];
const BASS_FESTA = [NOTE(-28), NOTE(-24), NOTE(-31), NOTE(-33)]; // F2 A2 D2 C2

interface SynthSpec {
  bpm: number;
  beats: number;
  refraoBeat: number;
  scale: number[];
  phraseA: number[];
  phraseB: number[];
  bass: number[];
  seed: number;
  warm: boolean;
}

function renderSynth(spec: SynthSpec, sampleRate: number): Float32Array {
  const beatLen = 60 / spec.bpm;
  const total = Math.round(spec.beats * beatLen * sampleRate);
  const out = new Float32Array(total);
  let seed = spec.seed;
  const noise = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  const add = (start: number, len: number, fn: (t: number) => number): void => {
    const s0 = Math.round(start * sampleRate);
    const n = Math.round(len * sampleRate);
    for (let i = 0; i < n && s0 + i < total; i++) out[s0 + i] += fn(i / sampleRate);
  };

  for (let b = 0; b < spec.beats; b++) {
    const t0 = b * beatLen;
    // bumbo
    add(t0, 0.22, (t) => {
      const f = 45 + 95 * Math.exp(-t * 28);
      return 0.85 * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 14);
    });
    // chimbal no contratempo
    add(t0 + beatLen / 2, 0.05, (t) => 0.16 * noise() * Math.exp(-t * 90));
    // caixa (palma) nas batidas 2 e 4
    if (b % 2 === 1) add(t0, 0.09, (t) => 0.22 * noise() * Math.exp(-t * 45));
    // baixo
    const bass = spec.bass[Math.floor(b / 4) % spec.bass.length];
    add(t0, beatLen * 0.9, (t) => 0.2 * Math.sin(2 * Math.PI * bass * t) * Math.exp(-t * 3));
    // melodia: duas notas por batida, a partir da batida 4
    if (b >= 4 && b < spec.beats - 2) {
      const refrao = b >= spec.refraoBeat;
      for (let h = 0; h < 2; h++) {
        const idx = (b * 2 + h) % 16;
        const f = spec.scale[(refrao ? spec.phraseB : spec.phraseA)[idx]] * (refrao && !spec.warm ? 2 : 1);
        add(t0 + (h * beatLen) / 2, beatLen * 0.45, (t) => {
          const env = Math.min(1, t * 200) * Math.exp(-t * (spec.warm ? 5.5 : 7));
          const harmonic = spec.warm ? 0.18 : 0.3;
          return 0.14 * env * (Math.sin(2 * Math.PI * f * t) + harmonic * Math.sin(4 * Math.PI * f * t));
        });
      }
    }
  }
  // acorde final
  add((spec.beats - 2) * beatLen, beatLen * 2, (t) => {
    const env = Math.exp(-t * 2.2);
    return (
      0.12 *
      env *
      (Math.sin(2 * Math.PI * spec.scale[0] * 2 * t) +
        Math.sin(2 * Math.PI * spec.scale[2] * 2 * t) +
        Math.sin(2 * Math.PI * spec.scale[3] * 2 * t))
    );
  });
  // limita picos e suaviza o fim
  const fade = Math.round(0.05 * sampleRate);
  for (let i = 0; i < total; i++) {
    let v = Math.tanh(out[i] * 1.1);
    if (i > total - fade) v *= (total - i) / fade;
    out[i] = v;
  }
  return out;
}

/** Gera as amostras mono da música de demonstração ("Aquecimento"). Função pura e determinística. */
export function renderDemoSong(sampleRate = 44100): Float32Array {
  return renderSynth(
    {
      bpm: DEMO_BPM,
      beats: DEMO_BEATS,
      refraoBeat: 32,
      scale: SCALE,
      phraseA: PHRASE_A,
      phraseB: PHRASE_B,
      bass: BASS,
      seed: 12345,
      warm: false,
    },
    sampleRate,
  );
}

/** Gera as amostras mono da música "Brisa Solar" (100 BPM, 64 batidas). */
export function renderBrisaSong(sampleRate = 44100): Float32Array {
  return renderSynth(
    {
      bpm: BRISA_BPM,
      beats: BRISA_BEATS,
      refraoBeat: 32,
      scale: SCALE_BRISA,
      phraseA: BRISA_A,
      phraseB: BRISA_B,
      bass: BASS_BRISA,
      seed: 24680,
      warm: true,
    },
    sampleRate,
  );
}

/** Gera as amostras mono da música "Festa Estelar" (136 BPM, 104 batidas). */
export function renderFestaSong(sampleRate = 44100): Float32Array {
  return renderSynth(
    {
      bpm: FESTA_BPM,
      beats: FESTA_BEATS,
      refraoBeat: 48,
      scale: SCALE_FESTA,
      phraseA: FESTA_A,
      phraseB: FESTA_B,
      bass: BASS_FESTA,
      seed: 97531,
      warm: false,
    },
    sampleRate,
  );
}

/** Sintetiza qualquer uma das músicas públicas pelo id, ou devolve null se não for música pública. */
export function renderPublicSong(id: string, sampleRate = 44100): Float32Array | null {
  if (id === 'ensaio-aquecimento') return renderDemoSong(sampleRate);
  if (id === 'ensaio-brisa') return renderBrisaSong(sampleRate);
  if (id === 'ensaio-festa') return renderFestaSong(sampleRate);
  return null;
}
