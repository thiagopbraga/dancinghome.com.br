import { expect, test } from '@playwright/test';
import { comecar, esperarCena } from './helpers';

test('etapa 3: com ?sim=1 o esqueleto aparece e se move', async ({ page }) => {
  await comecar(page, 'sim=1&debug=1&cena=esqueleto');
  await esperarCena(page, 'esqueleto');
  await page.waitForFunction(
    () => window.__ensaio!.pose().pessoas === 1 && window.__ensaio!.pose().quadros > 5,
  );
  const antes = await page.evaluate(() => window.__ensaio!.ponto(16));
  expect(antes!.visibility).toBeGreaterThan(0.9);
  // levanta só o braço direito: o pulso sobe e o painel diz "braço direito"
  await page.evaluate(() =>
    window.__ensaio!.gesto({ tipo: 'pose', angles: { rShoulder: 170, lShoulder: 14 } }),
  );
  await page.waitForFunction((y0) => {
    const p = window.__ensaio!.ponto(16);
    return !!p && p.y < y0 - 0.2;
  }, antes!.y);
  await expect.poll(() => page.evaluate(() => window.__ensaio!.debug().at(-1))).toContain('braço direito');
  await page.screenshot({ path: 'tests/e2e/screens/etapa3-esqueleto.png' });
  await page.evaluate(() =>
    window.__ensaio!.gesto({ tipo: 'pose', angles: { lShoulder: 170, rShoulder: 14 } }),
  );
  await expect.poll(() => page.evaluate(() => window.__ensaio!.debug().at(-1))).toContain('braço esquerdo');
});

test('etapa 3: sem permissão de câmera o jogo mostra uma tela amigável', async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () =>
      Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
  });
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await comecar(page, 'test=1&cena=esqueleto');
  await esperarCena(page, 'semCamera');
  expect(await page.evaluate(() => window.__ensaio!.botoes().map((b) => b.id))).toEqual(['tentar']);
  expect(erros).toEqual([]);
  await page.screenshot({ path: 'tests/e2e/screens/etapa3-sem-camera.png' });
});

test('etapa 3: com a câmera (falsa) o MediaPipe carrega do próprio site e entrega quadros', async ({
  page,
}) => {
  const externos: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.hostname !== 'localhost') externos.push(r.url());
  });
  await comecar(page, 'test=1&cena=esqueleto');
  await esperarCena(page, 'esqueleto');
  await page.waitForFunction(() => window.__ensaio!.pose().estado === 'pronta', undefined, {
    timeout: 60_000,
  });
  await page.waitForFunction(() => window.__ensaio!.pose().quadros > 3, undefined, { timeout: 30_000 });
  expect(externos).toEqual([]);
});
