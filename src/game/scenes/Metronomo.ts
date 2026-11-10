// Tela de teste da etapa 2: toca a música de demonstração e pisca a cada batida (?cena=metronomo).
import { COR, fillView, text, verticalGradient } from '../draw/util';
import { BASE_H, BASE_W, type Scene, type View } from '../engine';
import type { Game } from '../game';
import { DEMO_ID } from '../../data/songs';
import { T } from '../texts';

export class MetronomoScene implements Scene {
  readonly name = 'metronomo';
  private started = false;

  constructor(private readonly game: Game) {}

  enter(): void {
    this.tryStart();
  }

  exit(): void {
    this.game.audio.stop();
  }

  private tryStart(): void {
    const { audio } = this.game;
    const ctx = audio.ensure();
    if (ctx.state !== 'running' || this.started) return;
    const demo = this.game.song(DEMO_ID);
    audio.load(this.game.demoAudio(), demo?.bpm ?? this.game.demoBpm, demo?.offsetMs ?? 0);
    audio.play(0);
    this.started = true;
  }

  pointer(kind: 'down' | 'move' | 'up'): void {
    if (kind === 'down') this.tryStart();
  }

  update(): void {
    if (!this.started) this.tryStart();
    const clock = this.game.audio.clock;
    if (this.started && clock && clock.position() >= this.game.audio.duration) this.game.audio.play(0);
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    fillView(g, v, verticalGradient(g, v, COR.roxo, '#3d1a85'));
    const clock = this.game.audio.clock;
    if (!this.started || !clock) {
      text(g, T.tocarParaComecar, BASE_W / 2, BASE_H / 2, { size: 64 });
      return;
    }
    const beat = clock.beat();
    const frac = beat - Math.floor(beat);
    const pulse = beat >= 0 ? Math.max(0, 1 - frac * 3) : 0;
    const forte = Math.floor(beat) % 4 === 0;
    g.beginPath();
    g.arc(BASE_W / 2, BASE_H / 2 - 40, 120 + pulse * 50, 0, Math.PI * 2);
    g.fillStyle = pulse > 0.05 ? (forte ? COR.amarelo : COR.rosa) : 'rgba(255,255,255,0.15)';
    g.fill();
    text(g, String(Math.max(0, Math.floor(beat)) + 1), BASE_W / 2, BASE_H / 2 - 40, {
      size: 110,
      color: COR.tinta,
    });
    text(g, `${clock.bpm} BPM`, BASE_W / 2, BASE_H - 120, { size: 48 });
  }
}
