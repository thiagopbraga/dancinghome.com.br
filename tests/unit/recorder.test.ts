import { describe, expect, it } from 'vitest';
import { buildRecording, cleanSnapshot, poseDistance, type Snapshot } from '../../src/core/recorder';
import { REST } from '../../src/core/skeleton';
import type { AngleName, Angles } from '../../src/core/types';
import { loadBaseData } from '../../src/data/songs';

const { catalog } = loadBaseData();
const VIS = Object.fromEntries(Object.keys(REST).map((k) => [k, 0.9])) as Record<AngleName, number>;

function retrato(beat: number, angles: Angles, vis: Partial<Record<AngleName, number>> = {}): Snapshot {
  return { beat, angles: { ...REST, ...angles }, vis: { ...VIS, ...vis } };
}

describe('limpeza dos retratos', () => {
  it('descarta quem está só em pé, parada', () => {
    expect(cleanSnapshot(retrato(4, {}))).toBeNull();
  });

  it('descarta retratos com pouca visibilidade nos braços', () => {
    expect(cleanSnapshot(retrato(4, { lShoulder: 90, rShoulder: 90 }, { lElbow: 0.2 }))).toBeNull();
  });

  it('pose só de braços não cobra as pernas que não se mexeram', () => {
    const a = cleanSnapshot(retrato(4, { lShoulder: 90.4, rShoulder: 88.6 }));
    expect(a).toEqual({ lShoulder: 90, rShoulder: 89, lElbow: REST.lElbow, rElbow: REST.rElbow });
  });

  it('perna levantada entra na pose; a outra, parada, não', () => {
    const a = cleanSnapshot(retrato(4, { lShoulder: 90, rShoulder: 90, rHip: 100, rKnee: 90 }))!;
    expect(a.rHip).toBe(100);
    expect(a.rKnee).toBe(90);
    expect(a.lHip).toBeUndefined();
    expect(a.lKnee).toBeUndefined();
  });

  it('perna que não aparece na câmera fica de fora, sem descartar o retrato', () => {
    const a = cleanSnapshot(
      retrato(4, { lShoulder: 150, rShoulder: 150, rHip: 100, rKnee: 90 }, { rKnee: 0.1 }),
    )!;
    expect(a.rHip).toBeUndefined();
    expect(a.lShoulder).toBe(150);
  });
});

describe('montagem da coreografia gravada', () => {
  it('reaproveita poses do catálogo e cria as novas', () => {
    const estrela = catalog.estrela.angles;
    const nova = { lShoulder: 60, rShoulder: 120, lElbow: 90, rElbow: 90 };
    const r = buildRecording(
      [
        retrato(4, { ...estrela, lShoulder: 96 }),
        retrato(8, nova),
        retrato(12, {}),
        retrato(16, { ...nova, lShoulder: 66 }),
        retrato(20, { lShoulder: 90, rShoulder: 90 }, { rShoulder: 0.1 }),
      ],
      catalog,
      'minha-x',
    );
    expect(r.eventos).toEqual([
      { beat: 4, pose: 'estrela' },
      { beat: 8, pose: 'minha-x-1' },
      { beat: 16, pose: 'minha-x-1' },
    ]);
    expect(r.descartados).toBe(2);
    expect(Object.keys(r.novas)).toEqual(['minha-x-1']);
    expect(r.novas['minha-x-1']).toMatchObject({ nome: 'Pose nova 1', nivel: 'facil', angles: nova });
  });

  it('pose nova com perna é do nível normal', () => {
    const r = buildRecording(
      [retrato(4, { lShoulder: 60, rShoulder: 130, lHip: 110, lKnee: 100 })],
      catalog,
      'p',
    );
    expect(r.novas['p-1'].nivel).toBe('normal');
  });

  it('poses com conjuntos de ângulos diferentes nunca são a mesma', () => {
    expect(poseDistance({ lShoulder: 90 }, { lShoulder: 90, rShoulder: 90 })).toBe(Infinity);
    expect(poseDistance({ lShoulder: 90, rShoulder: 80 }, { lShoulder: 100, rShoulder: 90 })).toBe(10);
  });
});
