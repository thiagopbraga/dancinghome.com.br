import { expect, test } from '@playwright/test';
import { abrirPais, apontar, clicarBotao, comecar, esperarCena, soltar } from './helpers';

test('placar desligado por padrão: zero chamadas a /api/* durante uma partida inteira', async ({
  page,
}) => {
  const chamadasApi: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).pathname.startsWith('/api/')) {
      chamadasApi.push(req.url());
    }
  });

  await comecar(page, 'sim=1&cena=danca&fim=12');
  await esperarCena(page, 'resultado', 60_000);
  expect(chamadasApi).toEqual([]);
});

test('placar ligado na Área dos Pais: escolha de apelido por gesto e envio da pontuação', async ({
  page,
}) => {
  let enviouPartida = false;
  let corpoPontuacao: Record<string, unknown> | null = null;

  await page.route('**/api/partidas', async (route) => {
    enviouPartida = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, ficha: 'ficha-simulada.assinatura', expiraEm: 9999999999 }),
    });
  });

  await page.route('**/api/pontuacoes', async (route) => {
    corpoPontuacao = JSON.parse(route.request().postData() ?? '{}') as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        id: 1,
        posicaoSemana: 1,
        top10: true,
        semana: '2026-W46',
      }),
    });
  });

  await comecar(page, 'sim=1&fim=12&semente=42');
  await abrirPais(page);

  // Ativa o placar online na Área dos Pais
  const checkbox = page.locator('#cfg-placar');
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();

  await page.click('#pais-voltar');
  await esperarCena(page, 'menu');

  // Inicia a música de demonstração
  await apontar(page, 'jogar');
  await esperarCena(page, 'musicas');
  await apontar(page, 'musica-ensaio-aquecimento');
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'facil'));
  await apontar(page, 'facil');
  await esperarCena(page, 'danca', 30_000);
  await soltar(page);
  await esperarCena(page, 'resultado', 60_000);

  expect(enviouPartida).toBe(true);

  // Na primeira vez sem apelido definido, aparecem 3 sugestões de apelido para escolher com a mão
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'apelido-0'));
  await clicarBotao(page, 'apelido-0');

  // Depois de escolher o apelido, aparece o botão "Mandar para o placar"
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'enviarPlacar'));
  await clicarBotao(page, 'enviarPlacar');

  await expect.poll(() => corpoPontuacao).not.toBeNull();
  expect(typeof corpoPontuacao!['apelido']).toBe('string');
  await expect
    .poll(() => page.evaluate(() => window.__ensaio!.falas()))
    .toContain('Seu nome está no placar da semana!');
});
