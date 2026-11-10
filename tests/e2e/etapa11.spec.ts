import { expect, test, type Page } from '@playwright/test';
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

const WAV = { name: 'musica.wav', mimeType: 'audio/wav', buffer: wavDeTeste(40, 123) };

async function escolherDemo(page: Page, modo?: 'dupla' | 'estatua'): Promise<void> {
  await esperarCena(page, 'menu');
  await apontar(page, 'jogar');
  await esperarCena(page, 'musicas');
  await apontar(page, 'musica-ensaio-aquecimento');
  await page.waitForFunction(() => window.__ensaio!.botoes().some((b) => b.id === 'facil'));
  if (modo) {
    await apontar(page, modo);
    await page.waitForFunction(
      (m) => (window.__ensaio!.game.engine.scene as unknown as Record<string, boolean>)[m] === true,
      modo,
    );
    await soltar(page);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `tests/e2e/screens/etapa11-nivel-${modo}.png` });
  }
  await apontar(page, 'facil');
}

test('etapa 11: no modo dupla, duas pessoas simuladas recebem duas notas', async ({ page }) => {
  await comecar(page, 'sim=1&fim=24');
  await escolherDemo(page, 'dupla');
  await esperarCena(page, 'calibracao');
  await soltar(page);
  await page.waitForFunction(() => window.__ensaio!.pose().pessoas === 2);
  await esperarCena(page, 'danca', 30_000);
  // a segunda pessoa erra as poses de propósito
  await page.evaluate(() => window.__ensaio!.roteiro({ errar: -60 }, {}, 1));
  await page.waitForFunction(() => window.__ensaio!.resultados(0).length >= 2);
  await page.screenshot({ path: 'tests/e2e/screens/etapa11-dupla.png' });
  const estrelas = await estrelasDoResultado(page);
  expect(estrelas).toHaveLength(2);
  const notas = await page.evaluate(() => {
    const soma = (p: number) => window.__ensaio!.resultados(p).reduce((s, r) => s + r.points, 0);
    return {
      a: soma(0),
      b: soma(1),
      n: [window.__ensaio!.resultados(0).length, window.__ensaio!.resultados(1).length],
    };
  });
  expect(notas.n[0]).toBe(notas.n[1]);
  expect(notas.n[0]).toBeGreaterThanOrEqual(4);
  // uma acertou tudo, a outra não: notas diferentes, e as duas com pelo menos 1 estrela
  expect(Math.max(notas.a, notas.b)).toBe(100 * notas.n[0]);
  expect(Math.min(notas.a, notas.b)).toBeLessThan(60 * notas.n[0]);
  expect(Math.max(...estrelas)).toBe(3);
  expect(Math.min(...estrelas)).toBe(1);
  expect(await page.evaluate(() => window.__ensaio!.progresso().duplas)).toBe(1);
  await page.waitForTimeout(2400);
  await page.screenshot({ path: 'tests/e2e/screens/etapa11-dupla-resultado.png' });
});

test('etapa 11: as conquistas liberam com progresso falso e aparecem no álbum', async ({ page }) => {
  await comecar(page, 'sim=1');
  await esperarCena(page, 'menu');
  await apontar(page, 'album');
  await esperarCena(page, 'album');
  await soltar(page);
  expect(await page.evaluate(() => (window.__ensaio!.cenaAtual().ganhas as () => string[])())).toEqual([]);
  await page.evaluate(async () => {
    await window.__ensaio!.setProgresso({
      musicasTocadas: 10,
      maiorSequencia: 5,
      perfeitos: 49,
      duplas: 1,
      melhores: { 'brilho:facil': { estrelas: 3, pct: 0.9, pontos: 900 } },
    });
    window.__ensaio!.game.go('album');
  });
  await page.waitForFunction(() => (window.__ensaio!.cenaAtual().ganhas as () => string[])().length > 0);
  expect(await page.evaluate(() => (window.__ensaio!.cenaAtual().ganhas as () => string[])())).toEqual([
    'estreia',
    'dez-musicas',
    'cinco-seguidos',
    'tres-estrelas',
    'dupla',
  ]);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/e2e/screens/etapa11-album.png' });
  // mais um perfeito e a medalha dos 50 entra
  await page.evaluate(async () => {
    await window.__ensaio!.setProgresso({ perfeitos: 50 });
    await window.__ensaio!.game.checkAchievements();
  });
  expect(await page.evaluate(() => window.__ensaio!.progresso().conquistas)).toContain('cinquenta-perfeitos');
});

