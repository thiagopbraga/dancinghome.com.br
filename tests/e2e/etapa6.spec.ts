import { expect, test } from '@playwright/test';
import { apontar, clicarBotao, comecar, esperarCena, soltar } from './helpers';

test('etapa 6: o progresso continua depois de recarregar a página', async ({ page }) => {
  await comecar(page, 'sim=1&cena=danca&fim=20');
  await esperarCena(page, 'resultado', 60_000);
  await page.waitForFunction(() => !!window.__ensaio!.progresso().melhores['ensaio-aquecimento:facil']);
  const antes = await page.evaluate(() => window.__ensaio!.progresso());
  expect(antes.melhores['ensaio-aquecimento:facil'].estrelas).toBe(3);
  expect(antes.musicasTocadas).toBe(1);

  await page.reload();
  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  await page.goto('/jogar/?sim=1');
  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  await clicarBotao(page, 'comecar');
  await esperarCena(page, 'menu');
  const depois = await page.evaluate(() => window.__ensaio!.progresso());
  expect(depois).toEqual(antes);
  expect(await page.evaluate(() => window.__ensaio!.game.totalStars())).toBe(3);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/e2e/screens/etapa6-menu-com-estrelas.png' });
});

test('etapa 6: sem voz pt-BR a frase aparece na tela', async ({ page }) => {
  await comecar(page, 'sim=1&semvoz=1');
  await esperarCena(page, 'menu');
  await expect.poll(() => page.evaluate(() => window.__ensaio!.legenda())).toBeTruthy();
  const legenda = await page.evaluate(() => window.__ensaio!.legenda());
  expect(await page.evaluate(() => window.__ensaio!.falas())).toContain(legenda);
  await page.screenshot({ path: 'tests/e2e/screens/etapa6-legenda.png' });
});

test('etapa 6: as 5 músicas aparecem com cadeado e a demonstração é jogável', async ({ page }) => {
  await comecar(page, 'sim=1&fim=12');
  await esperarCena(page, 'menu');
  const musicas = await page.evaluate(() =>
    window.__ensaio!.game.songs.map((s) => ({ id: s.id, toca: window.__ensaio!.game.hasAudio(s) })),
  );
  expect(musicas).toEqual([
    { id: 'ensaio-aquecimento', toca: true },
    { id: 'brilho', toca: false },
    { id: 'meu-pequeno-guarana', toca: false },
    { id: 'o-som-da-nossa-voz', toca: false },
    { id: 'letal', toca: false },
    { id: 'nao-tem-perdao', toca: false },
  ]);
  await apontar(page, 'jogar');
  await esperarCena(page, 'musicas');
  // música com cadeado: o jogo pede um adulto e fica na mesma tela
  await apontar(page, 'musica-brilho');
  await expect
    .poll(() => page.evaluate(() => window.__ensaio!.falas()))
    .toContain('Peça para um adulto carregar a música.');
  expect(await page.evaluate(() => window.__ensaio!.cena())).toBe('musicas');
  await soltar(page);
  await clicarBotao(page, 'proxima');
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'musica-nao-tem-perdao'));
  await page.screenshot({ path: 'tests/e2e/screens/etapa6-musicas-2.png' });
  await clicarBotao(page, 'anterior');
  await apontar(page, 'musica-ensaio-aquecimento');
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'facil'));
  await apontar(page, 'facil');
  await esperarCena(page, 'danca', 30_000);
  await soltar(page);
  await esperarCena(page, 'resultado', 60_000);
  // no fácil, o narrador diz o nome da pose quando o cartão aparece
  expect(await page.evaluate(() => window.__ensaio!.falas())).toContain('Braços pra Cima');
});

test('etapa 6: depois de 3 músicas seguidas vem a dica de água', async ({ page }) => {
  await comecar(page, 'sim=1&cena=danca&fim=6');
  for (let i = 0; i < 3; i++) {
    await esperarCena(page, 'resultado', 60_000);
    await page.waitForFunction((n) => window.__ensaio!.progresso().musicasTocadas === n, i + 1);
    if (i < 2) {
      expect(await page.evaluate(() => window.__ensaio!.falas())).not.toContain(
        'Hora de beber água e descansar um pouquinho!',
      );
      await page.waitForTimeout(2300);
      await clicarBotao(page, 'deNovo');
      await esperarCena(page, 'danca', 30_000);
    }
  }
  await expect
    .poll(() => page.evaluate(() => window.__ensaio!.falas()))
    .toContain('Hora de beber água e descansar um pouquinho!');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'tests/e2e/screens/etapa6-agua.png' });
});
