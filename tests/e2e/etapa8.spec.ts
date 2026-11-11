import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import {
  abrirPais,
  apontar,
  clicarBotao,
  comecar,
  esperarCena,
  estrelasDoResultado,
  soltar,
  wavDeTeste,
} from './helpers';

const WAV = { name: 'brilho-teste.wav', mimeType: 'audio/wav', buffer: wavDeTeste(40, 123) };

test('etapa 8: carregar um áudio libera a música no menu', async ({ page }) => {
  await comecar(page, 'sim=1&fim=10');
  await abrirPais(page);
  await page.screenshot({ path: 'tests/e2e/screens/etapa8-pais.png' });
  await expect(page.locator('#pais-musicas')).toContainText('não é enviado para lugar nenhum');
  await expect(page.locator('[data-linha="brilho"]')).toContainText('sem áudio');
  await page.setInputFiles('input[data-musica="brilho"]', WAV);
  await expect(page.locator('[data-linha="brilho"]')).toContainText('com áudio');
  const brilho = await page.evaluate(() => {
    const g = window.__ensaio!.game;
    const s = g.song('brilho')!;
    return { toca: g.hasAudio(s), dur: s.duracaoBeats, calibrado: s.calibrado };
  });
  // 40 s a 123 BPM = 82 batidas
  expect(brilho).toEqual({ toca: true, dur: 82, calibrado: false });

  await page.click('#pais-voltar');
  await esperarCena(page, 'menu');
  await apontar(page, 'jogar');
  await esperarCena(page, 'musicas');
  await soltar(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/e2e/screens/etapa8-musica-liberada.png' });
  await apontar(page, 'musica-brilho');
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'facil'));
  await apontar(page, 'facil');
  await esperarCena(page, 'danca', 30_000);
  await soltar(page);
  expect(await page.evaluate(() => window.__ensaio!.game.audio.clock?.bpm)).toBe(123);
  const estrelas = await estrelasDoResultado(page);
  expect(estrelas[0]).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(() => Object.keys(window.__ensaio!.progresso().melhores))).toEqual([
    'brilho:facil',
  ]);
});

test('etapa 8: marcar as partes grava "calibrado": true e continua depois de recarregar', async ({
  page,
}) => {
  await comecar(page, 'sim=1');
  await abrirPais(page);
  await page.setInputFiles('input[data-musica="brilho"]', WAV);
  await page.click('[data-editar="brilho"]');
  await expect(page.locator('h1')).toContainText('Marcar partes · Brilho');
  await page.click('#ed-tocar');
  await page.waitForFunction(() => (window.__ensaio!.game.audio.clock?.beat() ?? 0) > 1);
  const ticks = await page.evaluate(() => window.__ensaio!.sons().tick ?? 0);
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1300);
    await page.keyboard.press('Space');
  }
  // o metrônomo clicou por cima da música
  expect(await page.evaluate(() => window.__ensaio!.sons().tick ?? 0)).toBeGreaterThan(ticks + 5);
  const marcas = await page.$$eval('input[data-marca]', (els) =>
    els.map((e) => Number((e as HTMLInputElement).value)),
  );
  expect(marcas).toHaveLength(5);
  for (let i = 1; i < 5; i++) expect(marcas[i]).toBeGreaterThan(marcas[i - 1]);
  expect(marcas.every((m) => Number.isInteger(m))).toBe(true);
  await page.screenshot({ path: 'tests/e2e/screens/etapa8-editor.png' });
  await page.fill('#ed-offset-num', '120');
  await page.dispatchEvent('#ed-offset-num', 'change');
  await page.click('#ed-salvar');
  await expect(page.locator('#pais-aviso')).toContainText('guardadas');
  await expect(page.locator('[data-linha="brilho"]')).toContainText('partes marcadas');

  const ler = () =>
    page.evaluate(() => {
      const s = window.__ensaio!.game.song('brilho')!;
      return {
        calibrado: s.calibrado,
        offsetMs: s.offsetMs,
        secoes: s.niveis.normal!.secoes!.slice(0, 5).map((x) => x.inicioBeat),
        toca: window.__ensaio!.game.hasAudio(s),
      };
    });
  const salvo = await ler();
  expect(salvo).toEqual({ calibrado: true, offsetMs: 120, secoes: marcas, toca: true });

  await page.goto('/jogar/?sim=1');
  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  expect(await ler()).toEqual(salvo);

  // e dá para voltar às marcações que vêm com o jogo
  await clicarBotao(page, 'comecar');
  await abrirPais(page);
  await page.click('[data-editar="brilho"]');
  await page.click('#ed-original');
  await expect(page.locator('#pais-aviso')).toContainText('voltaram');
  expect((await ler()).calibrado).toBe(false);
});

