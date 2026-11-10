// Liga a fonte de pose ao resto do jogo: filtro One Euro, ângulos e taxa de detecção.
import { computeAngles, meanVisibility, type MeasuredAngles } from './angles';
import { LandmarkSmoother } from './oneEuro';
import { LM, MAIN_POINTS } from './skeleton';
import type { Landmark, PoseSource } from './types';

export interface TrackedPerson extends MeasuredAngles {
  lm: Landmark[];
  /** Visibilidade média dos 12 pontos principais. */
  meanVis: number;
}

export class PoseTracker {
  source: PoseSource | null = null;
  people: TrackedPerson[] = [];
  /** Detecções por segundo. */
  detFps = 0;
  /** Detecta em quadros alternados (ligado quando o aparelho cai abaixo de 20 fps). */
  alternate = false;
  /** Conta as detecções, para os testes saberem que os pontos estão chegando. */
  frames = 0;
  private smoothers = [new LandmarkSmoother(), new LandmarkSmoother()];
  private lastDet = 0;
  private skip = false;

  get aspect(): number {
    return this.source?.aspect ?? 4 / 3;
  }

  setSource(source: PoseSource | null): void {
    this.source?.stop();
    this.source = source;
    this.people = [];
    this.smoothers.forEach((s) => s.reset());
  }

  /** Chamado uma vez por quadro, com o tempo do relógio de áudio. */
  update(t: number): void {
    if (!this.source) return;
    if (this.alternate) {
      this.skip = !this.skip;
      if (this.skip) return;
    }
    const frame = this.source.next(t);
    if (!frame) return;
    const now = performance.now();
    if (this.lastDet > 0) {
      const inst = 1000 / Math.max(1, now - this.lastDet);
      this.detFps = this.detFps === 0 ? inst : this.detFps * 0.9 + inst * 0.1;
    }
    this.lastDet = now;
    this.frames++;
    // Ordem estável: quem aparece à esquerda da tela (espelhada) vem primeiro.
    const sorted = [...frame.people]
      .filter((p) => p.length >= 33)
      .sort((a, b) => b[LM.lHip].x + b[LM.rHip].x - (a[LM.lHip].x + a[LM.rHip].x))
      .slice(0, 2);
    const aspect = this.aspect;
    this.people = sorted.map((raw, i) => {
      const lm = this.smoothers[i].smooth(raw, now / 1000);
      return { lm, ...computeAngles(lm, aspect), meanVis: meanVisibility(lm, MAIN_POINTS) };
    });
    if (sorted.length < 2) this.smoothers[1].reset();
    if (sorted.length < 1) this.smoothers[0].reset();
  }
}
