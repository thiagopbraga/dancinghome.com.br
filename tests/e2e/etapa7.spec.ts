import { expect, test, type Page } from '@playwright/test';
import { apontar, comecar, esperarCena, estrelasDoResultado, soltar } from './helpers';

async function semRolagem(page: Page): Promise<void> {
  const m = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    sh: document.documentElement.scrollHeight,
    w: window.innerWidth,
    h: window.innerHeight,
    canvas: document.getElementById('palco')!.getBoundingClientRect().toJSON() as DOMRect,
  }));
  expect(m.sw).toBeLessThanOrEqual(m.w);
  expect(m.sh).toBeLessThanOrEqual(m.h);
  expect(m.canvas.width).toBe(m.w);
  expect(m.canvas.height).toBe(m.h);
}

/** Todos os botões da cena cabem inteiros na tela. */
async function botoesNaTela(page: Page): Promise<void> {
  const fora = await page.evaluate(() => {
    const v = window.__ensaio!.game.engine.view;
    return window
      .__ensaio!.botoes()
      .filter((b) => {
        const x0 = (b.x - v.left) * v.scale;
        const y0 = (b.y - v.top) * v.scale;
        const x1 = x0 + b.w * v.scale;
        const y1 = y0 + b.h * v.scale;
        return x0 < 0 || y0 < 0 || x1 > window.innerWidth || y1 > window.innerHeight;
      })
      .map((b) => b.id);
  });
  expect(fora).toEqual([]);
}

test('etapa 7: na vertical aparece o aviso "Gire o celular"', async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto('/?sim=1');
  await expect(page.locator('#gire')).toBeVisible();
  await expect(page.locator('#gire')).toContainText('Gire o celular');
  await page.screenshot({ path: 'tests/e2e/screens/etapa7-gire.png' });
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.locator('#gire')).toBeHidden();
});

test('etapa 7: em 915x412 o jogo cabe sem rolagem, do menu ao resultado', async ({ page }) => {
  await page.setViewportSize({ width: 915, height: 412 });
  await comecar(page, 'sim=1&fim=14');
  await esperarCena(page, 'menu');
  await semRolagem(page);
  await botoesNaTela(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/e2e/screens/etapa7-celular-menu.png' });
  await apontar(page, 'jogar');
  await esperarCena(page, 'musicas');
  await soltar(page);
  await botoesNaTela(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/e2e/screens/etapa7-celular-musicas.png' });
  await apontar(page, 'musica-ensaio-aquecimento');
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'facil'));
  await botoesNaTela(page);
  await apontar(page, 'facil');
  await esperarCena(page, 'danca', 30_000);
  await soltar(page);
  await page.waitForFunction(() => window.__ensaio!.resultados().length >= 1);
  await semRolagem(page);
  await page.screenshot({ path: 'tests/e2e/screens/etapa7-celular-danca.png' });

  // virar o celular no meio da música pausa a dança e mostra o aviso
  await page.setViewportSize({ width: 412, height: 915 });
  await expect(page.locator('#gire')).toBeVisible();
  await page.waitForFunction(() => window.__ensaio!.danca()?.pausado === true);
  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.locator('#gire')).toBeHidden();
  await botoesNaTela(page);
  await apontar(page, 'continuar');
  await page.waitForFunction(() => window.__ensaio!.danca()?.pausado === false);
  await soltar(page);

  await estrelasDoResultado(page);
  await botoesNaTela(page);
  await semRolagem(page);
  await page.waitForTimeout(2400);
  await page.screenshot({ path: 'tests/e2e/screens/etapa7-celular-resultado.png' });
});

test('etapa 7: a tela fica acesa só enquanto a música toca', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __travas: string[] };
    w.__travas = [];
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          w.__travas.push('pediu');
          return {
            release: async () => {
              w.__travas.push('soltou');
            },
            addEventListener: () => undefined,
          };
        },
      },
    });
  });
  await comecar(page, 'sim=1&cena=danca&fim=6');
  await esperarCena(page, 'danca');
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __travas: string[] }).__travas))
    .toEqual(['pediu']);
  await esperarCena(page, 'resultado', 60_000);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __travas: string[] }).__travas))
    .toEqual(['pediu', 'soltou']);
});
