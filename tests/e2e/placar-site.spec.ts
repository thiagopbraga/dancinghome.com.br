import { expect, test } from '@playwright/test';

test('hero do site (/) renderiza top 5 de /api/destaques e mantém fallback quando vazio ou com erro', async ({
  page,
}) => {
  await page.route('**/api/destaques', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        semana: '2026-W46',
        totalSemana: 12,
        itens: [
          {
            posicao: 1,
            apelido: 'Gatinha Brilhante 27',
            musica: 'ensaio-aquecimento',
            musicaTitulo: 'Aquecimento',
            nivel: 'facil',
            pontos: 1580,
            estrelas: 3,
          },
          {
            posicao: 2,
            apelido: 'Dragão Dançante 54',
            musica: 'ensaio-festa',
            musicaTitulo: 'Festa Estelar',
            nivel: 'normal',
            pontos: 1490,
            estrelas: 3,
          },
        ],
      }),
    });
  });

  await page.goto('/');
  await expect(page.locator('#placar-contador')).toHaveText('12 danças esta semana');
  await expect(page.locator('#hero-placar')).toContainText('Gatinha Brilhante 27');
  await expect(page.locator('#hero-placar')).toContainText('Dragão Dançante 54');
});

test('hero do site (/) mantém "Dance e apareça aqui!" se a API falhar (500)', async ({ page }) => {
  await page.route('**/api/destaques', async (route) => {
    await route.fulfill({ status: 500, body: 'erro' });
  });

  await page.goto('/');
  await expect(page.locator('#hero-placar')).toContainText('Dance e apareça aqui!');
});

test('página /placar filtra por música, nível e período e página /admin/ permite moderar', async ({
  page,
}) => {
  await page.goto('/placar');
  await expect(page.locator('h1')).toHaveText('Placar das Músicas Públicas');
  await expect(page.locator('[data-filtro-musica="ensaio-brisa"]')).toBeVisible();
  await page.click('[data-filtro-musica="ensaio-brisa"]');
  await expect(page.locator('[data-filtro-musica="ensaio-brisa"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.goto('/admin/');
  await expect(page.locator('h1')).toHaveText('Painel de Moderação do Placar');
  await expect(page.locator('#admin-musicas-lista')).toContainText('Aquecimento');
  await expect(page.locator('#admin-musicas-lista')).toContainText('Brisa Solar');
  await expect(page.locator('#admin-musicas-lista')).toContainText('Festa Estelar');
});
