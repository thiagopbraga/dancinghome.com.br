import { expect, test } from '@playwright/test';

test('etapa 4: o site abre em /, sem nenhuma requisição a terceiros, e leva ao jogo em /jogar/', async ({
  page,
}) => {
  const terceiros: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    if (url.protocol.startsWith('http') && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
      terceiros.push(req.url());
    }
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Ensaio de Dança/);
  await expect(page.locator('#hero-titulo')).toHaveText('Ensaio de Dança');
  await expect(page.locator('#hero-jogar')).toHaveAttribute('href', '/jogar/');
  await expect(page.locator('#hero-placar')).toContainText('Dance e apareça aqui!');
  await expect(page.locator('#como-funciona')).toContainText('Apoie o celular');
  await expect(page.locator('#privacidade')).toContainText('A câmera não sai do aparelho');
  await expect(page.locator('#para-os-pais')).toContainText('Pausa para beber água');

  await page.click('a[href="/privacidade"]');
  await expect(page.locator('h1')).toHaveText('Política de Privacidade');
  await expect(page.locator('#resumo-criancas')).toContainText('Para crianças (em 3 frases)');

  await page.click('a[href="/contribuir"]');
  await expect(page.locator('h1')).toHaveText('Como Contribuir');

  expect(terceiros).toEqual([]);
});

test('etapa 4: o site funciona com JavaScript desligado', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('#hero-titulo')).toHaveText('Ensaio de Dança');
  await expect(page.locator('#hero-jogar')).toBeVisible();
  await expect(page.locator('#hero-placar')).toContainText('Dance e apareça aqui!');
  await ctx.close();
});
