// Cloudflare Worker da API do placar público opcional e painel de moderação.
// Zero cookies, zero rastreadores, zero armazenamento de IP ou texto livre.
import { z } from 'zod';
import { isValidApelido } from '../shared/apelidos.ts';
import { starsFor } from '../src/core/stars.ts';
import { assinarFicha, chaveTaxaAnonima, verificarFicha } from './crypto.ts';
import { isoDay, isoWeek, roundToHourSec } from './isoWeek.ts';
import type {
  ExecutionContextLike,
  FichaPayload,
  MusicaRow,
  PontuacaoRow,
  RateLimiter,
  ScheduledControllerLike,
  WorkerEnv,
} from './types.ts';

const SEGREDO_PADRAO_DEV = 'segredo-local-desenvolvimento-ensaio-de-danca';
const MAX_BODY_PARTIDA = 256;
const MAX_BODY_PONTUACAO = 1024;
const VALIDADE_FICHA_MS = 2 * 3600 * 1000; // 2 horas
const RETENCAO_DIAS_SEG = 90 * 86400; // 90 dias

const PartidaRequestSchema = z.object({
  musica: z.string().min(1).max(64),
  nivel: z.enum(['facil', 'normal']),
  versao: z.number().int().positive().default(1),
});

const PontuacaoRequestSchema = z.object({
  ficha: z.string().min(16).max(512),
  apelido: z.string().min(6).max(50),
  pontos: z.number().int().min(0),
  estrelas: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  perfeitos: z.number().int().min(0),
  poses: z.number().int().positive(),
});

const OcultarRequestSchema = z
  .object({
    oculta: z.boolean().optional(),
  })
  .optional();

const AtivaRequestSchema = z.object({
  ativa: z.boolean(),
  nivel: z.enum(['facil', 'normal']).optional(),
});

// Fallback de rate limiting em memória para desenvolvimento/testes quando o binding da Cloudflare não está presente.
interface JanelaMemoria {
  contagem: number;
  expiraEmMs: number;
}
const janelasFicha = new Map<string, JanelaMemoria>();
const janelasEnvio = new Map<string, JanelaMemoria>();

export function limparRateLimitsMemoria(): void {
  janelasFicha.clear();
  janelasEnvio.clear();
}

async function verificarRateLimit(
  binding: RateLimiter | undefined,
  mapaMemoria: Map<string, JanelaMemoria>,
  chave: string,
  limite: number,
  periodoMs: number,
  agoraMs: number,
): Promise<boolean> {
  if (binding) {
    const res = await binding.limit({ key: chave });
    return res.success;
  }
  const atual = mapaMemoria.get(chave);
  if (!atual || agoraMs >= atual.expiraEmMs) {
    mapaMemoria.set(chave, { contagem: 1, expiraEmMs: agoraMs + periodoMs });
    return true;
  }
  if (atual.contagem >= limite) return false;
  atual.contagem += 1;
  return true;
}

function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

async function lerCorpoLimitado(
  req: Request,
  limiteBytes: number,
): Promise<{ ok: true; texto: string } | { ok: false; status: number; erro: string }> {
  const contentLength = req.headers.get('content-length');
  if (contentLength !== null) {
    const len = Number(contentLength);
    if (Number.isFinite(len) && len > limiteBytes) {
      return { ok: false, status: 413, erro: 'Corpo da requisição excede o tamanho máximo permitido.' };
    }
  }
  const buf = await req.arrayBuffer();
  if (buf.byteLength > limiteBytes) {
    return { ok: false, status: 413, erro: 'Corpo da requisição excede o tamanho máximo permitido.' };
  }
  return { ok: true, texto: new TextDecoder().decode(buf) };
}

function estrelasCoerentes(
  pontos: number,
  poses: number,
  perfeitos: number,
  estrelas: 1 | 2 | 3,
): boolean {
  if (perfeitos * 100 > pontos) return false;
  // Cada pose concede até 100 pontos de pose + até 20 pontos de energia.
  const minPosePoints = Math.max(0, perfeitos * 100, pontos - poses * 20);
  const maxPosePoints = Math.min(poses * 100, pontos);
  if (minPosePoints > maxPosePoints) return false;
  const minStars = starsFor(minPosePoints, poses);
  const maxStars = starsFor(maxPosePoints, poses);
  return estrelas >= minStars && estrelas <= maxStars;
}

