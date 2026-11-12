// Cálculo de semana ISO 8601 ('YYYY-Www') e arredondamento de timestamp para privacidade.

/** Devolve a semana ISO 8601 em UTC no formato 'YYYY-Www' (ex.: '2026-W46'). */
export function isoWeek(ms: number): string {
  const d = new Date(ms);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Em ISO 8601, segunda-feira = 1 ... domingo = 7. Quinta-feira da semana define o ano ISO.
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/** Devolve a data UTC no formato 'YYYY-MM-DD' para o sal rotativo diário. */
export function isoDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Arredonda um timestamp em milissegundos para o início da hora cheia em segundos Unix. */
export function roundToHourSec(ms: number): number {
  const sec = Math.floor(ms / 1000);
  return Math.floor(sec / 3600) * 3600;
}