test('etapa 11: uma partida de verdade dá a primeira medalha e avisa no resultado', async ({ page }) => {
  await comecar(page, 'sim=1&cena=danca&fim=26');
  await estrelasDoResultado(page);
  const novidades = await page.evaluate(
    () => (window.__ensaio!.cenaAtual() as { report: { novidades: string[] } }).report.novidades,
  );
  expect(novidades).toContain('Medalha nova: Estreia!');
  expect(novidades).toContain('Medalha nova: 5 perfeitos seguidos!');
  expect(await page.evaluate(() => window.__ensaio!.progresso().conquistas)).toEqual(
    expect.arrayContaining(['estreia', 'cinco-seguidos', 'tres-estrelas']),
  );
});

test('etapa 11: na turnê, cada show resgata um amigo e pode abrir um cenário', async ({ page }) => {
  await comecar(page, 'sim=1&fim=12');
  await abrirPais(page);
  await page.setInputFiles('input[data-musica="brilho"]', WAV);
  await expect(page.locator('[data-linha="brilho"]')).toContainText('com áudio');
  await page.click('#pais-voltar');
  await esperarCena(page, 'menu');
  await apontar(page, 'historia');
  await esperarCena(page, 'historia');
  await soltar(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/screens/etapa11-turne-inicio.png' });
  const travados = () =>
    page.evaluate(() =>
      window
        .__ensaio!.botoes()
        .filter((b) => b.disabled)
        .map((b) => b.id),
    );
  expect(await travados()).toEqual(['show-1', 'show-2', 'show-3', 'show-4']);
  expect(await page.evaluate(() => window.__ensaio!.game.cenarioLiberado('palco'))).toBe(false);
  await apontar(page, 'show-0');
  await esperarCena(page, 'danca', 30_000);
  await soltar(page);
  await estrelasDoResultado(page);
  const novidades = await page.evaluate(
    () => (window.__ensaio!.cenaAtual() as { report: { novidades: string[] } }).report.novidades,
  );
  expect(novidades).toContain('Você resgatou um amigo novo! Coelhinha Pluma!');
  expect(novidades).toContain('Você ganhou: Palco!');
  expect(await page.evaluate(() => window.__ensaio!.progresso().historia)).toBe(1);
  // o Palco abriu pela turnê, mesmo com menos de 5 estrelas
  expect(await page.evaluate(() => window.__ensaio!.game.totalStars())).toBeLessThan(5);
  expect(await page.evaluate(() => window.__ensaio!.game.cenarioLiberado('palco'))).toBe(true);
  expect(await page.evaluate(() => window.__ensaio!.game.cenarioLiberado('patins'))).toBe(false);
  expect(await page.evaluate(() => window.__ensaio!.botoes().find((b) => b.id === 'menu')!.label)).toBe(
    'Próximo show',
  );
  await page.waitForTimeout(2300);
  await apontar(page, 'menu');
  await esperarCena(page, 'historia');
  await soltar(page);
  expect(await travados()).toEqual(['show-2', 'show-3', 'show-4']);
  expect(await page.evaluate(() => window.__ensaio!.game.companions!.rescued())).toEqual(['coelho']);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'tests/e2e/screens/etapa11-turne-1-show.png' });
  // o próximo show ainda não tem música: o jogo pede um adulto
  await apontar(page, 'show-1');
  await expect
    .poll(() => page.evaluate(() => window.__ensaio!.falas().at(-1)))
    .toBe('Peça para um adulto carregar a música.');
  expect(await page.evaluate(() => window.__ensaio!.cena())).toBe('historia');
});

