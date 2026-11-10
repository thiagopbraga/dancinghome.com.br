import { expect, test } from '@playwright/test';

test('etapa 0: a página abre com o título e um canvas em tela cheia', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Ensaio de Dança');
  const canvas = page.locator('#palco');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBe(1280);
  expect(box?.height).toBe(720);
});
