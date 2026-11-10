import { describe, expect, it } from 'vitest';
import { angleAt, computeAngles, mirrorAngles, raisedArmLabel } from '../../src/core/angles';
import { buildSkeleton, LM, skeletonToLandmarks } from '../../src/core/skeleton';
import { ANGLE_NAMES, type Angles, type Landmark } from '../../src/core/types';
import { loadBaseData } from '../../src/data/songs';

function blank(): Landmark[] {
  return Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
}

describe('angleAt', () => {
  it('dá 90° e 180° em pontos sintéticos com erro abaixo de 1°', () => {
    expect(Math.abs(angleAt({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }) - 90)).toBeLessThan(1);
    expect(Math.abs(angleAt({ x: -2, y: 0 }, { x: 0, y: 0 }, { x: 3, y: 0 }) - 180)).toBeLessThan(1);
    expect(Math.abs(angleAt({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }) - 45)).toBeLessThan(1);
  });
});

describe('computeAngles', () => {
  it('cotovelo em L dá 90° e braço esticado dá 180°, com a correção de proporção do vídeo', () => {
    const aspect = 4 / 3;
    const lm = blank();
    // braço esquerdo: ombro -> cotovelo para o lado, antebraço para cima (L)
    lm[LM.lShoulder] = { x: 0.6, y: 0.3, z: 0, visibility: 1 };
    lm[LM.lElbow] = { x: 0.6 + 0.12 / aspect, y: 0.3, z: 0, visibility: 1 };
    lm[LM.lWrist] = { x: 0.6 + 0.12 / aspect, y: 0.18, z: 0, visibility: 1 };
    lm[LM.lHip] = { x: 0.6, y: 0.6, z: 0, visibility: 1 };
    // braço direito esticado para o lado
    lm[LM.rShoulder] = { x: 0.4, y: 0.3, z: 0, visibility: 1 };
    lm[LM.rElbow] = { x: 0.3, y: 0.3, z: 0, visibility: 0.9 };
    lm[LM.rWrist] = { x: 0.2, y: 0.3, z: 0, visibility: 0.7 };
    lm[LM.rHip] = { x: 0.4, y: 0.6, z: 0, visibility: 1 };
    const { angles, vis } = computeAngles(lm, aspect);
    expect(Math.abs(angles.lElbow - 90)).toBeLessThan(1);
    expect(Math.abs(angles.lShoulder - 90)).toBeLessThan(1);
    expect(Math.abs(angles.rElbow - 180)).toBeLessThan(1);
    expect(Math.abs(angles.rShoulder - 90)).toBeLessThan(1);
    expect(vis.rElbow).toBeCloseTo(0.7);
  });

  it('o esqueleto montado a partir dos ângulos devolve os mesmos ângulos (todas as poses do catálogo)', () => {
    const { catalog } = loadBaseData();
    for (const [id, pose] of Object.entries(catalog)) {
      for (const target of [pose.angles, mirrorAngles(pose.angles)]) {
        const lm = skeletonToLandmarks(buildSkeleton(target), {
          cx: 0.5,
          cy: 0.55,
          scale: 0.22,
          aspect: 4 / 3,
        });
        const { angles } = computeAngles(lm, 4 / 3);
        for (const name of ANGLE_NAMES) {
          const t = target[name];
          if (t !== undefined) expect(Math.abs(angles[name] - t), `${id}.${name}`).toBeLessThan(0.5);
        }
      }
    }
  });

  it('o lado direito da pessoa fica à esquerda da imagem sem espelhar', () => {
    const sk = buildSkeleton({ rShoulder: 170 });
    const lm = skeletonToLandmarks(sk, { cx: 0.5, cy: 0.55, scale: 0.22, aspect: 4 / 3 });
    expect(lm[LM.rShoulder].x).toBeLessThan(lm[LM.lShoulder].x);
    expect(lm[LM.rWrist].y).toBeLessThan(lm[LM.rShoulder].y);
    expect(lm[LM.lWrist].y).toBeGreaterThan(lm[LM.lShoulder].y);
    expect(raisedArmLabel(computeAngles(lm, 4 / 3).angles)).toBe('braço direito');
  });
});

describe('mirrorAngles', () => {
  it('troca cada ângulo l* pelo r* correspondente', () => {
    const a: Angles = { lShoulder: 150, lElbow: 100, rShoulder: 30, rKnee: 90 };
    expect(mirrorAngles(a)).toEqual({ rShoulder: 150, rElbow: 100, lShoulder: 30, lKnee: 90 });
    expect(mirrorAngles(mirrorAngles(a))).toEqual(a);
  });
});
