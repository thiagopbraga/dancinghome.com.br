// Música de demonstração "Aquecimento": 120 BPM, 64 batidas (32 s), sintetizada em código.
// Bumbo em toda batida, chimbal nos contratempos, baixo e uma melodia simples.

export const DEMO_BPM = 120;
export const DEMO_BEATS = 64;

const NOTE = (semitonesFromA4: number): number => 440 * Math.pow(2, semitonesFromA4 / 12);
// Dó maior pentatônica: C4 D4 E4 G4 A4 C5
const SCALE = [-9, -7, -5, -2, 0, 3].map(NOTE);
// Uma frase de 16 meias-batidas, repetida com uma variação no refrão.
const PHRASE_A = [0, 2, 3, 2, 4, 3, 2, 0, 0, 2, 3, 5, 4, 3, 2, 3];
const PHRASE_B = [5, 4, 3, 4, 5, 3, 2, 3, 5, 4, 3, 2, 3, 2, 0, 0];
const BASS = [NOTE(-33), NOTE(-33), NOTE(-28), NOTE(-26)]; // C2 C2 F2 G2

/** Gera as amostras mono da música de demonstração. Função pura e determinística. */
export function renderDemoSong(sampleRate = 44100): Float32Array {
  const beatLen = 60 / DEMO_BPM;
  const total = Math.round(DEMO_BEATS * beatLen * sampleRate);
  const out = new Float32Array(total);
  let seed = 12345;
  const noise = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
  };
  const add = (start: number, len: number, fn: (t: number) => number): void => {
    const s0 = Math.round(start * sampleRate);
    const n = Math.round(len * sampleRate);
    for (let i = 0; i < n && s0 + i < total; i++) out[s0 + i] += fn(i / sampleRate);
  };

  for (let b = 0; b < DEMO_BEATS; b++) {
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
    const bass = BASS[Math.floor(b / 4) % BASS.length];
    add(t0, beatLen * 0.9, (t) => 0.2 * Math.sin(2 * Math.PI * bass * t) * Math.exp(-t * 3));
    // melodia: duas notas por batida, a partir da batida 4
    if (b >= 4 && b < DEMO_BEATS - 2) {
      const refrao = b >= 32;
      for (let h = 0; h < 2; h++) {
        const idx = (b * 2 + h) % 16;
        const f = SCALE[(refrao ? PHRASE_B : PHRASE_A)[idx]] * (refrao ? 2 : 1);
        add(t0 + (h * beatLen) / 2, beatLen * 0.45, (t) => {
          const env = Math.min(1, t * 200) * Math.exp(-t * 7);
          return 0.14 * env * (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t));
        });
      }
    }
  }
  // acorde final
  add((DEMO_BEATS - 2) * beatLen, beatLen * 2, (t) => {
    const env = Math.exp(-t * 2.2);
    return (
      0.12 *
      env *
      (Math.sin(2 * Math.PI * SCALE[0] * 2 * t) +
        Math.sin(2 * Math.PI * SCALE[2] * 2 * t) +
        Math.sin(2 * Math.PI * SCALE[3] * 2 * t))
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
