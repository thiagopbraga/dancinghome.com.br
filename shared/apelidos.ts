// Listas fechadas de apelidos para o placar público.
// Nunca aceitamos texto livre no servidor: o apelido é sempre "<ANIMAL> <QUALIDADE> <00..99>".
// 40 animais × 40 qualidades × 100 números = 160.000 combinações seguras e divertidas.

export const ANIMAIS: readonly string[] = [
  'Gatinha',
  'Coelho',
  'Panda',
  'Raposa',
  'Golfinho',
  'Unicórnio',
  'Coruja',
  'Lontra',
  'Tigre',
  'Borboleta',
  'Dragão',
  'Fênix',
  'Pinguim',
  'Koala',
  'Capivara',
  'Arara',
  'Tucano',
  'Flamingo',
  'Leopardo',
  'Estrela-do-Mar',
  'Beija-Flor',
  'Joaninha',
  'Canguru',
  'Lobo',
  'Esquilo',
  'Tartaruga',
  'Pavão',
  'Camaleão',
  'Baleia',
  'Lêmure',
  'Preguiça',
  'Rena',
  'Cisne',
  'Sabiá',
  'Jaguatirica',
  'Tamanduá',
  'Quati',
  'Suricato',
  'Vagalume',
  'Chinchila',
];

// Adjetivos uniformes (servem tanto para substantivos femininos quanto masculinos).
export const QUALIDADES: readonly string[] = [
  'Brilhante',
  'Veloz',
  'Dançante',
  'Alegre',
  'Estelar',
  'Musical',
  'Saltitante',
  'Radiante',
  'Valente',
  'Gentil',
  'Ágil',
  'Feliz',
  'Incrível',
  'Cintilante',
  'Reluzente',
  'Vibrante',
  'Mirabolante',
  'Elegante',
  'Sorridente',
  'Deslumbrante',
  'Fascinante',
  'Empolgante',
  'Genial',
  'Especial',
  'Tropical',
  'Celestial',
  'Espacial',
  'Sideral',
  'Fenomenal',
  'Sensacional',
  'Espetacular',
  'Solar',
  'Lunar',
  'Polar',
  'Real',
  'Leal',
  'Triunfal',
  'Audaz',
  'Relâmpago',
  'Cristal',
];

export const TOTAL_COMBINACOES = ANIMAIS.length * QUALIDADES.length * 100;

const ANIMAIS_SET = new Set<string>(ANIMAIS);
const QUALIDADES_SET = new Set<string>(QUALIDADES);

export interface ApelidoPartes {
  animal: string;
  qualidade: string;
  numero: string;
}

/** Decompõe e valida um apelido no formato exato "<ANIMAL> <QUALIDADE> <00..99>". */
export function parseApelido(apelido: string): ApelidoPartes | null {
  if (typeof apelido !== 'string') return null;
  if (apelido.length < 6 || apelido.length > 50) return null;
  if (apelido.trim() !== apelido) return null;
  const partes = apelido.split(' ');
  if (partes.length !== 3) return null;
  const [animal, qualidade, numero] = partes;
  if (!ANIMAIS_SET.has(animal)) return null;
  if (!QUALIDADES_SET.has(qualidade)) return null;
  if (!/^\d{2}$/.test(numero)) return null;
  return { animal, qualidade, numero };
}

/** Confere se o apelido pertence exatamente à combinação das listas fechadas. */
export function isValidApelido(apelido: string): boolean {
  return parseApelido(apelido) !== null;
}

/** Sorteia um apelido válido usando o gerador pseudoaleatório informado (ou Math.random). */
export function gerarApelido(rng: () => number = Math.random): string {
  const animal = ANIMAIS[Math.floor(rng() * ANIMAIS.length) % ANIMAIS.length];
  const qualidade = QUALIDADES[Math.floor(rng() * QUALIDADES.length) % QUALIDADES.length];
  const num = Math.floor(rng() * 100) % 100;
  const numero = String(num).padStart(2, '0');
  return `${animal} ${qualidade} ${numero}`;
}

/** Sorteia N apelidos distintos para escolha rápida por gestos ou toque. */
export function sugerirApelidos(
  quantidade = 3,
  rng: () => number = Math.random,
  excluir: string | null = null,
): string[] {
  const escolhidos: string[] = [];
  const usados = new Set<string>(excluir ? [excluir] : []);
  let tentativas = 0;
  while (escolhidos.length < quantidade && tentativas < quantidade * 25) {
    tentativas++;
    const candidato = gerarApelido(rng);
    if (!usados.has(candidato)) {
      usados.add(candidato);
      escolhidos.push(candidato);
    }
  }
  return escolhidos;
}
