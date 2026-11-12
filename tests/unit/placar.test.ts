import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadBaseData } from '../../src/data/songs';
import { defaultSettings } from '../../src/data/storage';
import { defaultConfig } from '../../src/game/match';
import {
  enviarPontuacaoPlacar,
  iniciarPartidaPlacar,
  musicaElegivelPlacar,
} from '../../src/net/placar';
import { criarBancoD1Memoria } from '../../worker/d1Sqlite';
import { handleApiRequest, limparRateLimitsMemoria } from '../../worker/index';

function listarArquivosTs(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...listarArquivosTs(p));
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('Placar no jogo com Porteira dos Pais (Etapa 6)', () => {
  it('vem desligado por padrão nas configurações (placarAtivo = false, apelido = null)', () => {
    const cfg = defaultSettings();
    expect(cfg.placarAtivo).toBe(false);
    expect(cfg.apelido).toBeNull();
  });

  it('não faz nenhuma chamada de rede quando placarAtivo é false', async () => {
    const fetchSpy = vi.fn();
    const ficha = await iniciarPartidaPlacar(
      false,
      { musica: 'ensaio-aquecimento', nivel: 'facil' },
      fetchSpy as unknown as typeof fetch,
    );
    expect(ficha).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();

    const envio = await enviarPontuacaoPlacar(
      false,
      {
        ficha: 'qualquer',
        apelido: 'Gatinha Brilhante 27',
        pontos: 1500,
        estrelas: 3,
        perfeitos: 12,
        poses: 15,
      },
      fetchSpy as unknown as typeof fetch,
    );
    expect(envio).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('avalia corretamente a elegibilidade da partida para o placar público', () => {
    const { songs } = loadBaseData();
    const demo = songs.find((s) => s.id === 'ensaio-aquecimento')!;
    const brisa = songs.find((s) => s.id === 'ensaio-brisa')!;
    const brilho = songs.find((s) => s.id === 'brilho')!;

    expect(musicaElegivelPlacar(defaultConfig('ensaio-aquecimento'), demo)).toBe(true);
    expect(musicaElegivelPlacar(defaultConfig('ensaio-brisa'), brisa)).toBe(true);

    // Músicas caseiras (origem: base) nunca entram no placar público
    expect(musicaElegivelPlacar(defaultConfig('brilho'), brilho)).toBe(false);

    // Modo treino, dupla, estátua ou história nunca entram no placar público
    expect(
      musicaElegivelPlacar({ ...defaultConfig('ensaio-aquecimento'), modo: 'treino' }, demo),
    ).toBe(false);
    expect(
      musicaElegivelPlacar({ ...defaultConfig('ensaio-aquecimento'), dupla: true }, demo),
    ).toBe(false);
    expect(
      musicaElegivelPlacar({ ...defaultConfig('ensaio-aquecimento'), estatua: true }, demo),
    ).toBe(false);
    expect(
      musicaElegivelPlacar({ ...defaultConfig('ensaio-aquecimento'), historia: 0 }, demo),
    ).toBe(false);
  });

  it('integra iniciarPartidaPlacar e enviarPontuacaoPlacar com o Worker real quando placarAtivo é true', async () => {
    limparRateLimitsMemoria();
    let relogioMs = Date.UTC(2026, 10, 10, 18, 0, 0);
    const env = {
      DB: criarBancoD1Memoria(),
      FICHA_SEGREDO: 'segredo-integracao-jogo-worker',
    };

    const fetchLocal: typeof fetch = async (input, init) => {
      const path = typeof input === 'string' ? input : input.toString();
      const req = new Request(`https://ensaiodedanca.com.br${path}`, init);
      return handleApiRequest(req, env, undefined, { now: () => relogioMs });
    };

    const ficha = await iniciarPartidaPlacar(
      true,
      { musica: 'ensaio-brisa', nivel: 'facil' },
      fetchLocal,
    );
    expect(ficha).not.toBeNull();

    // Avança o tempo de dança de Brisa Solar (38.400 ms)
    relogioMs += 38_000;

    const resposta = await enviarPontuacaoPlacar(
      true,
      {
        ficha: ficha!,
        apelido: 'Dragão Dançante 54',
        pontos: 1620,
        estrelas: 3,
        perfeitos: 13,
        poses: 15,
      },
      fetchLocal,
    );
    expect(resposta).toMatchObject({
      ok: true,
      posicaoSemana: 1,
      top10: true,
    });
  });

  it('garante que src/net/placar.ts é o único arquivo em src/ que chama /api/', () => {
    const srcDir = resolve(process.cwd(), 'src');
    const arquivos = listarArquivosTs(srcDir);
    const comApi = arquivos.filter((arq) => readFileSync(arq, 'utf-8').includes('/api/'));
    expect(comApi).toEqual([resolve(srcDir, 'net/placar.ts')]);
  });
});
