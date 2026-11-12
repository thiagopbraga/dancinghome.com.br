import { beforeEach, describe, expect, it } from 'vitest';
import {
  BRISA_BEATS,
  BRISA_BPM,
  FESTA_BEATS,
  FESTA_BPM,
  renderPublicSong,
} from '../../src/core/demoSong';
import { expandSections, levelRange } from '../../src/data/choreo';
import { loadBaseData, PUBLIC_SONG_IDS } from '../../src/data/songs';
import { criarBancoD1Memoria } from '../../worker/d1Sqlite';
import {
  executarRetencao,
  handleApiRequest,
  limparRateLimitsMemoria,
} from '../../worker/index';
import { roundToHourSec } from '../../worker/isoWeek';
import type { MusicaRow, WorkerEnv } from '../../worker/types';

const T0 = Date.UTC(2026, 10, 10, 15, 23, 45); // 2026-11-10T15:23:45Z

describe('músicas públicas sintetizadas e sincronização SQL', () => {
  it('sintetiza amostras determinísticas para todas as músicas públicas', () => {
    const rate = 8000;
    const aq = renderPublicSong('ensaio-aquecimento', rate);
    const br = renderPublicSong('ensaio-brisa', rate);
    const fe = renderPublicSong('ensaio-festa', rate);
    expect(aq).not.toBeNull();
    expect(br).not.toBeNull();
    expect(fe).not.toBeNull();
    expect(br!.length).toBe(Math.round(BRISA_BEATS * (60 / BRISA_BPM) * rate));
    expect(fe!.length).toBe(Math.round(FESTA_BEATS * (60 / FESTA_BPM) * rate));
    expect(renderPublicSong('inexistente', rate)).toBeNull();
  });

  it('mantém 0002_musicas.sql sincronizado com as coreografias públicas', async () => {
    const db = criarBancoD1Memoria();
    const base = loadBaseData();
    for (const id of PUBLIC_SONG_IDS) {
      const choreo = base.songs.find((s) => s.id === id)!;
      for (const nivel of ['facil', 'normal'] as const) {
        const row = await db
          .prepare('SELECT id, titulo, nivel, duracao_ms, num_poses, ativa FROM musica WHERE id = ? AND nivel = ?')
          .bind(id, nivel)
          .first<MusicaRow>();
        expect(row).not.toBeNull();
        const { inicio, fim } = levelRange(choreo, nivel);
        const duracaoEsperada = Math.round(((fim - inicio) * 60 * 1000) / choreo.bpm);
        const posesEsperadas = expandSections(choreo, nivel).length;
        expect(row!.duracao_ms).toBe(duracaoEsperada);
        expect(row!.num_poses).toBe(posesEsperadas);
        expect(row!.ativa).toBe(1);
      }
    }
  });
});

