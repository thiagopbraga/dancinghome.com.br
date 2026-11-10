import { expect, test, type Page } from '@playwright/test';
import { abrirPais, comecar, esperarCena } from './helpers';

const VIDEO = 'dQw4w9WgXcQ';

/**
 * YouTube falso: o container de testes não acessa o YouTube, então a página recebe um window.YT
 * que imita o player (estados, anúncio no começo, posição informada em degraus de 250 ms, erros).
 */
async function youtubeFalso(page: Page, opts: { erro?: number; anuncio?: number } = {}): Promise<void> {
  await page.route('https://www.youtube.com/**', (r) => r.abort());
  await page.addInitScript((o) => {
    const now = (): number => performance.now() / 1000;
    const fake = {
      erro: o.erro ?? null,
      anuncio: o.anuncio ?? 0,
      passo: 0.25,
      chamadas: [] as string[],
      player: null as unknown as FakePlayer,
      carregar(seg: number) {
        fake.player.travar(seg);
      },
    };
    type Ev = {
      onReady?: (e: unknown) => void;
      onStateChange?: (e: unknown) => void;
      onError?: (e: unknown) => void;
    };
    class FakePlayer {
      t = 0;
      state = -1;
      rate = 1;
      anchor = 0;
      timer = 0;
      wantPlay = false;
      muted = false;
      volume = 100;
      adLeft = fake.anuncio;
      constructor(
        el: HTMLElement,
        private readonly opts: { events?: Ev },
      ) {
        fake.player = this;
        const f = document.createElement('iframe');
        f.title = 'youtube falso';
        el.replaceWith(f);
        setTimeout(() => opts.events?.onReady?.({ target: this, data: 0 }), 50);
      }
      private pos(): number {
        return this.state === 1 ? this.t + (now() - this.anchor) * this.rate : this.t;
      }
      private set(s: number): void {
        if (s === this.state) return;
        this.state = s;
        this.opts.events?.onStateChange?.({ target: this, data: s });
      }
      playVideo(): void {
        fake.chamadas.push(this.muted ? 'play-mudo' : 'play');
        if (fake.erro) {
          setTimeout(() => this.opts.events?.onError?.({ target: this, data: fake.erro }), 100);
          return;
        }
        if (this.state === 1) return;
        this.wantPlay = true;
        const delay = 0.15 + this.adLeft;
        this.adLeft = 0;
        this.set(3);
        clearTimeout(this.timer);
        this.timer = window.setTimeout(() => {
          if (!this.wantPlay) return;
          this.anchor = now();
          this.set(1);
        }, delay * 1000);
      }
      pauseVideo(): void {
        fake.chamadas.push('pause');
        this.wantPlay = false;
        clearTimeout(this.timer);
        if (this.state === 1) this.t = this.pos();
        this.set(2);
      }
      travar(seg: number): void {
        if (this.state !== 1) return;
        this.t = this.pos();
        this.set(3);
        this.timer = window.setTimeout(() => {
          this.anchor = now();
          this.set(1);
        }, seg * 1000);
      }
      seekTo(s: number): void {
        this.t = s;
        this.anchor = now();
      }
      getCurrentTime(): number {
        return Math.floor(this.pos() / fake.passo) * fake.passo;
      }
      getDuration(): number {
        return 600;
      }
      getPlayerState(): number {
        return this.state;
      }
      setPlaybackRate(r: number): void {
        if (this.state === 1) {
          this.t = this.pos();
          this.anchor = now();
        }
        this.rate = r;
      }
      getPlaybackRate(): number {
        return this.rate;
      }
      setVolume(v: number): void {
        this.volume = v;
      }
      mute(): void {
        this.muted = true;
      }
      unMute(): void {
        this.muted = false;
      }
      cueVideoById(): void {
        this.set(5);
      }
      destroy(): void {}
    }
    (window as unknown as Record<string, unknown>).__ytFake = fake;
    (window as unknown as Record<string, unknown>).YT = { Player: FakePlayer };
  }, opts);
}

async function comVideo(page: Page, offsetMs = 0): Promise<void> {
  await page.evaluate(
    ([id, off]) => window.__ensaio!.game.saveYoutube('brilho', { id: id as string, offsetMs: off as number }),
    [VIDEO, offsetMs],
  );
}

