import { expect, test } from '@playwright/test';

// Roda contra o build de produção (vite preview), onde o service worker existe.
test('etapa 7: depois de uma visita, sem rede, o jogo recarrega e abre o menu', async ({ page, context }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  // espera o service worker assumir a página e guardar tudo, incluindo o MediaPipe
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const urls: string[] = [];
          for (const name of await caches.keys()) {
            for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
          }
          return {
            modelo: urls.some((u) => u.includes('pose_landmarker_lite.task')),
            wasm: urls.some((u) => u.includes('.wasm')),
            pagina: urls.some((u) => u.includes('index.html')),
          };
        }),
      { timeout: 60_000 },
    )
    .toEqual({ modelo: true, wasm: true, pagina: true });

  await context.setOffline(true);
  const falhas: string[] = [];
  page.on('requestfailed', (r) => falhas.push(r.url()));
  const doServiceWorker: string[] = [];
  page.on('response', (r) => {
    if (r.fromServiceWorker()) doServiceWorker.push(new URL(r.url()).pathname);
  });
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  // toque em "Começar" (a página tem 1280x720, igual à área do jogo)
  await page.mouse.click(640, 480);
  await page.waitForFunction(() => document.body.dataset.cena === 'menu');
  // a câmera (falsa) liga e o modelo de pose vem do cache
  await expect.poll(() => doServiceWorker.some((p) => p.includes('pose_landmarker_lite.task'))).toBe(true);
  expect(falhas).toEqual([]);
  await page.screenshot({ path: 'tests/e2e/screens/etapa7-offline-menu.png' });
});
