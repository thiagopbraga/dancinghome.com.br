// Schemas zod e tipos inferidos de todos os dados do jogo.
import { z } from 'zod';

const angulo = z.number().min(0).max(180);

export const AnglesSchema = z
  .object({
    lShoulder: angulo.optional(),
    rShoulder: angulo.optional(),
    lElbow: angulo.optional(),
    rElbow: angulo.optional(),
    lHip: angulo.optional(),
    rHip: angulo.optional(),
    lKnee: angulo.optional(),
    rKnee: angulo.optional(),
  })
  .strict()
  .refine((a) => Object.keys(a).length > 0, { message: 'a pose precisa de pelo menos um ângulo' });

export const NivelSchema = z.enum(['facil', 'normal']);

export const PoseDefSchema = z.object({
  nome: z.string().min(1),
  nivel: NivelSchema,
  angles: AnglesSchema,
  descricao: z.string().default(''),
});

export const CatalogSchema = z.record(z.string(), PoseDefSchema);

export const PoseRefSchema = z.union([
  z.string().min(1),
  z.object({ pose: z.string().min(1), mirror: z.boolean().optional() }),
]);

export const SecaoSchema = z.object({
  nome: z.string().min(1),
  inicioBeat: z.number().min(0),
  aCada: z.number().positive(),
  poses: z.array(PoseRefSchema).min(1),
  segurar: z.number().positive().optional(),
});

export const EventoSchema = z.object({
  beat: z.number().min(0),
  pose: z.string().min(1),
  mirror: z.boolean().optional(),
  holdBeats: z.number().min(0).optional(),
  secao: z.string().optional(),
});

export const NivelDefSchema = z
  .object({
    trecho: z.object({ inicioBeat: z.number().min(0), fimBeat: z.number().positive() }).optional(),
    secoes: z.array(SecaoSchema).optional(),
    eventos: z.array(EventoSchema).optional(),
  })
  .refine((n) => (n.secoes?.length ?? 0) > 0 || (n.eventos?.length ?? 0) > 0, {
    message: 'o nível precisa de "secoes" ou "eventos"',
  });

export const ChoreoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tema: z.string().default(''),
  bpm: z.number().min(40).max(240),
  offsetMs: z.number(),
  calibrado: z.boolean(),
  duracaoBeats: z.number().positive(),
  /** De onde vem a fase: músicas do jogo, demonstração, gravada por ela ou modo surpresa. */
  origem: z.enum(['base', 'demo', 'gravada', 'surpresa']).default('base'),
  /** Fases gravadas usam o áudio de outra música. */
  audioDe: z.string().optional(),
  /**
   * Vídeo do YouTube que toca a música dentro do jogo (quando não há arquivo de áudio no aparelho).
   * offsetMs: onde cai a batida 0 no vídeo (o vídeo pode ter uma introdução diferente do arquivo).
   */
  youtube: z
    .object({ id: z.string().regex(/^[A-Za-z0-9_-]{11}$/), offsetMs: z.number().default(0) })
    .optional(),
  niveis: z
    .object({ facil: NivelDefSchema.optional(), normal: NivelDefSchema.optional() })
    .refine((n) => !!n.facil || !!n.normal, { message: 'a música precisa de pelo menos um nível' }),
});

export const LimitesSchema = z.object({
  perfeito: z.number().min(5).max(60).default(20),
  muitoBem: z.number().min(10).max(90).default(35),
  quase: z.number().min(15).max(120).default(55),
});

export const SettingsSchema = z.object({
  modelo: z.enum(['lite', 'full']).default('lite'),
  volume: z.number().min(0).max(1).default(0.9),
  voz: z.boolean().default(true),
  limites: LimitesSchema.default({ perfeito: 20, muitoBem: 35, quase: 55 }),
  placarAtivo: z.boolean().default(false),
  apelido: z.string().nullable().default(null),
});

export const MelhorSchema = z.object({
  estrelas: z.number().int().min(1).max(3),
  pct: z.number().min(0),
  pontos: z.number().min(0),
});

export const ProgressSchema = z.object({
  melhores: z.record(z.string(), MelhorSchema).default({}),
  musicasTocadas: z.number().int().min(0).default(0),
  perfeitos: z.number().int().min(0).default(0),
  maiorSequencia: z.number().int().min(0).default(0),
  conquistas: z.array(z.string()).default([]),
  /** Número de shows da turnê já feitos (0 a 5). */
  historia: z.number().int().min(0).max(5).default(0),
  gravadas: z.number().int().min(0).default(0),
  treinos: z.number().int().min(0).default(0),
  duplas: z.number().int().min(0).default(0),
  estatuas: z.number().int().min(0).default(0),
  surpresas: z.number().int().min(0).default(0),
});

export const IdolSchema = z.object({
  nome: z.string().min(1).max(20),
  cor: z.string(),
  cabelo: z.number().int().min(0).max(3),
  cabeloCor: z.string(),
  acessorio: z.string().default('nenhum'),
});

export const CharactersSchema = z.object({
  grupo: z.string().max(24).default('As Estrelinhas'),
  idols: z.array(IdolSchema).length(3),
  cachorro: z.string().max(20).default('Pipoca'),
  gato: z.string().max(20).default('Mingau'),
  cenario: z.string().default('sala'),
  /** Desenho dela, já sem o fundo branco, como data URL PNG. */
  desenho: z.string().nullable().default(null),
});

export const ExportSchema = z.object({
  app: z.literal('ensaio-de-danca'),
  versao: z.literal(1),
  settings: SettingsSchema,
  progress: ProgressSchema,
  characters: CharactersSchema,
  choreos: z.array(ChoreoSchema),
  poses: CatalogSchema,
});

export type PoseRef = z.infer<typeof PoseRefSchema>;
export type Secao = z.infer<typeof SecaoSchema>;
export type Evento = z.infer<typeof EventoSchema>;
export type NivelDef = z.infer<typeof NivelDefSchema>;
export type Choreo = z.infer<typeof ChoreoSchema>;
export type YoutubeRef = NonNullable<Choreo['youtube']>;
export type Limites = z.infer<typeof LimitesSchema>;
export type Settings = z.infer<typeof SettingsSchema>;
export type Melhor = z.infer<typeof MelhorSchema>;
export type Progress = z.infer<typeof ProgressSchema>;
export type Idol = z.infer<typeof IdolSchema>;
export type Characters = z.infer<typeof CharactersSchema>;
export type ExportData = z.infer<typeof ExportSchema>;

/** Mensagem curta e legível de um erro de validação. */
export function describeZodError(err: z.ZodError): string {
  return err.issues
    .slice(0, 4)
    .map((i) => `${i.path.join('.') || 'raiz'}: ${i.message}`)
    .join('; ');
}