async function dancarBrilho(page: Page): Promise<void> {
  await page.evaluate(() =>
    window.__ensaio!.game.startMatch({
      songId: 'brilho',
      nivel: 'facil',
      modo: 'show',
      dupla: false,
      estatua: false,
    }),
  );
}

test('youtube: com o link do vídeo, a música toca no jogo e a dança segue o tempo do vídeo', async ({
  page,
}) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await youtubeFalso(page, { anuncio: 1.5 });
  await comecar(page, 'sim=1&fim=24');
  await esperarCena(page, 'menu');
  await comVideo(page, 2000);
  expect(
    await page.evaluate(() => window.__ensaio!.game.hasAudio(window.__ensaio!.game.song('brilho')!)),
  ).toBe(true);
  await dancarBrilho(page);
  await esperarCena(page, 'danca', 30_000);
  // o vídeo aqueceu sem som (passando o anúncio) e depois tocou com som
  await page.waitForFunction(() => window.__ensaio!.danca()?.esperandoMusica === false);
  const estado = await page.evaluate(() => window.__ensaio!.danca());
  expect(estado?.musica).toBe('youtube');
  const chamadas = await page.evaluate(
    () => (window as unknown as { __ytFake: { chamadas: string[] } }).__ytFake.chamadas,
  );
  expect(chamadas[0]).toBe('play-mudo');
  expect(chamadas).toContain('play');
  await expect(page.locator('#youtube')).toHaveAttribute('data-modo', 'visivel');

  // o relógio da dança acompanha o vídeo (a batida 0 cai em 2 s do vídeo)
  await page.waitForTimeout(1500);
  const amostra = await page.evaluate(() => {
    const g = window.__ensaio!.game;
    const p = (window as unknown as { __ytFake: { player: { t: number; anchor: number; rate: number } } })
      .__ytFake.player;
    const video = p.t + (performance.now() / 1000 - p.anchor) * p.rate;
    return { video, pos: g.musicClock()!.position(), beat: g.musicClock()!.beat() };
  });
  expect(Math.abs(amostra.pos - amostra.video)).toBeLessThan(0.1);
  expect(amostra.beat).toBeCloseTo(((amostra.video - 2) * 123) / 60, 0);
  await page.screenshot({ path: 'tests/e2e/screens/youtube-danca.png' });

  // o vídeo engasga: a dança espera junto
  await page.evaluate(() =>
    (window as unknown as { __ytFake: { carregar: (s: number) => void } }).__ytFake.carregar(1.2),
  );
  await page.waitForTimeout(150);
  const b1 = await page.evaluate(() => window.__ensaio!.beat());
  await page.waitForTimeout(700);
  const b2 = await page.evaluate(() => window.__ensaio!.beat());
  expect(Math.abs(b2 - b1)).toBeLessThan(0.05);
  expect(await page.evaluate(() => window.__ensaio!.danca()?.esperandoMusica)).toBe(true);

  await esperarCena(page, 'resultado', 60_000);
  const res = await page.evaluate(() => window.__ensaio!.resultados());
  const eventos = await page.evaluate(() => window.__ensaio!.eventos().map((e) => e.beat));
  expect(res.map((r) => r.beat)).toEqual(eventos);
  const perfeitos = res.filter((r) => r.rating === 'perfeito').length;
  expect(perfeitos / res.length).toBeGreaterThanOrEqual(0.9);
  // fora da partida o player some
  await expect(page.locator('#youtube')).toHaveAttribute('data-modo', 'escondido');
  expect(erros).toEqual([]);
});

