import { expect, test } from '@playwright/test';
import { apontar, clicarBotao, comecar, esperarCena, estrelasDoResultado, soltar } from './helpers';

test('etapa 9: gravar 16 batidas gera uma fase jogável que aparece no menu', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await comecar(page, 'sim=1&fim=16');
  await esperarCena(page, 'menu');
  await apontar(page, 'criar');
  await esperarCena(page, 'gravador');
  await soltar(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/screens/etapa9-escolha.png' });
  await apontar(page, 'musica-ensaio-aquecimento');
  await page.waitForFunction(() => window.__ensaio!.cenaAtual().fase === 'contagem');
  // 1º retrato: braços abertos (já existe no catálogo como "Estrela")
  await page.evaluate(() =>
    window.__ensaio!.gesto({
      tipo: 'pose',
      angles: { lShoulder: 92, rShoulder: 88, lElbow: 170, rElbow: 170 },
    }),
  );
  const retratos = (n: number) =>
    page.waitForFunction((k) => (window.__ensaio!.cenaAtual().snaps as unknown[]).length >= k, n);
  await retratos(1);
  await page.screenshot({ path: 'tests/e2e/screens/etapa9-gravando.png' });
  // 2º retrato: uma pose inventada
  await page.evaluate(() =>
    window.__ensaio!.gesto({
      tipo: 'pose',
      angles: { lShoulder: 60, rShoulder: 120, lElbow: 90, rElbow: 90 },
    }),
  );
  await retratos(2);
  // 3º retrato: parada, com os braços soltos (é descartado)
  await soltar(page);
  await page.waitForFunction(() => window.__ensaio!.cenaAtual().fase === 'revisao', undefined, {
    timeout: 30_000,
  });
  const vistos = await page.evaluate(() =>
    (window.__ensaio!.cenaAtual().retratos as { beat: number; pose: string }[]).map((r) => ({ ...r })),
  );
  expect(vistos.map((r) => r.beat)).toEqual([4, 8]);
  expect(vistos[0].pose).toBe('estrela');
  expect(vistos[1].pose).toMatch(/^minha-.+-1$/);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/screens/etapa9-revisao.png' });

  // tirar um retrato deixa só 1 pose: não dá para salvar; colocar de volta libera
  await clicarBotao(page, 'retrato-1');
  expect(await page.evaluate(() => window.__ensaio!.botoes().find((b) => b.id === 'salvar')!.disabled)).toBe(
    true,
  );
  await clicarBotao(page, 'retrato-1');

  // o adulto (ou ela) dá nome à dança e à pose nova
  await clicarBotao(page, 'nomes');
  await page.fill('#gravador-nomes input[data-nome="danca"]', 'Dança da Lua');
  await page.fill(`#gravador-nomes input[data-nome="${vistos[1].pose}"]`, 'Pose da Lua');
  await page.screenshot({ path: 'tests/e2e/screens/etapa9-nomes.png' });
  await page.click('#nomes-ok');
  await apontar(page, 'salvar');
  await esperarCena(page, 'musicas');
  await soltar(page);

  const fase = await page.evaluate(() => {
    const g = window.__ensaio!.game;
    const s = g.songs.find((x) => x.origem === 'gravada')!;
    return {
      id: s.id,
      title: s.title,
      audioDe: s.audioDe,
      eventos: s.niveis.facil!.eventos,
      toca: g.hasAudio(s),
    };
  });
  expect(fase.title).toBe('Dança da Lua');
  expect(fase.audioDe).toBe('ensaio-aquecimento');
  expect(fase.toca).toBe(true);
  expect(fase.eventos).toEqual([
    { beat: 4, pose: 'estrela' },
    { beat: 8, pose: vistos[1].pose },
  ]);
  expect(await page.evaluate((id) => window.__ensaio!.game.catalog[id].nome, vistos[1].pose)).toBe(
    'Pose da Lua',
  );
  expect(await page.evaluate(() => window.__ensaio!.progresso().gravadas)).toBe(1);
  expect(await page.evaluate(() => window.__ensaio!.progresso().conquistas)).toContain('coreografa');

  // a fase nova está no menu de músicas e dá para dançar
  await page.waitForFunction((id) => window.__ensaio!.botoes().some((b) => b.id === `musica-${id}`), fase.id);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/screens/etapa9-no-menu.png' });
  await apontar(page, `musica-${fase.id}`);
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'facil'));
  await apontar(page, 'facil');
  await esperarCena(page, 'danca', 30_000);
  await soltar(page);
  await estrelasDoResultado(page);
  const res = await page.evaluate(() => window.__ensaio!.resultados());
  expect(res.map((r) => r.pose)).toEqual(['estrela', vistos[1].pose]);
  expect(res.every((r) => r.rating === 'perfeito')).toBe(true);

  // e continua lá depois de recarregar
  await page.goto('/jogar/?sim=1');
  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  expect(
    await page.evaluate(() => window.__ensaio!.game.songs.filter((s) => s.origem === 'gravada').length),
  ).toBe(1);
  expect(erros).toEqual([]);
});

test('etapa 9: no treino a música toca a 0,5x e só avança depois da pose', async ({ page }) => {
  await comecar(page, 'sim=1&fim=10');
  await esperarCena(page, 'menu');
  await apontar(page, 'treino');
  await esperarCena(page, 'musicas');
  await apontar(page, 'musica-ensaio-aquecimento');
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'facil'));
  // no treino não há dupla nem estátua
  expect(await page.evaluate(() => window.__ensaio!.botoes().map((b) => b.id))).not.toContain('dupla');
  await apontar(page, 'facil');
  await esperarCena(page, 'danca', 30_000);
  // ela fica parada, com os braços soltos: a música espera na batida da pose
  await page.evaluate(() => window.__ensaio!.gesto({ tipo: 'pose', angles: {} }));
  expect(await page.evaluate(() => window.__ensaio!.game.audio.clock!.rate)).toBe(0.5);
  await page.waitForFunction(() => window.__ensaio!.danca()?.esperando === true, undefined, {
    timeout: 30_000,
  });
  const parada = await page.evaluate(() => window.__ensaio!.beat());
  expect(parada).toBeGreaterThanOrEqual(4);
  expect(parada).toBeLessThan(4.3);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__ensaio!.danca()!.esperando)).toBe(true);
  expect(await page.evaluate(() => window.__ensaio!.beat())).toBeCloseTo(parada, 2);
  await page.screenshot({ path: 'tests/e2e/screens/etapa9-treino.png' });
  // quando ela faz a pose, a música continua
  await soltar(page);
  await page.waitForFunction(() => window.__ensaio!.danca()?.esperando === false);
  await page.waitForFunction((b) => window.__ensaio!.beat() > b + 0.5, parada);
  await estrelasDoResultado(page);
  const p = await page.evaluate(() => window.__ensaio!.progresso());
  expect(p.treinos).toBe(1);
  expect(p.melhores).toEqual({});
});
