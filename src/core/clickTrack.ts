// Palminhas no ritmo da música: usadas no lugar da música quando o vídeo do YouTube não pode tocar.
// A batida 0 cai no segundo 0; a primeira de cada compasso de 4 é mais forte.

/** Gera as amostras (mono) de `beats` batidas em `bpm`, com 1 s de folga no fim. */
export function renderClickTrack(bpm: number, beats: number, sampleRate = 16000): Float32Array {
  const period = 60 / bpm;
  const total = Math.ceil((beats * period + 1) * sampleRate);
  const out = new Float32Array(total);
  const clickLen = Math.floor(0.06 * sampleRate);
  for (let b = 0; b < beats; b++) {
    const start = Math.round(b * period * sampleRate);
    const forte = b % 4 === 0;
    const freq = forte ? 1320 : 880;
    const amp = forte ? 0.55 : 0.35;
    for (let i = 0; i < clickLen && start + i < total; i++) {
      const t = i / sampleRate;
      const env = Math.exp(-t * 60);
      out[start + i] += amp * env * Math.sin(2 * Math.PI * freq * t);
    }
  }
  return out;
}
