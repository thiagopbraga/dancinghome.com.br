import { expect, test, type Page } from '@playwright/test';
import { apontar, clicarBotao, comecar, esperarCena, estrelasDoResultado, soltar } from './helpers';

/** Progresso falso com um certo total de estrelas. */
async function comEstrelas(page: Page, total: number): Promise<void> {
  await page.evaluate(async (n) => {
    const melhores: Record<string, { estrelas: number; pct: number; pontos: number }> = {};
    let falta = n;
    for (let i = 0; falta > 0; i++) {
      const e = Math.min(3, falta);
      melhores[`musica-${i}:facil`] = { estrelas: e, pct: 0.5, pontos: 100 };
      falta -= e;
    }
    await window.__ensaio!.setProgresso({ melhores });
    window.__ensaio!.game.go('personagens');
  }, total);
  await esperarCena(page, 'personagens');
}

const travados = (page: Page) =>
  page.evaluate(() =>
    window
      .__ensaio!.botoes()
      .filter((b) => b.disabled)
      .map((b) => b.id)
      .sort(),
  );

test('etapa 10: figurinos e cenários abrem com 5, 15 e 30 estrelas', async ({ page }) => {
  await comecar(page, 'sim=1');
  await esperarCena(page, 'menu');
  const de5 = ['acessorio-laco', 'cenario-palco', 'cor-3', 'cor-4'];
  const de15 = ['acessorio-oculos', 'cenario-patins', 'cor-5', 'cor-6'];
  const de30 = ['acessorio-coroa', 'cenario-ciclovia', 'cor-7'];
  await comEstrelas(page, 4);
  expect(await page.evaluate(() => window.__ensaio!.game.totalStars())).toBe(4);
  expect(await travados(page)).toEqual([...de5, ...de15, ...de30].sort());
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/e2e/screens/etapa10-grupo-4-estrelas.png' });
  await comEstrelas(page, 5);
  expect(await travados(page)).toEqual([...de15, ...de30].sort());
  await comEstrelas(page, 14);
  expect(await travados(page)).toEqual([...de15, ...de30].sort());
  await comEstrelas(page, 15);
  expect(await travados(page)).toEqual([...de30].sort());
  await comEstrelas(page, 29);
  expect(await travados(page)).toEqual([...de30].sort());
  await comEstrelas(page, 30);
  expect(await travados(page)).toEqual([]);
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/e2e/screens/etapa10-grupo-30-estrelas.png' });
});

test('etapa 10: ela muda cor, cabelo, acessório, nomes e cenário, e tudo fica guardado', async ({ page }) => {
  await comecar(page, 'sim=1');
  await esperarCena(page, 'menu');
  await comEstrelas(page, 5);
  // por gesto: escolhe a segunda idol e troca a cor
  await apontar(page, 'idol-1');
  await page.waitForFunction(() => window.__ensaio!.cenaAtual().sel === 1);
  await apontar(page, 'cor-1');
  await page.waitForFunction(() => window.__ensaio!.game.characters.idols[1].cor === '#38c6ff');
  await soltar(page);
  await clicarBotao(page, 'cabelo-3');
  await clicarBotao(page, 'cabelocor-3');
  await clicarBotao(page, 'acessorio-laco');
  await clicarBotao(page, 'cenario-palco');
  await page.waitForFunction(() => window.__ensaio!.game.cenario === 'palco');
  await clicarBotao(page, 'renomear');
  await page.fill('#personagens-nomes input[data-nome="grupo"]', 'As Lunáticas');
  await page.fill('#personagens-nomes input[data-nome="idol-1"]', 'Nina');
  await page.fill('#personagens-nomes input[data-nome="cachorro"]', 'Paçoca');
  await page.click('#nomes-ok');
  await page.waitForFunction(() => window.__ensaio!.game.characters.grupo === 'As Lunáticas');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'tests/e2e/screens/etapa10-grupo-editado.png' });
  const esperado = {
    nome: 'Nina',
    cor: '#38c6ff',
    cabelo: 3,
    cabeloCor: '#ff7ab8',
    acessorio: 'laco',
  };
  expect(await page.evaluate(() => window.__ensaio!.game.characters.idols[1])).toEqual(esperado);

  await page.goto('/jogar/?sim=1');
  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  const c = await page.evaluate(() => window.__ensaio!.game.characters);
  expect(c.idols[1]).toEqual(esperado);
  expect(c.grupo).toBe('As Lunáticas');
  expect(c.cachorro).toBe('Paçoca');
  expect(c.cenario).toBe('palco');
  await clicarBotao(page, 'comecar');
  await esperarCena(page, 'menu');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/e2e/screens/etapa10-menu.png' });
});

