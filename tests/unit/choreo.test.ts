import { describe, expect, it } from 'vitest';
import { expandSections, levelRange, missingPoses } from '../../src/data/choreo';
import { ChoreoSchema, type Choreo } from '../../src/data/schema';
import { BASE_SONG_IDS, DEMO_ID, loadBaseData } from '../../src/data/songs';

function make(niveis: unknown, duracaoBeats = 64): Choreo {
  return ChoreoSchema.parse({
    id: 't',
    title: 'Teste',
    bpm: 120,
    offsetMs: 0,
    calibrado: true,
    duracaoBeats,
    niveis,
  });
}

describe('expandSections', () => {
  it('regra 1: a seção vai até o início da próxima, o fim do trecho ou a duração', () => {
    const c = make({
      facil: {
        trecho: { inicioBeat: 0, fimBeat: 40 },
        secoes: [
          { nome: 'a', inicioBeat: 8, aCada: 4, poses: ['estrela'] },
          { nome: 'b', inicioBeat: 16, aCada: 4, poses: ['coracao'] },
        ],
      },
      normal: { secoes: [{ nome: 'a', inicioBeat: 56, aCada: 4, poses: ['estrela'] }] },
    });
    const facil = expandSections(c, 'facil');
    expect(facil.filter((e) => e.secao === 'a').map((e) => e.beat)).toEqual([8, 12]);
    expect(facil.filter((e) => e.secao === 'b').map((e) => e.beat)).toEqual([16, 20, 24, 28, 32, 36]);
    expect(expandSections(c, 'normal').map((e) => e.beat)).toEqual([56, 60]);
    expect(levelRange(c, 'facil')).toEqual({ inicio: 0, fim: 40 });
    expect(levelRange(c, 'normal')).toEqual({ inicio: 0, fim: 64 });
  });

  it('regra 2: uma pose a cada aCada batidas, em ciclo', () => {
    const c = make(
      {
        facil: {
          secoes: [{ nome: 'refrao', inicioBeat: 8, aCada: 2, poses: ['estrela', 'coracao', 'mola'] }],
        },
      },
      20,
    );
    const ev = expandSections(c, 'facil');
    expect(ev.map((e) => e.beat)).toEqual([8, 10, 12, 14, 16, 18]);
    expect(ev.map((e) => e.pose)).toEqual(['estrela', 'coracao', 'mola', 'estrela', 'coracao', 'mola']);
  });

  it('regra 3: item pode ser texto ou objeto com mirror', () => {
    const c = make(
      {
        facil: {
          secoes: [
            { nome: 'a', inicioBeat: 4, aCada: 4, poses: ['bolhas', { pose: 'bolhas', mirror: true }] },
          ],
        },
      },
      12,
    );
    const ev = expandSections(c, 'facil');
    expect(ev).toEqual([
      { beat: 4, pose: 'bolhas', mirror: false, holdBeats: 0, secao: 'a' },
      { beat: 8, pose: 'bolhas', mirror: true, holdBeats: 0, secao: 'a' },
    ]);
  });

  it('regra 4: segurar vale para o último evento e nenhuma pose nova entra durante a segurada', () => {
    const c = make(
      {
        facil: {
          secoes: [
            { nome: 'a', inicioBeat: 8, aCada: 2, poses: ['estrela'] },
            { nome: 'final', inicioBeat: 16, aCada: 2, poses: ['raio-de-sol'], segurar: 4 },
          ],
        },
      },
      24,
    );
    const ev = expandSections(c, 'facil');
    const final = ev.filter((e) => e.secao === 'final');
    expect(final.map((e) => e.beat)).toEqual([16, 18, 20]);
    expect(final.map((e) => e.holdBeats)).toEqual([0, 0, 4]);
    // eventos explícitos dentro de uma segurada são descartados
    const d = make({
      facil: {
        eventos: [
          { beat: 8, pose: 'estrela', holdBeats: 4 },
          { beat: 10, pose: 'coracao' },
          { beat: 12, pose: 'mola' },
        ],
      },
    });
    expect(expandSections(d, 'facil').map((e) => e.beat)).toEqual([8, 12]);
  });

  it('regra 5: eventos prontos vencem as seções', () => {
    const c = make({
      facil: {
        secoes: [{ nome: 'a', inicioBeat: 4, aCada: 4, poses: ['estrela'] }],
        eventos: [
          { beat: 12, pose: 'coracao' },
          { beat: 6, pose: 'mola', mirror: true },
        ],
      },
    });
    expect(expandSections(c, 'facil')).toEqual([
      { beat: 6, pose: 'mola', mirror: true, holdBeats: 0, secao: 'gravada' },
      { beat: 12, pose: 'coracao', mirror: false, holdBeats: 0, secao: 'gravada' },
    ]);
  });

  it('regra 6: a primeira pose nunca cai antes da batida 4', () => {
    const c = make(
      {
        facil: { secoes: [{ nome: 'intro', inicioBeat: 0, aCada: 4, poses: ['pose-de-idol', 'microfone'] }] },
        normal: {
          eventos: [
            { beat: 1, pose: 'estrela' },
            { beat: 4, pose: 'coracao' },
          ],
        },
      },
      16,
    );
    const ev = expandSections(c, 'facil');
    expect(ev[0]).toMatchObject({ beat: 4, pose: 'pose-de-idol' });
    expect(ev.map((e) => e.beat)).toEqual([4, 8, 12]);
    expect(expandSections(c, 'normal').map((e) => e.beat)).toEqual([4]);
  });

  it('nível que não existe devolve lista vazia', () => {
    const c = make({ facil: { eventos: [{ beat: 8, pose: 'estrela' }] } });
    expect(expandSections(c, 'normal')).toEqual([]);
  });
});

