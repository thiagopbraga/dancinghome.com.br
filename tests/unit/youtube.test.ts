import { describe, expect, it } from 'vitest';
import { renderClickTrack } from '../../src/core/clickTrack';
import { parseYouTubeId, VideoClock, youTubeErrorText } from '../../src/core/youtube';
import { ChoreoSchema } from '../../src/data/schema';
import brilho from '../../src/data/songs/brilho/choreo.json';

describe('parseYouTubeId', () => {
  const id = 'dQw4w9WgXcQ';
  it.each([
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `youtu.be/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}?start=3`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `  https://youtu.be/${id}  `,
  ])('entende %s', (link) => {
    expect(parseYouTubeId(link)).toBe(id);
  });

  it.each([
    '',
    'música',
    'https://vimeo.com/123',
    'https://www.youtube.com/watch?v=curto',
    'https://youtube.com/',
  ])('recusa %s', (link) => {
    expect(parseYouTubeId(link)).toBeNull();
  });
});

/** Player falso: a posição do vídeo só é informada em degraus de 250 ms, como acontece no iframe. */
function fakeVideo() {
  const s = { wall: 0, video: 0, playing: false, step: 0.25 };
  return {
    s,
    advance(dt: number) {
      s.wall += dt;
      if (s.playing) s.video += dt;
    },
    read: () => Math.floor(s.video / s.step) * s.step,
    wall: () => s.wall,
  };
}

describe('VideoClock', () => {
  it('fica parado antes de o vídeo começar e anda junto com ele depois', () => {
    const f = fakeVideo();
    const c = new VideoClock(f.read, f.wall, 120, 0);
    c.seek(10);
    f.advance(1);
    expect(c.position()).toBe(10);
    f.s.video = 10;
    f.s.playing = true;
    c.start(10);
    let maxErr = 0;
    for (let i = 0; i < 600; i++) {
      f.advance(1 / 60);
      maxErr = Math.max(maxErr, Math.abs(c.position() - f.s.video));
    }
    // mesmo com leituras em degraus de 250 ms, o relógio não se afasta do vídeo
    expect(maxErr).toBeLessThan(0.12);
    expect(c.position()).toBeCloseTo(20, 1);
  });

  it('é suave: entre quadros não anda para trás mais que um pouquinho', () => {
    const f = fakeVideo();
    const c = new VideoClock(f.read, f.wall, 120, 0);
    f.s.playing = true;
    c.start(0);
    let prev = c.position();
    for (let i = 0; i < 600; i++) {
      f.advance(1 / 60);
      const p = c.position();
      expect(p - prev).toBeGreaterThan(-0.06);
      prev = p;
    }
  });

  it('segue o vídeo quando ele pula (engasgo grande)', () => {
    const f = fakeVideo();
    const c = new VideoClock(f.read, f.wall, 120, 0);
    f.s.playing = true;
    c.start(0);
    f.advance(1);
    c.position();
    f.s.video += 2; // o vídeo pulou 2 s
    f.advance(0.3);
    expect(Math.abs(c.position() - f.s.video)).toBeLessThan(0.3);
  });

  it('congela no hold e retoma sem salto', () => {
    const f = fakeVideo();
    const c = new VideoClock(f.read, f.wall, 120, 0);
    f.s.playing = true;
    c.start(0);
    f.advance(2);
    c.hold(2);
    f.s.playing = false;
    f.advance(5);
    expect(c.position()).toBe(2);
    expect(c.running).toBe(false);
    f.s.playing = true;
    c.start(2);
    f.advance(1);
    expect(c.position()).toBeCloseTo(3, 1);
  });

  it('desconta o ajuste (offsetMs) e converte para batidas', () => {
    const f = fakeVideo();
    const c = new VideoClock(f.read, f.wall, 120, 1500);
    c.seek(1.5);
    expect(c.now()).toBeCloseTo(0, 6);
    expect(c.beat()).toBeCloseTo(0, 6);
    c.seek(3.5);
    expect(c.beat()).toBeCloseTo(4, 6);
    expect(c.positionOfBeat(8)).toBeCloseTo(5.5, 6);
    expect(c.timeOfBeat(2)).toBeCloseTo(1, 6);
  });

  it('meia velocidade (treino)', () => {
    const f = fakeVideo();
    const c = new VideoClock(f.read, f.wall, 120, 0);
    c.start(0, 0.5);
    f.advance(2);
    expect(c.position()).toBeCloseTo(1, 6);
  });
});

describe('palminhas', () => {
  it('um clique por batida, no lugar certo', () => {
    const sr = 8000;
    const samples = renderClickTrack(120, 8, sr);
    expect(samples.length).toBe(Math.ceil((8 * 0.5 + 1) * sr));
    for (let b = 0; b < 8; b++) {
      const i = Math.round(b * 0.5 * sr);
      const energy = samples.slice(i, i + 200).reduce((s, v) => s + Math.abs(v), 0);
      const silence = samples.slice(i + 2000, i + 2200).reduce((s, v) => s + Math.abs(v), 0);
      expect(energy).toBeGreaterThan(5);
      expect(silence).toBeLessThan(0.01);
    }
  });
});

describe('dados', () => {
  it('a coreografia aceita um vídeo do YouTube com ajuste', () => {
    const c = ChoreoSchema.parse({ ...brilho, youtube: { id: 'dQw4w9WgXcQ', offsetMs: 1200 } });
    expect(c.youtube).toEqual({ id: 'dQw4w9WgXcQ', offsetMs: 1200 });
    expect(ChoreoSchema.parse(brilho).youtube).toBeUndefined();
    expect(ChoreoSchema.safeParse({ ...brilho, youtube: { id: 'xx' } }).success).toBe(false);
  });

  it('mensagens de erro do player para o adulto', () => {
    expect(youTubeErrorText(150)).toMatch(/não deixa/);
    expect(youTubeErrorText(101)).toMatch(/não deixa/);
    expect(youTubeErrorText(100)).toMatch(/não existe/);
  });
});
