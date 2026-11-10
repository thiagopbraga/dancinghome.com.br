// Transforma a foto de um desenho em papel branco numa figura com fundo transparente.

export const WHITE_THRESHOLD = 200;

/**
 * Deixa transparentes os pixels claros e sem cor (o papel). Mexe no próprio vetor RGBA
 * e devolve a caixa que envolve o que sobrou, ou null se a foto ficou vazia.
 */
export function removeWhite(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  threshold = WHITE_THRESHOLD,
): { x: number; y: number; w: number; h: number } | null {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      // papel: claro e quase cinza. Um amarelo forte é claro, mas tem cor, então fica.
      if (min >= threshold || (min >= threshold - 40 && max - min < 18)) {
        rgba[i + 3] = 0;
      } else if (rgba[i + 3] > 0) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Balanço do desenho no ritmo: ângulo em radianos e pulinho (0 a 1) para uma batida. */
export function sway(beat: number): { angle: number; hop: number } {
  const frac = beat - Math.floor(beat);
  return { angle: Math.sin(beat * Math.PI) * 0.12, hop: Math.max(0, 1 - frac * 3) };
}
