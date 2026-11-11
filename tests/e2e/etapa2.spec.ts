import { expect, test } from '@playwright/test';

test('etapa 2: com a música de demonstração, o relógio avança 2 batidas por segundo', async ({ page }) => {
  await page.goto('/jogar/?test=1&cena=metronomo');
  await page.waitForFunction(() => {
    const a = window.__ensaio?.amostra();
    return !!a && a.tocando && a.beat > 1;
  });
  const medidas = await page.evaluate(async () => {
    const api = window.__ensaio!;
    const out: { ctx: number; beat: number }[] = [];
    for (let i = 0; i < 6; i++) {
      out.push(api.amostra());
      await new Promise((r) => setTimeout(r, 700));
    }
    return out;
  });
  const first = medidas[0];
  for (const m of medidas.slice(1)) {
    const segundos = m.ctx - first.ctx;
    const batidas = m.beat - first.beat;
    // 120 BPM = 2 batidas por segundo; erro abaixo de 50 ms
    expect(Math.abs(batidas / 2 - segundos)).toBeLessThan(0.05);
    expect(batidas).toBeGreaterThan(1);
  }
  // e o relógio de áudio acompanha o relógio de parede
  const parede = await page.evaluate(async () => {
    const api = window.__ensaio!;
    const t0 = performance.now();
    const b0 = api.beat();
    await new Promise((r) => setTimeout(r, 2000));
    return { ms: performance.now() - t0, batidas: api.beat() - b0 };
  });
  expect(Math.abs(parede.batidas / 2 - parede.ms / 1000)).toBeLessThan(0.05);
  await page.screenshot({ path: 'tests/e2e/screens/etapa2-metronomo.png' });
});
