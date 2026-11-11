import { expect, test } from '@playwright/test';

// Roda contra o build de produção (vite preview), onde o service worker e os cabeçalhos CSP existem.
test('etapa 7: depois de uma visita, sem rede, o jogo recarrega em /jogar/ com CSP ativa e abre o menu', async ({
  page,
  context,
}) => {
  const cspViolations: string[] = [];
  await page.addInitScript(() => {
    window.addEventListener('securitypolicyviolation', (e) => {
      // O glue do Emscripten (vision_wasm_internal.js) testa `new Function(...)` dentro de um
      // try/catch e usa fallback automático quando a CSP bloqueia 'unsafe-eval' (mantendo 'wasm-unsafe-eval').
      if (e.blockedURI === 'eval') return;
      (window as unknown as { __csp?: string[] }).__csp ??= [];
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective}:${e.blockedURI}`);
    });
  });

  const resp = await page.goto('/jogar/');
  expect(resp).not.toBeNull();
  const headers = resp!.headers();
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['content-security-policy']).toContain("'wasm-unsafe-eval'");
  expect(headers['content-security-policy']).toContain('https://www.youtube-nocookie.com');
  expect(headers['permissions-policy']).toContain('camera=(self)');
  expect(headers['referrer-policy']).toBe('no-referrer');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');

  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  // espera o service worker assumir a página com escopo /jogar/ e guardar tudo, incluindo o MediaPipe
  const scope = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return new URL(reg.scope).pathname;
  });
  expect(scope).toBe('/jogar/');

  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const urls: string[] = [];
          for (const name of await caches.keys()) {
            for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
          }
          return {
            modelo: urls.some((u) => u.includes('/jogar/mediapipe/pose_landmarker_lite.task')),
            wasm: urls.some((u) => u.includes('/jogar/mediapipe/wasm/') && u.includes('.wasm')),
            pagina: urls.some((u) => u.includes('/jogar/index.html')),
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
  const pageCsp = await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
  expect([...cspViolations, ...pageCsp]).toEqual([]);
  await page.screenshot({ path: 'tests/e2e/screens/etapa7-offline-menu.png' });
});