function adminAutorizado(req: Request, env: WorkerEnv): boolean {
  if (!env.ADMIN_TOKEN) return true;
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${env.ADMIN_TOKEN}`;
}

/** Executa a limpeza diária de fichas vencidas e retenção de 90 dias (preservando top 10 histórico). */
export async function executarRetencao(
  env: WorkerEnv,
  agoraMs = Date.now(),
): Promise<{ fichasRemovidas: number; pontuacoesRemovidas: number }> {
  const agoraSeg = Math.floor(agoraMs / 1000);
  const limiteAntigasSeg = agoraSeg - RETENCAO_DIAS_SEG;

  const resFichas = await env.DB.prepare('DELETE FROM ficha_usada WHERE expira_em < ?')
    .bind(agoraSeg)
    .run();

  // Mantém sempre o top 10 histórico (oculta = 0) de cada (musica_id, nivel).
  const resPontuacoes = await env.DB.prepare(
    `DELETE FROM pontuacao
     WHERE criado_em < ?
       AND id NOT IN (
         SELECT id FROM (
           SELECT id,
                  ROW_NUMBER() OVER (
                    PARTITION BY musica_id, nivel
                    ORDER BY pontos DESC, criado_em ASC, id ASC
                  ) AS rn
           FROM pontuacao
           WHERE oculta = 0
         )
         WHERE rn <= 10
       )`,
  )
    .bind(limiteAntigasSeg)
    .run();

  return {
    fichasRemovidas: resFichas.meta?.changes ?? 0,
    pontuacoesRemovidas: resPontuacoes.meta?.changes ?? 0,
  };
}

export interface HandleApiOptions {
  now?: () => number;
}

export async function handleApiRequest(
  req: Request,
  env: WorkerEnv,
  _ctx?: ExecutionContextLike,
  options?: HandleApiOptions,
): Promise<Response> {
  const agoraMs = options?.now ? options.now() : Date.now();
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method.toUpperCase();
  const segredo = env.FICHA_SEGREDO || SEGREDO_PADRAO_DEV;

  // 1. GET /api/saude
  if (method === 'GET' && path === '/api/saude') {
    const row = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
    return jsonResponse({
      ok: row?.ok === 1,
      servico: 'ensaio-de-danca',
      banco: row?.ok === 1 ? 'ok' : 'erro',
    });
  }

  // 2. GET /api/placar?musica=<id>&nivel=<facil|normal>&periodo=<semana|sempre>
  if (method === 'GET' && path === '/api/placar') {
    const musica = url.searchParams.get('musica') ?? 'ensaio-aquecimento';
    const nivel = url.searchParams.get('nivel') ?? 'facil';
    const periodo = url.searchParams.get('periodo') ?? 'semana';

    if (nivel !== 'facil' && nivel !== 'normal') {
      return jsonResponse({ ok: false, erro: 'Nível inválido. Use facil ou normal.' }, 400);
    }
    if (periodo !== 'semana' && periodo !== 'sempre') {
      return jsonResponse({ ok: false, erro: 'Período inválido. Use semana ou sempre.' }, 400);
    }
    const musRow = await env.DB.prepare(
      'SELECT id, titulo, nivel, versao, duracao_ms, num_poses, ativa FROM musica WHERE id = ? AND nivel = ?',
    )
      .bind(musica, nivel)
      .first<MusicaRow>();
    if (!musRow) {
      return jsonResponse({ ok: false, erro: 'Música não encontrada no catálogo público.' }, 404);
    }

    const semanaAtual = isoWeek(agoraMs);
    let rows: PontuacaoRow[];
    if (periodo === 'semana') {
      const res = await env.DB.prepare(
        `SELECT id, musica_id, nivel, versao, apelido, pontos, estrelas, perfeitos, poses, semana, criado_em, oculta
         FROM pontuacao
         WHERE musica_id = ? AND nivel = ? AND oculta = 0 AND semana = ?
         ORDER BY pontos DESC, criado_em ASC, id ASC
         LIMIT 10`,
      )
        .bind(musica, nivel, semanaAtual)
        .all<PontuacaoRow>();
      rows = res.results;
    } else {
      const res = await env.DB.prepare(
        `SELECT id, musica_id, nivel, versao, apelido, pontos, estrelas, perfeitos, poses, semana, criado_em, oculta
         FROM pontuacao
         WHERE musica_id = ? AND nivel = ? AND oculta = 0
         ORDER BY pontos DESC, criado_em ASC, id ASC
         LIMIT 10`,
      )
        .bind(musica, nivel)
        .all<PontuacaoRow>();
      rows = res.results;
    }

    return jsonResponse(
      {
        ok: true,
        musica: musRow.id,
        musicaTitulo: musRow.titulo,
        nivel: musRow.nivel,
        periodo,
        semana: semanaAtual,
        itens: rows.map((r, idx) => ({
          posicao: idx + 1,
          apelido: r.apelido,
          pontos: r.pontos,
          estrelas: r.estrelas,
          perfeitos: r.perfeitos,
          poses: r.poses,
          semana: r.semana,
          criadoEm: r.criado_em,
        })),
      },
      200,
      { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    );
  }

  // 3. GET /api/destaques
  if (method === 'GET' && path === '/api/destaques') {
    const semanaAtual = isoWeek(agoraMs);
    const totalRow = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM pontuacao WHERE oculta = 0 AND semana = ?',
    )
      .bind(semanaAtual)
      .first<{ total: number }>();

    const topRes = await env.DB.prepare(
      `SELECT p.apelido, p.musica_id, m.titulo AS musica_titulo, p.nivel, p.pontos, p.estrelas
       FROM pontuacao p
       JOIN musica m ON m.id = p.musica_id AND m.nivel = p.nivel
       WHERE p.oculta = 0 AND p.semana = ?
       ORDER BY p.pontos DESC, p.criado_em ASC, p.id ASC
       LIMIT 5`,
    )
      .bind(semanaAtual)
      .all<{
        apelido: string;
        musica_id: string;
        musica_titulo: string;
        nivel: 'facil' | 'normal';
        pontos: number;
        estrelas: number;
      }>();

    return jsonResponse(
      {
        ok: true,
        semana: semanaAtual,
        totalSemana: Number(totalRow?.total ?? 0),
        itens: topRes.results.map((r, idx) => ({
          posicao: idx + 1,
          apelido: r.apelido,
          musica: r.musica_id,
          musicaTitulo: r.musica_titulo,
          nivel: r.nivel,
          pontos: r.pontos,
          estrelas: r.estrelas,
        })),
      },
      200,
      { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    );
  }

  // 4. POST /api/partidas
  if (method === 'POST' && path === '/api/partidas') {
    const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'local';
    const chave = await chaveTaxaAnonima(ip, segredo, isoDay(agoraMs));
    const permitido = await verificarRateLimit(
      env.LIMITE_FICHA,
      janelasFicha,
      `ficha:${chave}`,
      30,
      60_000,
      agoraMs,
    );
    if (!permitido) {
      return jsonResponse({ ok: false, erro: 'Muitas fichas solicitadas. Tente novamente em instantes.' }, 429);
    }

    const corpo = await lerCorpoLimitado(req, MAX_BODY_PARTIDA);
    if (!corpo.ok) {
      return jsonResponse({ ok: false, erro: corpo.erro }, corpo.status);
    }

    let json: unknown;
    try {
      json = JSON.parse(corpo.texto);
    } catch {
      return jsonResponse({ ok: false, erro: 'JSON inválido.' }, 400);
    }

    const parsed = PartidaRequestSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ ok: false, erro: 'Dados de partida inválidos.' }, 400);
    }

    const { musica, nivel, versao } = parsed.data;
    const musRow = await env.DB.prepare(
      'SELECT id, titulo, nivel, versao, duracao_ms, num_poses, ativa FROM musica WHERE id = ? AND nivel = ?',
    )
      .bind(musica, nivel)
      .first<MusicaRow>();

    if (!musRow || musRow.ativa !== 1 || musRow.versao !== versao) {
      return jsonResponse({ ok: false, erro: 'Música ou nível indisponível para o placar.' }, 400);
    }

    const payload: FichaPayload = {
      jti: crypto.randomUUID(),
      musica: musRow.id,
      nivel: musRow.nivel,
      versao: musRow.versao,
      inicio: agoraMs,
    };
    const ficha = await assinarFicha(payload, segredo);
    return jsonResponse({
      ok: true,
      ficha,
      expiraEm: Math.floor((agoraMs + VALIDADE_FICHA_MS) / 1000),
    });
  }

  // 5. POST /api/pontuacoes
  if (method === 'POST' && path === '/api/pontuacoes') {
    const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'local';
    const chave = await chaveTaxaAnonima(ip, segredo, isoDay(agoraMs));
    const permitido = await verificarRateLimit(
      env.LIMITE_ENVIO,
      janelasEnvio,
      `envio:${chave}`,
      6,
      60_000,
      agoraMs,
    );
    if (!permitido) {
      return jsonResponse({ ok: false, erro: 'Muitos envios seguidos. Aguarde um minuto.' }, 429);
    }

    const corpo = await lerCorpoLimitado(req, MAX_BODY_PONTUACAO);
    if (!corpo.ok) {
      return jsonResponse({ ok: false, erro: corpo.erro }, corpo.status);
    }

    let json: unknown;
    try {
      json = JSON.parse(corpo.texto);
    } catch {
      return jsonResponse({ ok: false, erro: 'JSON inválido.' }, 400);
    }

    const parsed = PontuacaoRequestSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ ok: false, erro: 'Campos de pontuação inválidos.' }, 400);
    }

    const { ficha, apelido, pontos, estrelas, perfeitos, poses } = parsed.data;

    // Camada 5: Apelido da lista fechada
    if (!isValidApelido(apelido)) {
      return jsonResponse({ ok: false, erro: 'Apelido fora da lista permitida.' }, 400);
    }

    // Camada 1: Assinatura HMAC e validade temporal (< 2h)
    const fichaPayload = await verificarFicha(ficha, segredo);
    if (!fichaPayload) {
      return jsonResponse({ ok: false, erro: 'Ficha de partida inválida ou adulterada.' }, 400);
    }
    const decorridoMs = agoraMs - fichaPayload.inicio;
    if (decorridoMs < 0 || decorridoMs > VALIDADE_FICHA_MS) {
      return jsonResponse({ ok: false, erro: 'Ficha de partida expirada.' }, 400);
    }

    // Camada 2: Música ativa e versão correspondente
    const musRow = await env.DB.prepare(
      'SELECT id, titulo, nivel, versao, duracao_ms, num_poses, ativa FROM musica WHERE id = ? AND nivel = ?',
    )
      .bind(fichaPayload.musica, fichaPayload.nivel)
      .first<MusicaRow>();

    if (!musRow || musRow.ativa !== 1 || musRow.versao !== fichaPayload.versao) {
      return jsonResponse({ ok: false, erro: 'Música ou versão inativa para o placar.' }, 400);
    }

    // Camada 3: Tempo mínimo de dança (>= 90% da duração real da música)
    if (decorridoMs < musRow.duracao_ms * 0.9) {
      return jsonResponse({ ok: false, erro: 'Tempo de partida incompatível com a duração da música.' }, 400);
    }

    // Camada 4: Teto matemático de pontos, poses, perfeitos e coerência de estrelas
    if (poses !== musRow.num_poses) {
      return jsonResponse({ ok: false, erro: 'Quantidade de poses incompatível com a coreografia.' }, 400);
    }
    if (perfeitos > musRow.num_poses) {
      return jsonResponse({ ok: false, erro: 'Quantidade de perfeitos acima do total de poses.' }, 400);
    }
    if (pontos > musRow.num_poses * 120) {
      return jsonResponse({ ok: false, erro: 'Pontuação acima do teto matemático da coreografia.' }, 400);
    }
    if (!estrelasCoerentes(pontos, poses, perfeitos, estrelas)) {
      return jsonResponse({ ok: false, erro: 'Estrelas incoerentes com a pontuação enviada.' }, 400);
    }

    // Camada 6: Uso único da ficha (jti)
    const jaUsada = await env.DB.prepare('SELECT jti FROM ficha_usada WHERE jti = ?')
      .bind(fichaPayload.jti)
      .first<{ jti: string }>();
    if (jaUsada) {
      return jsonResponse({ ok: false, erro: 'Esta ficha de partida já foi utilizada.' }, 409);
    }

    const expiraEmSeg = Math.floor((fichaPayload.inicio + VALIDADE_FICHA_MS) / 1000);
    try {
      await env.DB.prepare('INSERT INTO ficha_usada (jti, expira_em) VALUES (?, ?)')
        .bind(fichaPayload.jti, expiraEmSeg)
        .run();
    } catch {
      return jsonResponse({ ok: false, erro: 'Esta ficha de partida já foi utilizada.' }, 409);
    }

    // Camada 7: Gravação com privacidade (timestamp arredondado para a hora cheia)
    const semanaAtual = isoWeek(agoraMs);
    const criadoEmHora = roundToHourSec(agoraMs);
    const ins = await env.DB.prepare(
      `INSERT INTO pontuacao (musica_id, nivel, versao, apelido, pontos, estrelas, perfeitos, poses, semana, criado_em, oculta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    )
      .bind(
        musRow.id,
        musRow.nivel,
        musRow.versao,
        apelido,
        pontos,
        estrelas,
        perfeitos,
        poses,
        semanaAtual,
        criadoEmHora,
      )
      .run();

    const novoId = Number(ins.meta?.last_row_id ?? 0);
    const posRow = await env.DB.prepare(
      `SELECT COUNT(*) AS acima
       FROM pontuacao
       WHERE musica_id = ? AND nivel = ? AND semana = ? AND oculta = 0
         AND (pontos > ? OR (pontos = ? AND (criado_em < ? OR (criado_em = ? AND id < ?))))`,
    )
      .bind(musRow.id, musRow.nivel, semanaAtual, pontos, pontos, criadoEmHora, criadoEmHora, novoId)
      .first<{ acima: number }>();

    const posicaoSemana = Number(posRow?.acima ?? 0) + 1;
    return jsonResponse({
      ok: true,
      id: novoId,
      posicaoSemana,
      top10: posicaoSemana <= 10,
      semana: semanaAtual,
    });
  }

  // 6. Rotas de moderação (/api/admin/*)
  if (path.startsWith('/api/admin/')) {
    if (!adminAutorizado(req, env)) {
      return jsonResponse({ ok: false, erro: 'Acesso não autorizado.' }, 401);
    }

    if (method === 'GET' && path === '/api/admin/pontuacoes') {
      const ultimas = await env.DB.prepare(
        `SELECT p.id, p.musica_id, m.titulo AS musica_titulo, p.nivel, p.versao, p.apelido,
                p.pontos, p.estrelas, p.perfeitos, p.poses, p.semana, p.criado_em, p.oculta
         FROM pontuacao p
         LEFT JOIN musica m ON m.id = p.musica_id AND m.nivel = p.nivel
         ORDER BY p.id DESC
         LIMIT 50`,
      ).all<PontuacaoRow & { musica_titulo?: string }>();

      const musicas = await env.DB.prepare(
        'SELECT id, titulo, nivel, versao, duracao_ms, num_poses, ativa FROM musica ORDER BY id ASC, nivel ASC',
      ).all<MusicaRow>();

      return jsonResponse({
        ok: true,
        pontuacoes: ultimas.results.map((r) => ({
          id: r.id,
          musica: r.musica_id,
          musicaTitulo: r.musica_titulo ?? r.musica_id,
          nivel: r.nivel,
          versao: r.versao,
          apelido: r.apelido,
          pontos: r.pontos,
          estrelas: r.estrelas,
          perfeitos: r.perfeitos,
          poses: r.poses,
          semana: r.semana,
          criadoEm: r.criado_em,
          oculta: r.oculta === 1,
        })),
        musicas: musicas.results.map((m) => ({
          id: m.id,
          titulo: m.titulo,
          nivel: m.nivel,
          versao: m.versao,
          duracaoMs: m.duracao_ms,
          numPoses: m.num_poses,
          ativa: m.ativa === 1,
        })),
      });
    }

    const matchOcultar = /^\/api\/admin\/pontuacoes\/(\d+)\/ocultar$/.exec(path);
    if (method === 'POST' && matchOcultar) {
      const id = Number(matchOcultar[1]);
      let ocultaVal = 1;
      const texto = await req.text();
      if (texto.trim().length > 0) {
        try {
          const parsed = OcultarRequestSchema.parse(JSON.parse(texto));
          if (parsed && typeof parsed.oculta === 'boolean') {
            ocultaVal = parsed.oculta ? 1 : 0;
          }
        } catch {
          return jsonResponse({ ok: false, erro: 'Parâmetro inválido.' }, 400);
        }
      }
      const res = await env.DB.prepare('UPDATE pontuacao SET oculta = ? WHERE id = ?')
        .bind(ocultaVal, id)
        .run();
      if ((res.meta?.changes ?? 0) === 0) {
        return jsonResponse({ ok: false, erro: 'Pontuação não encontrada.' }, 404);
      }
      return jsonResponse({ ok: true, id, oculta: ocultaVal === 1 });
    }

    const matchDelete = /^\/api\/admin\/pontuacoes\/(\d+)$/.exec(path);
    if (method === 'DELETE' && matchDelete) {
      const id = Number(matchDelete[1]);
      const res = await env.DB.prepare('DELETE FROM pontuacao WHERE id = ?').bind(id).run();
      if ((res.meta?.changes ?? 0) === 0) {
        return jsonResponse({ ok: false, erro: 'Pontuação não encontrada.' }, 404);
      }
      return jsonResponse({ ok: true, id, apagada: true });
    }

    const matchMusicaAtiva = /^\/api\/admin\/musicas\/([a-z0-9-]+)\/ativa$/.exec(path);
    if (method === 'POST' && matchMusicaAtiva) {
      const musicaId = matchMusicaAtiva[1];
      let json: unknown;
      try {
        json = JSON.parse(await req.text());
      } catch {
        return jsonResponse({ ok: false, erro: 'JSON inválido.' }, 400);
      }
      const parsed = AtivaRequestSchema.safeParse(json);
      if (!parsed.success) {
        return jsonResponse({ ok: false, erro: 'Parâmetros inválidos.' }, 400);
      }
      const ativaVal = parsed.data.ativa ? 1 : 0;
      const res = parsed.data.nivel
        ? await env.DB.prepare('UPDATE musica SET ativa = ? WHERE id = ? AND nivel = ?')
            .bind(ativaVal, musicaId, parsed.data.nivel)
            .run()
        : await env.DB.prepare('UPDATE musica SET ativa = ? WHERE id = ?')
            .bind(ativaVal, musicaId)
            .run();
      if ((res.meta?.changes ?? 0) === 0) {
        return jsonResponse({ ok: false, erro: 'Música não encontrada.' }, 404);
      }
      return jsonResponse({ ok: true, musica: musicaId, ativa: parsed.data.ativa });
    }
  }

  return jsonResponse({ ok: false, erro: 'Rota da API não encontrada.' }, 404);
}

export default {
  async fetch(req: Request, env: WorkerEnv, ctx?: ExecutionContextLike): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(req, env, ctx);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(req);
    }
    return new Response('Não encontrado', { status: 404 });
  },

  async scheduled(
    controller: ScheduledControllerLike,
    env: WorkerEnv,
    ctx?: ExecutionContextLike,
  ): Promise<void> {
    const tarefa = executarRetencao(env, controller.scheduledTime ?? Date.now());
    if (ctx) ctx.waitUntil(tarefa);
    else await tarefa;
  },
};