describe('dados que vêm com o jogo', () => {
  const data = loadBaseData();

  it('catálogo tem as 18 poses, 12 fáceis e 6 normais', () => {
    const poses = Object.values(data.catalog);
    expect(poses).toHaveLength(18);
    expect(poses.filter((p) => p.nivel === 'facil')).toHaveLength(12);
    expect(poses.filter((p) => p.nivel === 'normal')).toHaveLength(6);
    expect(data.catalog['mao-no-queixo']).toBeUndefined();
  });

  it('as 6 coreografias passam no schema e só citam poses do catálogo', () => {
    expect(data.errors).toEqual([]);
    expect(data.songs.map((s) => s.id).sort()).toEqual([...BASE_SONG_IDS, DEMO_ID].sort());
    for (const s of data.songs) expect(missingPoses(s, data.catalog)).toEqual([]);
  });

  it('as 5 músicas saem com calibrado false e a demonstração com true', () => {
    for (const s of data.songs) expect(s.calibrado).toBe(s.id === DEMO_ID);
  });

  it('o ritmo das poses segue a regra dos 7 anos', () => {
    for (const s of data.songs) {
      for (const nivel of ['facil', 'normal'] as const) {
        const ev = expandSections(s, nivel);
        expect(ev.length).toBeGreaterThan(5);
        const gaps = ev.slice(1).map((e, i) => ((e.beat - ev[i].beat) * 60) / s.bpm);
        const min = Math.min(...gaps);
        if (nivel === 'facil') expect(min).toBeGreaterThanOrEqual(1.85);
        else expect(min).toBeGreaterThanOrEqual(0.95);
        expect(ev[0].beat).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('o fácil só usa poses de braço e dura de 60 a 90 segundos', () => {
    for (const s of data.songs.filter((x) => x.id !== DEMO_ID)) {
      for (const e of expandSections(s, 'facil')) expect(data.catalog[e.pose].nivel).toBe('facil');
      const { inicio, fim } = levelRange(s, 'facil');
      const secs = ((fim - inicio) * 60) / s.bpm;
      expect(secs).toBeGreaterThanOrEqual(60);
      expect(secs).toBeLessThanOrEqual(90);
    }
  });

  it('as variações do outro nível estão no lugar', () => {
    const by = (id: string) => data.songs.find((s) => s.id === id)!;
    const poses = (id: string, nivel: 'facil' | 'normal', secao: string) =>
      expandSections(by(id), nivel)
        .filter((e) => e.secao === secao)
        .map((e) => e.pose);
    expect(poses('brilho', 'normal', 'refrao2')).toContain('perna-de-lado');
    expect(poses('brilho', 'normal', 'refrao2')).not.toContain('estrela');
    expect(poses('brilho', 'normal', 'refrao')).toContain('estrela');
    expect(poses('meu-pequeno-guarana', 'normal', 'refrao')).toContain('mola');
    expect(poses('o-som-da-nossa-voz', 'normal', 'verso2')).toContain('inclinacao');
    const v2 = expandSections(by('o-som-da-nossa-voz'), 'normal').filter((e) => e.pose === 'inclinacao');
    expect(v2.some((e) => e.mirror)).toBe(true);
    expect(v2.some((e) => !e.mirror)).toBe(true);
    const letal = poses('letal', 'normal', 'refrao');
    letal.forEach((p, i) => {
      if (p === 'estrela' && i + 1 < letal.length) expect(letal[i + 1]).toBe('joelho-pra-cima');
    });
    expect(poses('nao-tem-perdao', 'facil', 'verso')).not.toContain('ciclista');
    expect(poses('nao-tem-perdao', 'normal', 'verso')).toContain('patinadora');
    const brilhoFinal = expandSections(by('brilho'), 'facil').at(-1)!;
    expect(brilhoFinal).toMatchObject({ pose: 'raio-de-sol', holdBeats: 4 });
    const vozFinal = expandSections(by('o-som-da-nossa-voz'), 'normal').at(-1)!;
    expect(vozFinal).toMatchObject({ pose: 'coracao', holdBeats: 8 });
  });

  it('a demonstração tem 120 BPM e 64 batidas', () => {
    const demo = data.songs.find((s) => s.id === DEMO_ID)!;
    expect(demo.bpm).toBe(120);
    expect(demo.duracaoBeats).toBe(64);
    expect(expandSections(demo, 'facil')).toHaveLength(15);
  });
});

describe('schema', () => {
  it('recusa nível sem seções nem eventos e ângulo fora de 0..180', () => {
    expect(
      ChoreoSchema.safeParse({
        id: 'x',
        title: 'X',
        bpm: 120,
        offsetMs: 0,
        calibrado: false,
        duracaoBeats: 8,
        niveis: { facil: {} },
      }).success,
    ).toBe(false);
    expect(
      ChoreoSchema.safeParse({
        id: 'x',
        title: 'X',
        bpm: 120,
        offsetMs: 0,
        calibrado: false,
        duracaoBeats: 8,
        niveis: {},
      }).success,
    ).toBe(false);
  });
});
