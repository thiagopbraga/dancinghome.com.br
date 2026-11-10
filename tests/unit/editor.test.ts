import { describe, expect, it } from 'vitest';
import { averageAngles } from '../../src/core/recorder';
import { expandSections } from '../../src/data/choreo';
import {
  applyMarks,
  beatsInAudio,
  checkMarks,
  finalBeat,
  fitToDuration,
  marksOf,
  nearestBeat,
} from '../../src/data/editor';
import { ChoreoSchema } from '../../src/data/schema';
import { loadBaseData } from '../../src/data/songs';

const base = loadBaseData();
const brilho = base.songs.find((s) => s.id === 'brilho')!;

describe('editor de seções', () => {
  it('lê as marcações que vêm com a música', () => {
    expect(marksOf(brilho)).toEqual({ intro: 0, verso: 16, refrao: 80, verso2: 144, refrao2: 208 });
  });

  it('conta as batidas que cabem no áudio e arredonda para a batida', () => {
    expect(beatsInAudio(60, 120, 0)).toBe(120);
    expect(beatsInAudio(60, 120, 500)).toBe(119);
    expect(nearestBeat(15.6)).toBe(16);
    expect(nearestBeat(-0.4)).toBe(0);
    expect(finalBeat(400)).toBe(392);
    expect(finalBeat(317)).toBe(308);
  });

  it('recusa marcações fora de ordem ou coladas no fim', () => {
    const m = marksOf(brilho);
    expect(checkMarks(m, 400)).toBeNull();
    expect(checkMarks({ ...m, verso: 0 }, 400)).toContain('Verso 1');
    expect(checkMarks({ ...m, refrao2: 390 }, 400)).toContain('fim da música');
  });

  it('aplica as marcações nos dois níveis e marca como calibrado', () => {
    const m = { intro: 8, verso: 24, refrao: 88, verso2: 152, refrao2: 216 };
    const c = applyMarks(brilho, m, { bpm: 124, offsetMs: 180, duracaoBeats: 380 });
    expect(ChoreoSchema.safeParse(c).success).toBe(true);
    expect(c.calibrado).toBe(true);
    expect(c.bpm).toBe(124);
    expect(c.offsetMs).toBe(180);
    const normal = Object.fromEntries(c.niveis.normal!.secoes!.map((s) => [s.nome, s.inicioBeat]));
    expect(normal).toEqual({ intro: 8, verso: 24, refrao: 88, verso2: 152, refrao2: 216, final: 372 });
    const facil = Object.fromEntries(c.niveis.facil!.secoes!.map((s) => [s.nome, s.inicioBeat]));
    expect(facil).toEqual({ intro: 8, verso: 24, refrao: 88, final: 160 });
    expect(c.niveis.facil!.trecho).toEqual({ inicioBeat: 0, fimBeat: 168 });
    // a música original não muda
    expect(brilho.calibrado).toBe(false);
    // e a coreografia continua tocável: poses em ordem, a primeira no começo da introdução
    const ev = expandSections(c, 'facil');
    expect(ev[0].beat).toBe(8);
    // a seção final (160 a 168) tem duas poses; a última é segurada até o fim do trecho
    expect(ev.at(-1)!.beat).toBe(164);
    expect(ev.at(-1)!.holdBeats).toBe(4);
  });

  it('ajusta a pose final quando o áudio é mais curto que a estimativa', () => {
    const c = fitToDuration(brilho, 300);
    expect(c.duracaoBeats).toBe(300);
    expect(c.niveis.normal!.secoes!.find((s) => s.nome === 'final')!.inicioBeat).toBe(292);
    expect(c.calibrado).toBe(false);
    const ev = expandSections(c, 'normal');
    expect(ev.at(-1)!.beat + ev.at(-1)!.holdBeats).toBe(300);
  });
});

describe('média de ângulos', () => {
  const amostra = (l: number, r: number, vis = 0.9) => ({
    angles: { lShoulder: l, rShoulder: r, lElbow: 170 },
    vis: { lShoulder: vis, rShoulder: vis, lElbow: vis },
  });

  it('faz a média só dos ângulos pedidos', () => {
    const a = averageAngles(
      [amostra(100, 40), amostra(110, 50), amostra(120, 60)],
      ['lShoulder', 'rShoulder'],
    );
    expect(a).toEqual({ lShoulder: 110, rShoulder: 50 });
  });

  it('ignora amostras em que o braço não aparece', () => {
    const a = averageAngles([amostra(100, 40), amostra(100, 40), amostra(10, 10, 0.2)], ['lShoulder']);
    expect(a).toEqual({ lShoulder: 100 });
  });

  it('não vale quando o corpo quase não aparece', () => {
    expect(
      averageAngles([amostra(100, 40, 0.2), amostra(100, 40, 0.2), amostra(100, 40)], ['lShoulder']),
    ).toBeNull();
    expect(averageAngles([], ['lShoulder'])).toBeNull();
  });
});
