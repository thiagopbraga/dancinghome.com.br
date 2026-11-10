import type { Page } from '@playwright/test';

/** Abre o jogo e toca em "Começar". */
export async function comecar(page: Page, query: string): Promise<void> {
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  await clicarBotao(page, 'comecar');
}

/** Converte coordenadas virtuais (1280x720) para pixels da página. */
export async function paraPagina(page: Page, x: number, y: number): Promise<{ x: number; y: number }> {
  return page.evaluate(
    ([vx, vy]) => {
      const v = window.__ensaio!.game.engine.view;
      return { x: (vx - v.left) * v.scale, y: (vy - v.top) * v.scale };
    },
    [x, y],
  );
}

/** Toque (mouse) no centro de um botão do canvas. */
export async function clicarBotao(page: Page, id: string): Promise<void> {
  await page.waitForFunction((bid) => window.__ensaio?.botoes().some((b) => b.id === bid && !b.disabled), id);
  const b = await page.evaluate((bid) => window.__ensaio!.botoes().find((x) => x.id === bid)!, id);
  const p = await paraPagina(page, b.x + b.w / 2, b.y + b.h / 2);
  await page.mouse.click(p.x, p.y);
}

/** Gesto simulado: segura a mão em cima do botão até a cena mudar ou o botão sumir. */
export async function apontar(page: Page, id: string): Promise<void> {
  await page.waitForFunction((bid) => window.__ensaio?.botoes().some((b) => b.id === bid && !b.disabled), id);
  await page.evaluate((bid) => window.__ensaio!.apontar(bid), id);
}

export async function soltar(page: Page): Promise<void> {
  await page.evaluate(() => window.__ensaio!.gesto(null));
}

export async function esperarCena(page: Page, cena: string, timeout = 30_000): Promise<void> {
  await page.waitForFunction((c) => window.__ensaio?.cena() === c, cena, { timeout });
}

/** Espera a tela de resultado e devolve as estrelas de cada pessoa (o resultado é gravado antes de aparecer). */
export async function estrelasDoResultado(page: Page, timeout = 60_000): Promise<number[]> {
  await esperarCena(page, 'resultado', timeout);
  await page.waitForFunction(() => !!(window.__ensaio!.cenaAtual() as { report: unknown }).report);
  return page.evaluate(() => {
    const c = window.__ensaio!.cenaAtual() as { report: { resumos: { stars: number }[] } };
    return c.report.resumos.map((r) => r.stars);
  });
}

/** Um WAV mono de 16 bits com um clique por batida, para fazer de "música" nos testes. */
export function wavDeTeste(segundos: number, bpm: number, sampleRate = 8000): Buffer {
  const n = Math.floor(segundos * sampleRate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  const beat = (60 / bpm) * sampleRate;
  for (let i = 0; i < n; i++) {
    const p = i % beat;
    const env = Math.exp(-p / (sampleRate * 0.03));
    const v = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * env * 0.6;
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

/** Abre a Área dos Pais como um adulto: segurando o botão por 3 segundos. */
export async function abrirPais(page: Page): Promise<void> {
  await esperarCena(page, 'menu');
  await page.waitForFunction(() => window.__ensaio?.botoes().some((b) => b.id === 'pais'));
  const b = await page.evaluate(() => window.__ensaio!.botoes().find((x) => x.id === 'pais')!);
  const p = await paraPagina(page, b.x + b.w / 2, b.y + b.h / 2);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  // segurar pouco não abre
  if ((await page.evaluate(() => window.__ensaio!.cena())) !== 'menu') throw new Error('abriu antes de 3 s');
  await esperarCena(page, 'pais', 10_000);
  await page.mouse.up();
}
