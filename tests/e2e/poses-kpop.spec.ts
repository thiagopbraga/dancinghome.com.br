import { expect, test } from '@playwright/test';
import type * as BackdropMod from '../../src/game/draw/backdrop';
import type * as CardMod from '../../src/game/draw/card';
import type * as UtilMod from '../../src/game/draw/util';
import { comecar, esperarCena, estrelasDoResultado } from './helpers';

const NOVAS_POR_MUSICA: {
  id: string;
  titulo: string;
  cor: string;
  poses: [string, string, string];
}[] = [
  {
    id: 'brilho',
    titulo: '1. Brilho (Golden)',
    cor: '#ff5fa8',
    poses: ['coroa-dourada', 'moldura-glam', 'passo-de-diva'],
  },
  {
    id: 'meu-pequeno-guarana',
    titulo: '2. Meu Pequeno Guaraná (Soda Pop)',
    cor: '#38c6ff',
    poses: ['canudinho', 'tampinha', 'pulo-pop'],
  },
  {
    id: 'o-som-da-nossa-voz',
    titulo: '3. O Som da Nossa Voz (What It Sounds Like)',
    cor: '#b06bff',
    poses: ['voz-pro-ceu', 'onda-de-som', 'passo-unido'],
  },
  {
    id: 'letal',
    titulo: '4. Letal (Takedown)',
    cor: '#ff4d4d',
    poses: ['arco-e-flecha', 'guarda-letal', 'base-de-guerreira'],
  },
  {
    id: 'nao-tem-perdao',
    titulo: '5. Não Tem Perdão (How It’s Done)',
    cor: '#3ddc84',
    poses: ['v-da-vitoria', 'swagger', 'pose-de-turne'],
  },
];

test('poses k-pop: gera vitrine visual das 15 novas poses do catálogo', async ({ page }) => {
  await comecar(page, 'sim=1');
  await esperarCena(page, 'menu');

  const totalNovas = await page.evaluate(async (grupos) => {
    const load = <T>(u: string): Promise<T> => import(u) as Promise<T>;
    const { drawPoseCard } = await load<typeof CardMod>('/jogar/src/game/draw/card.ts');
    const { drawBackdrop } = await load<typeof BackdropMod>('/jogar/src/game/draw/backdrop.ts');
    const { roundRect, text } = await load<typeof UtilMod>('/jogar/src/game/draw/util.ts');
    const g = window.__ensaio!.game;

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    drawBackdrop(ctx, g.engine.view, 0);
    text(ctx, 'Novas Poses de K-pop — Catálogo (15 poses · 5 músicas)', 640, 34, {
      size: 28,
      color: '#ffd640',
    });

    let count = 0;
    grupos.forEach((grupo, colIdx) => {
      const colW = 244;
      const cx = 140 + colIdx * colW;
      roundRect(ctx, cx - 114, 62, 228, 638, 18);
      ctx.fillStyle = 'rgba(20, 10, 42, 0.72)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = grupo.cor;
      ctx.stroke();

      text(ctx, grupo.titulo, cx, 88, {
        size: 16,
        color: '#ffffff',
        maxWidth: 210,
      });

      grupo.poses.forEach((poseId, rowIdx) => {
        const def = g.catalog[poseId];
        if (!def) throw new Error(`Pose ausente: ${poseId}`);
        count++;
        const cy = 195 + rowIdx * 195;
        drawPoseCard(ctx, def.angles, cx, cy, {
          scale: 0.92,
          color: grupo.cor,
          label: `${def.nome} (${def.nivel === 'facil' ? 'Fácil' : 'Normal'})`,
        });
      });
    });
    return count;
  }, NOVAS_POR_MUSICA);

  expect(totalNovas).toBe(15);
  await page.screenshot({ path: 'tests/e2e/screens/poses-kpop-catalogo.png' });
});

test('poses k-pop: as 5 músicas rodam na dança com as novas poses e dão Perfeito na simulação', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await comecar(page, 'sim=1&fim=18');
  await esperarCena(page, 'menu');

  const exemplos: {
    id: string;
    nivel: 'facil' | 'normal';
    aposResultados: number;
    esperadas: string[];
    screen: string;
  }[] = [
    {
      id: 'brilho',
      nivel: 'facil',
      aposResultados: 1,
      esperadas: ['pose-de-idol', 'moldura-glam'],
      screen: 'tests/e2e/screens/poses-kpop-brilho.png',
    },
    {
      id: 'meu-pequeno-guarana',
      nivel: 'facil',
      aposResultados: 2,
      esperadas: ['bolhas', 'tampinha', 'canudinho'],
      screen: 'tests/e2e/screens/poses-kpop-guarana.png',
    },
    {
      id: 'o-som-da-nossa-voz',
      nivel: 'facil',
      aposResultados: 1,
      esperadas: ['escudo', 'onda-de-som'],
      screen: 'tests/e2e/screens/poses-kpop-voz.png',
    },
    {
      id: 'letal',
      nivel: 'normal',
      aposResultados: 1,
      esperadas: ['guarda-letal', 'espada-de-luz'],
      screen: 'tests/e2e/screens/poses-kpop-letal.png',
    },
    {
      id: 'nao-tem-perdao',
      nivel: 'normal',
      aposResultados: 1,
      esperadas: ['swagger', 'v-da-vitoria'],
      screen: 'tests/e2e/screens/poses-kpop-perdao.png',
    },
  ];

  for (const ex of exemplos) {
    await page.evaluate(
      async ({ id, nivel }) => {
        const g = window.__ensaio!.game;
        await g.startPose(1);
        const choreo = g.song(id)!;
        const buffer = g.clickTrack(choreo);
        g.go('danca', {
          cfg: { songId: id, nivel, modo: 'jogar', dupla: false, estatua: false },
          choreo,
          buffer,
        });
      },
      { id: ex.id, nivel: ex.nivel },
    );
    await esperarCena(page, 'danca');
    await page.waitForFunction((n) => window.__ensaio!.resultados().length >= n, ex.aposResultados, {
      timeout: 30_000,
    });
    await page.screenshot({ path: ex.screen });
    const estrelas = await estrelasDoResultado(page, 60_000);
    expect(estrelas[0]).toBe(3);
    const avaliadas = await page.evaluate(() => window.__ensaio!.resultados().map((r) => r.pose));
    for (const p of ex.esperadas) expect(avaliadas).toContain(p);
  }
  expect(erros).toEqual([]);
});