describe('Worker da API do placar (worker/index.ts)', () => {
  let env: WorkerEnv;
  let relogioMs: number;

  beforeEach(() => {
    limparRateLimitsMemoria();
    relogioMs = T0;
    env = {
      DB: criarBancoD1Memoria(),
      FICHA_SEGREDO: 'segredo-teste-unitario-1234567890',
    };
  });

  async function reqApi(
    path: string,
    init?: RequestInit,
    ip = '203.0.113.10',
  ): Promise<Response> {
    const headers = new Headers(init?.headers);
    if (!headers.has('cf-connecting-ip')) headers.set('cf-connecting-ip', ip);
    if (init?.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    const req = new Request(`https://ensaiodedanca.com.br${path}`, {
      ...init,
      headers,
    });
    return handleApiRequest(req, env, undefined, { now: () => relogioMs });
  }

  async function emitirFicha(musica = 'ensaio-aquecimento', nivel: 'facil' | 'normal' = 'facil'): Promise<string> {
    const res = await reqApi('/api/partidas', {
      method: 'POST',
      body: JSON.stringify({ musica, nivel, versao: 1 }),
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; ficha: string };
    expect(data.ok).toBe(true);
    return data.ficha;
  }

  it('responde em GET /api/saude com status do banco', async () => {
    const res = await reqApi('/api/saude');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      servico: 'ensaio-de-danca',
      banco: 'ok',
    });
  });

  it('aceita fluxo completo de ficha válida e envio de pontuação com timestamp arredondado para a hora cheia', async () => {
    const ficha = await emitirFicha('ensaio-aquecimento', 'facil');
    // Duração de ensaio-aquecimento (fácil) = 32.000 ms (15 poses)
    relogioMs += 31_000; // >= 0.9 * 32000 (28.800 ms)

    const res = await reqApi('/api/pontuacoes', {
      method: 'POST',
      body: JSON.stringify({
        ficha,
        apelido: 'Gatinha Brilhante 27',
        pontos: 1500,
        estrelas: 3,
        perfeitos: 12,
        poses: 15,
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      posicaoSemana: number;
      top10: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.posicaoSemana).toBe(1);
    expect(body.top10).toBe(true);

    // Verifica que criado_em foi arredondado para a hora cheia (privacidade)
    const placarRes = await reqApi('/api/placar?musica=ensaio-aquecimento&nivel=facil&periodo=semana');
    expect(placarRes.status).toBe(200);
    const placar = (await placarRes.json()) as {
      itens: { apelido: string; pontos: number; criadoEm: number }[];
    };
    expect(placar.itens).toHaveLength(1);
    expect(placar.itens[0].apelido).toBe('Gatinha Brilhante 27');
    expect(placar.itens[0].criadoEm).toBe(roundToHourSec(relogioMs));
    expect(placar.itens[0].criadoEm % 3600).toBe(0);
  });

  it('rejeita ficha com assinatura adulterada (400)', async () => {
    const ficha = await emitirFicha();
    relogioMs += 32_000;
    const adulterada = `${ficha.slice(0, -4)}AAAA`;

    const res = await reqApi('/api/pontuacoes', {
      method: 'POST',
      body: JSON.stringify({
        ficha: adulterada,
        apelido: 'Gatinha Brilhante 27',
        pontos: 1400,
        estrelas: 3,
        perfeitos: 10,
        poses: 15,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('rejeita ficha expirada com mais de 2 horas (400)', async () => {
    const ficha = await emitirFicha();
    relogioMs += 2 * 3600 * 1000 + 1000; // 2h + 1s

    const res = await reqApi('/api/pontuacoes', {
      method: 'POST',
      body: JSON.stringify({
        ficha,
        apelido: 'Gatinha Brilhante 27',
        pontos: 1400,
        estrelas: 3,
        perfeitos: 10,
        poses: 15,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('rejeita reuso da mesma ficha (replay de jti) na segunda tentativa (409)', async () => {
    const ficha = await emitirFicha();
    relogioMs += 32_000;
    const payload = {
      ficha,
      apelido: 'Coelho Veloz 08',
      pontos: 1350,
      estrelas: 3,
      perfeitos: 10,
      poses: 15,
    };

    const res1 = await reqApi('/api/pontuacoes', { method: 'POST', body: JSON.stringify(payload) });
    expect(res1.status).toBe(200);

    const res2 = await reqApi('/api/pontuacoes', { method: 'POST', body: JSON.stringify(payload) });
    expect(res2.status).toBe(409);
  });

  it('rejeita envio antes de 90% da duração da música (400)', async () => {
    const ficha = await emitirFicha('ensaio-aquecimento', 'facil');
    relogioMs += 20_000; // < 28.800 ms (90% de 32.000 ms)

    const res = await reqApi('/api/pontuacoes', {
      method: 'POST',
      body: JSON.stringify({
        ficha,
        apelido: 'Gatinha Brilhante 27',
        pontos: 1400,
        estrelas: 3,
        perfeitos: 10,
        poses: 15,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('rejeita pontuação acima do teto matemático (> num_poses * 120) ou poses/perfeitos inválidos (400)', async () => {
    const ficha = await emitirFicha('ensaio-aquecimento', 'facil');
    relogioMs += 32_000;

    // 15 * 120 = 1800 -> 1801 deve falhar
    const resTeto = await reqApi('/api/pontuacoes', {
      method: 'POST',
      body: JSON.stringify({
        ficha,
        apelido: 'Gatinha Brilhante 27',
        pontos: 1801,
        estrelas: 3,
        perfeitos: 15,
        poses: 15,
      }),
    });
    expect(resTeto.status).toBe(400);

    // poses diferente de 15 deve falhar
    const resPoses = await reqApi('/api/pontuacoes', {
      method: 'POST',
      body: JSON.stringify({
        ficha,
        apelido: 'Gatinha Brilhante 27',
        pontos: 1200,
        estrelas: 3,
        perfeitos: 10,
        poses: 14,
      }),
    });
    expect(resPoses.status).toBe(400);
  });

  it('rejeita estrelas incoerentes com a pontuação enviada (400)', async () => {
    const ficha = await emitirFicha('ensaio-aquecimento', 'facil');
    relogioMs += 32_000;

    // Com 300 pontos em 15 poses (20%), o máximo possível é 1 estrela, nunca 3 estrelas
    const res = await reqApi('/api/pontuacoes', {
      method: 'POST',
      body: JSON.stringify({
        ficha,
        apelido: 'Gatinha Brilhante 27',
        pontos: 300,
        estrelas: 3,
        perfeitos: 1,
        poses: 15,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('rejeita apelido fora da lista fechada (400)', async () => {
    const ficha = await emitirFicha('ensaio-aquecimento', 'facil');
    relogioMs += 32_000;

    const res = await reqApi('/api/pontuacoes', {
      method: 'POST',
      body: JSON.stringify({
        ficha,
        apelido: 'Joãozinho da Escola 99',
        pontos: 1400,
        estrelas: 3,
        perfeitos: 10,
        poses: 15,
      }),
    });
    expect(res.status).toBe(400);
  });

  it('rejeita payloads gigantes acima do limite (> 256 B em partidas e > 1024 B em pontuações) com 413', async () => {
    const resPartida = await reqApi('/api/partidas', {
      method: 'POST',
      body: JSON.stringify({ musica: 'a'.repeat(300), nivel: 'facil' }),
    });
    expect(resPartida.status).toBe(413);

    const resPontuacao = await reqApi('/api/pontuacoes', {
      method: 'POST',
      body: JSON.stringify({ ficha: 'x'.repeat(1200) }),
    });
    expect(resPontuacao.status).toBe(413);
  });

  it('aplica rate limiting por chave anônima e retorna 429 ao exceder o limite', async () => {
    const ficha = await emitirFicha();
    relogioMs += 32_000;

    for (let i = 0; i < 6; i++) {
      const r = await reqApi(
        '/api/pontuacoes',
        {
          method: 'POST',
          body: JSON.stringify({
            ficha,
            apelido: 'Apelido Invalido',
            pontos: 100,
            estrelas: 1,
            perfeitos: 0,
            poses: 15,
          }),
        },
        '198.51.100.77',
      );
      expect(r.status).toBe(400);
    }

    // 7ª tentativa no mesmo minuto pelo mesmo IP deve ser barrada com 429
    const r7 = await reqApi(
      '/api/pontuacoes',
      {
        method: 'POST',
        body: JSON.stringify({
          ficha,
          apelido: 'Gatinha Brilhante 27',
          pontos: 100,
          estrelas: 1,
          perfeitos: 0,
          poses: 15,
        }),
      },
      '198.51.100.77',
    );
    expect(r7.status).toBe(429);
  });

  it('ordena o placar por pontos DESC, exclui ocultas e suporta moderação /api/admin/*', async () => {
    const entradas = [
      { apelido: 'Panda Alegre 10', pontos: 1200, estrelas: 3 as const, perfeitos: 10 },
      { apelido: 'Raposa Estelar 22', pontos: 1650, estrelas: 3 as const, perfeitos: 14 },
      { apelido: 'Coruja Musical 05', pontos: 950, estrelas: 2 as const, perfeitos: 7 },
    ];

    for (let i = 0; i < entradas.length; i++) {
      const e = entradas[i];
      const f = await emitirFicha('ensaio-aquecimento', 'facil');
      relogioMs += 32_000;
      const r = await reqApi(
        '/api/pontuacoes',
        {
          method: 'POST',
          body: JSON.stringify({
            ficha: f,
            apelido: e.apelido,
            pontos: e.pontos,
            estrelas: e.estrelas,
            perfeitos: e.perfeitos,
            poses: 15,
          }),
        },
        `203.0.113.${20 + i}`,
      );
      expect(r.status).toBe(200);
    }

    // Verifica destaques da semana
    const destRes = await reqApi('/api/destaques');
    const dest = (await destRes.json()) as {
      totalSemana: number;
      itens: { apelido: string; pontos: number }[];
    };
    expect(dest.totalSemana).toBe(3);
    expect(dest.itens.map((x) => x.apelido)).toEqual([
      'Raposa Estelar 22',
      'Panda Alegre 10',
      'Coruja Musical 05',
    ]);

    // Moderação: lista em /api/admin/pontuacoes e oculta o 1º colocado (id = 2)
    const adminList = await reqApi('/api/admin/pontuacoes');
    const adminData = (await adminList.json()) as {
      pontuacoes: { id: number; apelido: string; oculta: boolean }[];
    };
    const alvo = adminData.pontuacoes.find((p) => p.apelido === 'Raposa Estelar 22')!;
    expect(alvo).toBeDefined();

    const ocultarRes = await reqApi(`/api/admin/pontuacoes/${alvo.id}/ocultar`, {
      method: 'POST',
      body: JSON.stringify({ oculta: true }),
    });
    expect(ocultarRes.status).toBe(200);

    // Agora o placar público não deve exibir a pontuação oculta
    const placarRes = await reqApi('/api/placar?musica=ensaio-aquecimento&nivel=facil&periodo=semana');
    const placar = (await placarRes.json()) as { itens: { apelido: string }[] };
    expect(placar.itens.map((x) => x.apelido)).toEqual(['Panda Alegre 10', 'Coruja Musical 05']);

    // Pausar uma música via /api/admin/musicas/:id/ativa impede novas fichas
    const pausarRes = await reqApi('/api/admin/musicas/ensaio-brisa/ativa', {
      method: 'POST',
      body: JSON.stringify({ ativa: false, nivel: 'facil' }),
    });
    expect(pausarRes.status).toBe(200);
    const fichaPausada = await reqApi('/api/partidas', {
      method: 'POST',
      body: JSON.stringify({ musica: 'ensaio-brisa', nivel: 'facil', versao: 1 }),
    });
    expect(fichaPausada.status).toBe(400);
  });

  it('executa retenção no Cron: apaga fichas vencidas e pontuações > 90 dias fora do top 10 histórico', async () => {
    // Insere 12 pontuações antigas (100 dias atrás) para ensaio-aquecimento (fácil)
    const antigoSeg = Math.floor((T0 - 100 * 86400 * 1000) / 1000);
    for (let i = 1; i <= 12; i++) {
      await env.DB.prepare(
        `INSERT INTO pontuacao (musica_id, nivel, versao, apelido, pontos, estrelas, perfeitos, poses, semana, criado_em, oculta)
         VALUES ('ensaio-aquecimento', 'facil', 1, ?, ?, 2, 8, 15, '2026-W30', ?, 0)`,
      )
        .bind(`Gatinha Brilhante ${String(i).padStart(2, '0')}`, i * 100, antigoSeg)
        .run();
    }
    // Insere uma ficha vencida
    await env.DB.prepare('INSERT INTO ficha_usada (jti, expira_em) VALUES (?, ?)')
      .bind('ficha-antiga', antigoSeg)
      .run();

    const resultado = await executarRetencao(env, T0);
    expect(resultado.fichasRemovidas).toBe(1);
    // Das 12 pontuações antigas, as 10 maiores (300..1200) ficam no top 10 de sempre e as 2 menores (100, 200) são apagadas
    expect(resultado.pontuacoesRemovidas).toBe(2);

    const sempreRes = await reqApi('/api/placar?musica=ensaio-aquecimento&nivel=facil&periodo=sempre');
    const sempre = (await sempreRes.json()) as { itens: { pontos: number }[] };
    expect(sempre.itens).toHaveLength(10);
    expect(sempre.itens[0].pontos).toBe(1200);
    expect(sempre.itens[9].pontos).toBe(300);
  });
});
