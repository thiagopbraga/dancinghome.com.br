import { expect, test } from '@playwright/test';
import { apontar, comecar, esperarCena, soltar } from './helpers';

const NEGATIVAS = /errou|errado|ruim|perdeu|péssim|fraco|falhou|que pena|não conseguiu/i;

test('etapa 5: uma partida inteira só com gestos, do menu ao resultado', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await comecar(page, 'sim=1&fim=28');
  await esperarCena(page, 'menu');
  await page.waitForFunction(() => window.__ensaio!.pose().pessoas === 1);
  await page.screenshot({ path: 'tests/e2e/screens/etapa5-menu.png' });

  await apontar(page, 'jogar');
  await esperarCena(page, 'musicas');
  await soltar(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/screens/etapa5-musicas.png' });
  await apontar(page, 'musica-ensaio-aquecimento');
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'facil'));
  await soltar(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/screens/etapa5-nivel.png' });
  await apontar(page, 'facil');
  await esperarCena(page, 'calibracao');
  await soltar(page);
  await page.screenshot({ path: 'tests/e2e/screens/etapa5-calibracao.png' });
  await esperarCena(page, 'contagem');
  await page.screenshot({ path: 'tests/e2e/screens/etapa5-contagem.png' });
  await esperarCena(page, 'danca');

  // pausa com as duas mãos para o alto, e volta escolhendo "Continuar" com a mão
  await page.waitForFunction(() => window.__ensaio!.resultados().length >= 1);
  await page.evaluate(() => window.__ensaio!.gesto({ tipo: 'maosProAlto' }));
  await page.waitForFunction(() => window.__ensaio!.danca()?.pausado === true);
  const parado = await page.evaluate(() => window.__ensaio!.beat());
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => window.__ensaio!.beat())).toBeCloseTo(parado, 1);
  await page.screenshot({ path: 'tests/e2e/screens/etapa5-pausa.png' });
  await apontar(page, 'continuar');
  await page.waitForFunction(() => window.__ensaio!.danca()?.pausado === false);
  await soltar(page);

  await esperarCena(page, 'resultado', 60_000);
  const cena = await page.evaluate(() => {
    const c = window.__ensaio!.cenaAtual() as { report: { resumos: { stars: number }[] } };
    return c.report.resumos.map((r) => r.stars);
  });
  expect(cena[0]).toBeGreaterThanOrEqual(1);
  const falas = await page.evaluate(() => window.__ensaio!.falas());
  expect(falas.length).toBeGreaterThan(0);
  for (const f of falas) expect(f).not.toMatch(NEGATIVAS);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: 'tests/e2e/screens/etapa5-resultado.png' });

  // e volta ao menu com a mão
  await apontar(page, 'menu');
  await esperarCena(page, 'menu');
  expect(erros).toEqual([]);
});

test('etapa 5: quem não acerta nenhuma pose ainda ganha 1 estrela e só ouve incentivo', async ({ page }) => {
  await comecar(page, 'sim=1&cena=danca&fim=20');
  await esperarCena(page, 'danca');
  await page.evaluate(() => window.__ensaio!.roteiro({ errar: -60 }));
  await esperarCena(page, 'resultado', 60_000);
  const estrelas = await page.evaluate(() => {
    const c = window.__ensaio!.cenaAtual() as { report: { resumos: { stars: number }[] } };
    return c.report.resumos[0].stars;
  });
  expect(estrelas).toBe(1);
  const falas = await page.evaluate(() => window.__ensaio!.falas());
  for (const f of falas) expect(f).not.toMatch(NEGATIVAS);
});

test('etapa 5: a calibração espera o corpo inteiro aparecer', async ({ page }) => {
  await comecar(page, 'sim=1&cena=calibracao');
  await esperarCena(page, 'calibracao');
  await page.waitForFunction(() => !!window.__ensaio!.sim());
  await page.evaluate(() => (window.__ensaio!.sim()!.scripts[0].ausente = true));
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => window.__ensaio!.cena())).toBe('calibracao');
  await page.evaluate(() => (window.__ensaio!.sim()!.scripts[0].ausente = false));
  await esperarCena(page, 'contagem');
});