test('youtube: pausa e volta sem perder a sincronia', async ({ page }) => {
  await youtubeFalso(page);
  await comecar(page, 'sim=1&fim=24');
  await esperarCena(page, 'menu');
  await comVideo(page);
  await dancarBrilho(page);
  await esperarCena(page, 'danca', 30_000);
  await page.waitForFunction(() => window.__ensaio!.danca()?.esperandoMusica === false);
  await page.waitForTimeout(1000);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__ensaio!.danca()?.pausado === true);
  const b1 = await page.evaluate(() => window.__ensaio!.beat());
  await page.waitForTimeout(800);
  expect(Math.abs((await page.evaluate(() => window.__ensaio!.beat())) - b1)).toBeLessThan(0.05);
  await page.evaluate(() => {
    const c = window.__ensaio!.cenaAtual() as unknown as { setPaused: (p: boolean) => void };
    c.setPaused(false);
  });
  await page.waitForFunction(() => window.__ensaio!.danca()?.esperandoMusica === false);
  await page.waitForTimeout(800);
  const amostra = await page.evaluate(() => {
    const p = (
      window as unknown as {
        __ytFake: { player: { t: number; anchor: number; rate: number; state: number } };
      }
    ).__ytFake.player;
    const video = p.state === 1 ? p.t + (performance.now() / 1000 - p.anchor) * p.rate : p.t;
    return { video, pos: window.__ensaio!.game.musicClock()!.position() };
  });
  expect(Math.abs(amostra.pos - amostra.video)).toBeLessThan(0.1);
  await esperarCena(page, 'resultado', 60_000);
  const res = await page.evaluate(() => window.__ensaio!.resultados());
  expect(res.filter((r) => r.rating === 'perfeito').length / res.length).toBeGreaterThanOrEqual(0.9);
});

test('youtube: vídeo bloqueado para embutir vira palminhas e a dança continua', async ({ page }) => {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await youtubeFalso(page, { erro: 150 });
  await comecar(page, 'sim=1&fim=16');
  await esperarCena(page, 'menu');
  await comVideo(page);
  await dancarBrilho(page);
  await esperarCena(page, 'danca', 30_000);
  await page.waitForFunction(() => window.__ensaio!.danca()?.musica === 'palminhas', undefined, {
    timeout: 20_000,
  });
  expect(await page.evaluate(() => window.__ensaio!.falas())).toContain(
    'Hoje a música vai ser de palminhas! Vamos dançar!',
  );
  await esperarCena(page, 'resultado', 60_000);
  const res = await page.evaluate(() => window.__ensaio!.resultados());
  expect(res.filter((r) => r.rating === 'perfeito').length / res.length).toBeGreaterThanOrEqual(0.9);
  expect(erros).toEqual([]);
});

test('youtube: na Área dos Pais, colar o link, testar a batida e ajustar', async ({ page }) => {
  await youtubeFalso(page);
  await comecar(page, 'sim=1');
  await abrirPais(page);
  await page.fill('input[data-youtube="brilho"]', 'isto não é link');
  await page.click('[data-youtube-salvar="brilho"]');
  await expect(page.locator('#pais-aviso')).toContainText('Não entendi este link');
  await page.fill('input[data-youtube="brilho"]', `https://www.youtube.com/watch?v=${VIDEO}&t=10s`);
  await page.click('[data-youtube-salvar="brilho"]');
  await expect(page.locator('[data-youtube-offset="brilho"]')).toHaveText('ajuste: 0 ms');
  await page.click('[data-youtube-ajuste="brilho:100"]');
  await page.click('[data-youtube-ajuste="brilho:-10"]');
  await expect(page.locator('[data-youtube-offset="brilho"]')).toHaveText('ajuste: 90 ms');

  await page.click('[data-youtube-testar="brilho"]');
  await expect(page.locator('#yt-batida')).toContainText('batida', { timeout: 10_000 });
  await expect(page.locator('#youtube')).toHaveAttribute('data-modo', 'visivel');
  await page.waitForTimeout(1200);
  await page.click('[data-youtube-comecou="brilho"]');
  // a batida 0 passa a cair no ponto do vídeo em que o adulto tocou (mais de 1 s depois de começar)
  await expect
    .poll(() => page.evaluate(() => window.__ensaio!.game.song('brilho')!.youtube!.offsetMs))
    .toBeGreaterThan(900);
  await page.screenshot({ path: 'tests/e2e/screens/youtube-pais.png' });
  const ticks = await page.evaluate(() => window.__ensaio!.sons());
  expect((ticks.tick ?? 0) + (ticks.clique ?? 0)).toBeGreaterThan(0);

  // continua guardado depois de recarregar
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.cena === 'inicio');
  expect(await page.evaluate(() => window.__ensaio!.game.song('brilho')!.youtube?.id)).toBe(VIDEO);
});
