import { expect, test } from '@playwright/test';
import { comecar, esperarCena } from './helpers';

test('etapa 4: a demonstração no fácil roda do começo ao fim com a pose simulada', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await comecar(page, 'sim=1&cena=danca');
  await esperarCena(page, 'danca');
  const total = await page.evaluate(() => window.__ensaio!.eventos().length);
  expect(total).toBe(15);

  // no meio da música: cartões na pista, espelho e placar
  await page.waitForFunction(() => window.__ensaio!.resultados().length >= 4, undefined, { timeout: 60_000 });
  await page.screenshot({ path: 'tests/e2e/screens/etapa4-danca.png' });

  await esperarCena(page, 'resultado', 90_000);
  const eventos = await page.evaluate(() => window.__ensaio!.eventos().map((e) => e.beat));
  const res = await page.evaluate(() => window.__ensaio!.resultados());
  // todos os eventos avaliados, na ordem da coreografia
  expect(res.map((r) => r.beat)).toEqual(eventos);
  const perfeitos = res.filter((r) => r.rating === 'perfeito').length;
  expect(perfeitos / res.length).toBeGreaterThanOrEqual(0.9);
  expect(erros).toEqual([]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tests/e2e/screens/etapa4-resultado.png' });
});

test('etapa 4: quem erra de propósito recebe nota menor, sem mensagem negativa', async ({ page }) => {
  await comecar(page, 'sim=1&cena=danca&fim=24');
  await esperarCena(page, 'danca');
  await page.evaluate(() => window.__ensaio!.roteiro('acertar', { 0: { errar: 45 }, 1: 'sumir' }));
  await esperarCena(page, 'resultado', 60_000);
  const res = await page.evaluate(() => window.__ensaio!.resultados());
  expect(res.length).toBeGreaterThanOrEqual(3);
  expect(res[0].rating).not.toBe('perfeito');
  expect(['quase', 'tenteiDeNovo']).toContain(res[1].rating);
  expect(res[2].rating).toBe('perfeito');
});