test('etapa 10: os pets pulam a cada "Perfeito!"', async ({ page }) => {
  await comecar(page, 'sim=1&cena=danca&fim=26');
  await esperarCena(page, 'danca');
  await page.evaluate(() => window.__ensaio!.roteiro('acertar', { 1: { errar: -60 }, 3: 'sumir' }));
  await estrelasDoResultado(page);
  const res = await page.evaluate(() => window.__ensaio!.resultados());
  const perfeitos = res.filter((r) => r.rating === 'perfeito').length;
  expect(perfeitos).toBeGreaterThanOrEqual(3);
  expect(perfeitos).toBeLessThan(res.length);
  expect(await page.evaluate(() => window.__ensaio!.game.companions!.jumps)).toBe(perfeitos);
});

test('etapa 10: os 4 cenários aparecem na dança', async ({ page }) => {
  await comecar(page, 'sim=1&fim=40');
  await esperarCena(page, 'menu');
  for (const cenario of ['sala', 'palco', 'patins', 'ciclovia']) {
    await page.evaluate(async (id) => {
      const g = window.__ensaio!.game;
      await g.saveCharacters({ ...g.characters, cenario: id });
      g.go('danca');
    }, cenario);
    await esperarCena(page, 'danca');
    await page.waitForFunction(() => window.__ensaio!.resultados().length >= 1, undefined, {
      timeout: 30_000,
    });
    expect(await page.evaluate(() => window.__ensaio!.game.cenario)).toBe(cenario);
    await page.screenshot({ path: `tests/e2e/screens/etapa10-cenario-${cenario}.png` });
    await page.evaluate(() => window.__ensaio!.game.go('menu'));
    await esperarCena(page, 'menu');
  }
});

test('etapa 10: a foto do desenho perde o fundo branco e vira personagem', async ({ page }) => {
  await comecar(page, 'sim=1');
  await esperarCena(page, 'menu');
  await comEstrelas(page, 0);
  // "foto": papel branco com um boneco vermelho e azul
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 260;
    const g = c.getContext('2d')!;
    g.fillStyle = '#fbfbf7';
    g.fillRect(0, 0, 200, 260);
    g.fillStyle = '#d22b4a';
    g.beginPath();
    g.arc(100, 80, 40, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#2b5bd2';
    g.fillRect(70, 120, 60, 100);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.setInputFiles('#desenho-arquivo', {
    name: 'desenho.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  await page.waitForFunction(() => !!window.__ensaio!.game.characters.desenho);
  const info = await page.evaluate(async () => {
    const img = new Image();
    img.src = window.__ensaio!.game.characters.desenho!;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0);
    const canto = g.getImageData(0, 0, 1, 1).data[3];
    const meio = g.getImageData(Math.floor(img.width / 2), Math.floor(img.height / 2), 1, 1).data[3];
    return { w: img.width, h: img.height, canto, meio };
  });
  // recortado em volta do boneco (80 x 180), com o papel transparente
  expect(info.w).toBeGreaterThanOrEqual(78);
  expect(info.w).toBeLessThanOrEqual(84);
  expect(info.h).toBeGreaterThanOrEqual(178);
  expect(info.h).toBeLessThanOrEqual(184);
  expect(info.canto).toBe(0);
  expect(info.meio).toBe(255);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'tests/e2e/screens/etapa10-desenho.png' });
  await clicarBotao(page, 'tirar');
  await page.waitForFunction(() => window.__ensaio!.game.characters.desenho === null);
  // um arquivo só de papel branco não vira desenho, e o jogo explica
  const branco = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 50;
    c.height = 50;
    const g = c.getContext('2d')!;
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, 50, 50);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.setInputFiles('#desenho-arquivo', {
    name: 'b.png',
    mimeType: 'image/png',
    buffer: Buffer.from(branco, 'base64'),
  });
  await page.waitForFunction(() =>
    String(window.__ensaio!.cenaAtual().aviso).includes('Não achei o desenho'),
  );
  expect(await page.evaluate(() => window.__ensaio!.game.characters.desenho)).toBeNull();
});
