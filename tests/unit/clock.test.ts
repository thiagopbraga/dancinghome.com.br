import { describe, expect, it } from 'vitest';
import { SongClock } from '../../src/core/clock';
import { DEMO_BEATS, DEMO_BPM, renderDemoSong } from '../../src/core/demoSong';

class FakeCtx {
  currentTime = 0;
  outputLatency = 0;
}

describe('SongClock', () => {
  it('tempo de batida: beat() = now() * bpm / 60, já descontado o offsetMs', () => {
    const ctx = new FakeCtx();
    const clock = new SongClock(ctx, 120, 500);
    ctx.currentTime = 10;
    clock.start(0, 1, 10);
    ctx.currentTime = 12.5;
    expect(clock.position()).toBeCloseTo(2.5);
    expect(clock.now()).toBeCloseTo(2.0);
    expect(clock.beat()).toBeCloseTo(4.0);
    expect(clock.timeOfBeat(4)).toBeCloseTo(2.0);
    expect(clock.positionOfBeat(4)).toBeCloseTo(2.5);
  });

  it('desconta a latência de saída', () => {
    const ctx = new FakeCtx();
    ctx.outputLatency = 0.1;
    const clock = new SongClock(ctx, 120, 0);
    clock.start(0, 1, 0);
    ctx.currentTime = 1;
    expect(clock.now()).toBeCloseTo(0.9);
  });

  it('pausa e retomada sem salto', () => {
    const ctx = new FakeCtx();
    ctx.outputLatency = 0.05;
    const clock = new SongClock(ctx, 120, 0);
    clock.start(0, 1, 0);
    ctx.currentTime = 3;
    const antes = clock.now();
    const pos = clock.pause();
    expect(pos).toBeCloseTo(antes);
    ctx.currentTime = 8;
    expect(clock.now()).toBeCloseTo(antes);
    clock.resume(8);
    expect(clock.now()).toBeCloseTo(antes);
    ctx.currentTime = 8.02;
    expect(clock.now()).toBeGreaterThanOrEqual(antes);
    expect(clock.now() - antes).toBeLessThan(0.021);
    ctx.currentTime = 9.05;
    expect(clock.now()).toBeCloseTo(antes + 1);
  });

  it('o tempo nunca anda para trás ao pausar e retomar várias vezes', () => {
    const ctx = new FakeCtx();
    ctx.outputLatency = 0.03;
    const clock = new SongClock(ctx, 100, 0);
    clock.start(0, 1, 0);
    let last = -Infinity;
    for (let i = 0; i < 200; i++) {
      ctx.currentTime += 0.016;
      if (i % 40 === 10) clock.pause();
      if (i % 40 === 20) clock.resume();
      const now = clock.now();
      expect(now).toBeGreaterThanOrEqual(last - 1e-9);
      last = now;
    }
  });

  it('playbackRate 0,5 faz a música andar na metade da velocidade', () => {
    const ctx = new FakeCtx();
    const clock = new SongClock(ctx, 120, 0);
    clock.start(0, 0.5, 0);
    ctx.currentTime = 4;
    expect(clock.beat()).toBeCloseTo(4);
    clock.setRate(1);
    ctx.currentTime = 5;
    expect(clock.beat()).toBeCloseTo(6);
  });

  it('antes de o som começar o tempo é negativo (contagem)', () => {
    const ctx = new FakeCtx();
    const clock = new SongClock(ctx, 120, 0);
    clock.start(0, 1, 1);
    expect(clock.now()).toBeCloseTo(-1);
  });
});

describe('música de demonstração', () => {
  it('tem 64 batidas a 120 BPM (32 s) e não estoura o volume', () => {
    const sr = 8000;
    const samples = renderDemoSong(sr);
    expect(samples.length).toBe((DEMO_BEATS * 60 * sr) / DEMO_BPM);
    let peak = 0;
    for (const v of samples) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeGreaterThan(0.3);
    expect(peak).toBeLessThanOrEqual(1);
  });
});