test('etapa 8: regravar uma pose troca os ângulos pelos medidos', async ({ page }) => {
  await comecar(page, 'sim=1');
  await abrirPais(page);
  await page.click('[data-regravar="estrela"]');
  await esperarCena(page, 'gravarPose');
  await page.waitForFunction(() => window.__ensaio!.pose().pessoas === 1);
  await page.evaluate(() =>
    window.__ensaio!.gesto({
      tipo: 'pose',
      angles: { lShoulder: 110, rShoulder: 70, lElbow: 150, rElbow: 160 },
    }),
  );
  await clicarBotao(page, 'gravar');
  await page.waitForFunction(() => window.__ensaio!.cenaAtual().fase === 'gravando');
  await page.screenshot({ path: 'tests/e2e/screens/etapa8-gravar-pose.png' });
  await page.waitForFunction(() => window.__ensaio!.cenaAtual().fase === 'feita', undefined, {
    timeout: 15_000,
  });
  await clicarBotao(page, 'guardar');
  await esperarCena(page, 'pais');
  await expect(page.locator('#pais-aviso')).toContainText('Estrela');
  const a = await page.evaluate(() => window.__ensaio!.game.catalog.estrela.angles);
  expect(Object.keys(a).sort()).toEqual(['lElbow', 'lShoulder', 'rElbow', 'rShoulder']);
  expect(Math.abs(a.lShoulder! - 110)).toBeLessThanOrEqual(3);
  expect(Math.abs(a.rShoulder! - 70)).toBeLessThanOrEqual(3);
  expect(Math.abs(a.lElbow! - 150)).toBeLessThanOrEqual(3);
  expect(Math.abs(a.rElbow! - 160)).toBeLessThanOrEqual(3);
  await expect(page.locator('[data-pose="estrela"]')).toContainText('regravada');
  await page.click('[data-restaurar="estrela"]');
  await expect(page.locator('[data-restaurar="estrela"]')).toHaveCount(0);
  await expect(page.locator('[data-pose="estrela"]')).toContainText('original');
  expect(await page.evaluate(() => window.__ensaio!.game.catalog.estrela.angles.lShoulder)).toBe(90);
});

test('etapa 8: exportar e importar devolve os mesmos dados', async ({ page, browser }) => {
  await comecar(page, 'sim=1');
  await abrirPais(page);
  await page.evaluate(async () => {
    const g = window.__ensaio!.game;
    await g.saveProgress({
      ...g.progress,
      melhores: { 'brilho:facil': { estrelas: 3, pct: 0.9, pontos: 1234 } },
      musicasTocadas: 7,
    });
    await g.store!.savePose('estrela', { ...g.catalog.estrela, angles: { lShoulder: 100, rShoulder: 95 } });
  });
  await page.selectOption('#cfg-modelo', 'full');
  await page.fill('[data-limite="perfeito"]', '25');
  await page.dispatchEvent('[data-limite="perfeito"]', 'change');
  await expect(page.locator('#pais-aviso')).toContainText('Limites guardados');
  // limite fora de ordem é recusado
  await page.fill('[data-limite="quase"]', '10');
  await page.dispatchEvent('[data-limite="quase"]', 'change');
  await expect(page.locator('#pais-aviso')).toContainText('precisam crescer');
  await page.setInputFiles('input[data-musica="letal"]', { ...WAV, name: 'letal.wav' });
  await expect(page.locator('[data-linha="letal"]')).toContainText('com áudio');

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#pais-exportar')]);
  expect(download.suggestedFilename()).toBe('ensaio-de-danca-dados.json');
  const texto = readFileSync(await download.path(), 'utf8');
  const dados = JSON.parse(texto);
  expect(dados.progress.musicasTocadas).toBe(7);
  expect(dados.settings.modelo).toBe('full');
  expect(dados.settings.limites).toEqual({ perfeito: 25, muitoBem: 35, quase: 55 });
  expect(dados.poses.estrela.angles).toEqual({ lShoulder: 100, rShoulder: 95 });
  // o áudio não entra no arquivo
  expect(texto).not.toContain('letal.wav');
  expect(texto.length).toBeLessThan(200_000);

  // outro aparelho (contexto novo, banco vazio): importar e exportar de novo dá o mesmo arquivo
  const outro = await browser.newContext({
    baseURL: 'http://localhost:5173',
    permissions: ['camera'],
    acceptDownloads: true,
  });
  const p2 = await outro.newPage();
  await comecar(p2, 'sim=1');
  await abrirPais(p2);
  await p2.setInputFiles('#pais-importar', {
    name: 'dados.json',
    mimeType: 'application/json',
    buffer: Buffer.from(texto),
  });
  await expect(p2.locator('#pais-aviso')).toContainText('Dados importados');
  expect(await p2.evaluate(() => window.__ensaio!.game.settings.modelo)).toBe('full');
  expect(await p2.evaluate(() => window.__ensaio!.game.totalStars())).toBe(3);
  const [d2] = await Promise.all([p2.waitForEvent('download'), p2.click('#pais-exportar')]);
  expect(JSON.parse(readFileSync(await d2.path(), 'utf8'))).toEqual(dados);
  // arquivo errado: mensagem clara e nada muda
  await p2.setInputFiles('#pais-importar', {
    name: 'x.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"app":"outro"}'),
  });
  await expect(p2.locator('#pais-aviso')).toContainText('não parece ser do Ensaio de Dança');
  expect(await p2.evaluate(() => window.__ensaio!.game.totalStars())).toBe(3);
  await outro.close();
});