test('etapa 11: na estátua a música para 3 s e quem fica parado ganha bônus', async ({ page }) => {
  await comecar(page, 'sim=1&semente=3');
  await escolherDemo(page, 'estatua');
  await esperarCena(page, 'danca', 30_000);
  await soltar(page);
  const sim = (parado: boolean) =>
    page.evaluate((p) => {
      window.__ensaio!.sim()!.scripts[0].parado = p;
    }, parado);

  // 1ª estátua: ela fica parada
  await page.waitForFunction(() => window.__ensaio!.danca()?.congelado === true, undefined, {
    timeout: 60_000,
  });
  await sim(true);
  const b0 = await page.evaluate(() => window.__ensaio!.beat());
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => window.__ensaio!.beat())).toBeCloseTo(b0, 1);
  await page.screenshot({ path: 'tests/e2e/screens/etapa11-estatua.png' });
  await page.waitForFunction(() => window.__ensaio!.danca()?.congelado === false);
  await sim(false);
  expect(await page.evaluate(() => window.__ensaio!.game.estatuasFeitas)).toBe(1);

  // 2ª estátua: ela se mexe o tempo todo, e não ganha o bônus
  await page.waitForFunction(() => window.__ensaio!.danca()?.congelamentos === 2, undefined, {
    timeout: 60_000,
  });
  for (let i = 0; i < 12; i++) {
    await page.evaluate((k) => {
      const up = k % 2 === 0;
      window.__ensaio!.gesto({
        tipo: 'pose',
        angles: up
          ? { lShoulder: 90, rShoulder: 90, lElbow: 170, rElbow: 170 }
          : { lShoulder: 20, rShoulder: 20 },
      });
    }, i);
    await page.waitForTimeout(220);
  }
  await page.waitForFunction(() => window.__ensaio!.danca()?.congelado === false);
  await soltar(page);
  expect(await page.evaluate(() => window.__ensaio!.game.estatuasFeitas)).toBe(1);

  await estrelasDoResultado(page, 90_000);
  const bonus = await page.evaluate(
    () => (window.__ensaio!.cenaAtual() as unknown as { outcome: { bonus: number[] } }).outcome.bonus,
  );
  expect(bonus).toEqual([50]);
  expect(await page.evaluate(() => window.__ensaio!.progresso().estatuas)).toBe(1);
});

test('etapa 11: no modo surpresa o BPM é detectado e as poses são sorteadas', async ({ page }) => {
  await comecar(page, 'sim=1&fim=14&semente=9');
  await esperarCena(page, 'menu');
  await apontar(page, 'jogar');
  await esperarCena(page, 'musicas');
  await soltar(page);
  while (!(await page.evaluate(() => window.__ensaio!.botoes().some((b) => b.id === 'surpresa')))) {
    await clicarBotao(page, 'proxima');
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/e2e/screens/etapa11-surpresa.png' });
  await page.setInputFiles('#surpresa-arquivo', WAV);
  await page.waitForFunction(() => !!window.__ensaio!.cenaAtual().surpresa, undefined, { timeout: 30_000 });
  const s = await page.evaluate(() => {
    const x = window.__ensaio!.cenaAtual().surpresa as {
      choreo: {
        bpm: number;
        origem: string;
        niveis: { facil: { eventos: { pose: string; beat: number }[] } };
      };
      bpmAchado: boolean;
    };
    return {
      bpm: x.choreo.bpm,
      origem: x.choreo.origem,
      achou: x.bpmAchado,
      eventos: x.choreo.niveis.facil.eventos,
    };
  });
  expect(s.achou).toBe(true);
  expect(Math.abs(s.bpm - 123)).toBeLessThan(2);
  expect(s.origem).toBe('surpresa');
  expect(s.eventos.length).toBeGreaterThan(5);
  const facil = await page.evaluate(() =>
    Object.entries(window.__ensaio!.game.catalog)
      .filter(([, d]) => d.nivel === 'facil')
      .map(([id]) => id),
  );
  for (const e of s.eventos) expect(facil).toContain(e.pose);

  await apontar(page, 'facil');
  await esperarCena(page, 'danca', 30_000);
  await soltar(page);
  const estrelas = await estrelasDoResultado(page);
  expect(estrelas[0]).toBe(3);
  const p = await page.evaluate(() => window.__ensaio!.progresso());
  expect(p.surpresas).toBe(1);
  expect(p.melhores).toEqual({});
  expect(p.conquistas).toContain('surpresa');
  // a música surpresa não fica guardada nem entra no menu
  expect(await page.evaluate(() => window.__ensaio!.game.songs.some((x) => x.origem === 'surpresa'))).toBe(
    false,
  );
  expect(await page.evaluate(() => window.__ensaio!.game.store!.audioIds())).toEqual([]);
});

test('etapa 11: o editor da Área dos Pais detecta o BPM do arquivo', async ({ page }) => {
  await comecar(page, 'sim=1');
  await abrirPais(page);
  await page.setInputFiles('input[data-musica="letal"]', WAV);
  await page.click('[data-editar="letal"]');
  await expect(page.locator('#ed-bpm')).toHaveValue('140');
  await page.click('[data-ferramenta="bpm"]');
  await expect(page.locator('#pais-aviso')).toContainText('Achei');
  const bpm = Number(await page.locator('#ed-bpm').inputValue());
  expect(Math.abs(bpm - 123)).toBeLessThan(2);
});
