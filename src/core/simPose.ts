// Pose simulada para testar sem câmera (?sim=1): monta os 33 pontos a partir dos ângulos-alvo,
// com o mesmo esqueleto do boneco dos cartões, e acrescenta um pouco de ruído.
import { mirrorAngles } from './angles';
import { landmarkForCursor } from './gestures';
import { buildSkeleton, LM, REST, skeletonToLandmarks } from './skeleton';
import {
  ANGLE_NAMES,
  type AngleName,
  type Angles,
  type AudioClock,
  type Catalog,
  type ChoreoEvent,
  type Landmark,
  type PoseFrame,
  type PoseSource,
} from './types';

/** O que a pessoa simulada faz em cada evento da coreografia. */
export type SimAction = 'acertar' | 'sumir' | { errar: number };

export type SimGesture =
  { tipo: 'mao'; x: number; y: number } | { tipo: 'maosProAlto' } | { tipo: 'pose'; angles: Angles };

export interface SimScript {
  padrao: SimAction;
  porEvento: Record<number, SimAction>;
  gesto: SimGesture | null;
  /** Fica imóvel (para a pose congelada). */
  parado: boolean;
  /** Some da câmera (visibilidade zero em tudo). */
  ausente: boolean;
}

export function defaultScript(): SimScript {
  return { padrao: 'acertar', porEvento: {}, gesto: null, parado: false, ausente: false };
}

interface Timeline {
  events: ChoreoEvent[];
  catalog: Catalog;
  clock: AudioClock;
}

const UP: Angles = { lShoulder: 172, rShoulder: 172, lElbow: 172, rElbow: 172 };

export class SimulatedPoseSource implements PoseSource {
  readonly aspect = 4 / 3;
  numPeople = 1;
  readonly scripts: SimScript[] = [defaultScript(), defaultScript()];
  private timeline: Timeline | null = null;
  private current: Record<AngleName, number>[] = [{ ...REST }, { ...REST }];
  private lastReal = 0;
  private started = false;

  async start(): Promise<void> {
    this.started = true;
    this.lastReal = performance.now();
  }

  stop(): void {
    this.started = false;
  }

  setTimeline(events: ChoreoEvent[], catalog: Catalog, clock: AudioClock): void {
    this.timeline = { events, catalog, clock };
  }

  clearTimeline(): void {
    this.timeline = null;
  }

  /** Volta o roteiro ao padrão (acertar tudo, sem gesto). */
  resetScripts(): void {
    this.scripts[0] = defaultScript();
    this.scripts[1] = defaultScript();
  }

  private timelineTarget(script: SimScript): { angles: Angles; hidden: boolean } | null {
    const tl = this.timeline;
    if (!tl) return null;
    const beat = tl.clock.beat();
    for (let i = 0; i < tl.events.length; i++) {
      const e = tl.events[i];
      if (e.beat + e.holdBeats + 0.6 < beat) continue;
      const prev = tl.events[i - 1];
      const gap = prev ? e.beat - prev.beat : 4;
      const lead = Math.min(1.5, gap / 2);
      if (beat < e.beat - lead) return { angles: REST, hidden: false };
      const action = script.porEvento[i] ?? script.padrao;
      const def = tl.catalog[e.pose];
      if (!def) return { angles: REST, hidden: false };
      let angles = e.mirror ? mirrorAngles(def.angles) : def.angles;
      if (action === 'sumir') return { angles, hidden: true };
      if (typeof action === 'object') {
        const wrong: Angles = {};
        for (const name of ANGLE_NAMES) {
          const v = angles[name];
          if (v === undefined) continue;
          wrong[name] = v + action.errar <= 180 ? v + action.errar : v - action.errar;
        }
        angles = wrong;
      }
      return { angles, hidden: false };
    }
    return { angles: REST, hidden: false };
  }

  next(t: number): PoseFrame | null {
    if (!this.started) return null;
    const real = performance.now();
    const dt = Math.min(0.1, (real - this.lastReal) / 1000);
    this.lastReal = real;
    const people: Landmark[][] = [];
    for (let p = 0; p < this.numPeople; p++) {
      const script = this.scripts[p];
      let target: Angles = REST;
      let hidden = script.ausente;
      const gesto = script.gesto;
      if (gesto?.tipo === 'maosProAlto') target = UP;
      else if (gesto?.tipo === 'pose') target = gesto.angles;
      else if (gesto?.tipo === 'mao') target = REST;
      else {
        const tt = this.timelineTarget(script);
        if (tt) {
          target = tt.angles;
          hidden = hidden || tt.hidden;
        }
      }
      const cur = this.current[p];
      const k = script.parado ? 0 : 1 - Math.exp(-dt * 16);
      const wobble = script.parado ? 0 : 1.2;
      const shown = {} as Record<AngleName, number>;
      ANGLE_NAMES.forEach((name, i) => {
        const goal = target[name] ?? REST[name];
        cur[name] += (goal - cur[name]) * k;
        shown[name] = Math.max(0, Math.min(180, cur[name] + wobble * Math.sin(real / 170 + i * 1.7 + p)));
      });
      const cx = this.numPeople === 1 ? 0.5 : p === 0 ? 0.7 : 0.3;
      const scale = this.numPeople === 1 ? 0.24 : 0.2;
      const lm = skeletonToLandmarks(buildSkeleton(shown), {
        cx,
        cy: 0.52,
        scale,
        aspect: this.aspect,
        visibility: hidden ? 0 : 0.97,
      });
      if (gesto?.tipo === 'mao' && !hidden) {
        const pos = landmarkForCursor(gesto.x, gesto.y, lm, this.aspect);
        if (pos) {
          const sh = lm[LM.rShoulder];
          for (const i of [LM.rWrist, 18, LM.rIndex, 22]) lm[i] = { ...lm[i], x: pos.x, y: pos.y };
          lm[LM.rElbow] = { ...lm[LM.rElbow], x: (sh.x + pos.x) / 2, y: (sh.y + pos.y) / 2 + 0.02 };
        }
      }
      people.push(lm);
    }
    return { t, people };
  }
}
