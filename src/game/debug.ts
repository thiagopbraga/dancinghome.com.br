// Painel ?debug=1: fps, visibilidade média e os 8 ângulos ao vivo.
import { raisedArmLabel } from '../core/angles';
import { ANGLE_NAMES, type AngleName } from '../core/types';
import { font, roundRect } from './draw/util';
import type { View } from './engine';
import type { Game } from './game';

const NOMES: Record<AngleName, string> = {
  lShoulder: 'ombro esquerdo',
  rShoulder: 'ombro direito',
  lElbow: 'cotovelo esquerdo',
  rElbow: 'cotovelo direito',
  lHip: 'quadril esquerdo',
  rHip: 'quadril direito',
  lKnee: 'joelho esquerdo',
  rKnee: 'joelho direito',
};

export function debugLines(game: Game): string[] {
  const tr = game.tracker;
  const lines = [
    `fps ${game.engine.fps.toFixed(0)} · detecção ${tr.detFps.toFixed(0)}/s${tr.alternate ? ' (alternada)' : ''}`,
  ];
  const p = tr.people[0];
  if (!p) {
    lines.push(`pose: ${game.poseState}`);
    return lines;
  }
  lines.push(`visibilidade média ${p.meanVis.toFixed(2)}`);
  for (const name of ANGLE_NAMES) lines.push(`${NOMES[name]}: ${p.angles[name].toFixed(0)}°`);
  lines.push(`mais levantado: ${raisedArmLabel(p.angles)}`);
  return lines;
}

export function drawDebug(g: CanvasRenderingContext2D, v: View, game: Game): void {
  const lines = debugLines(game);
  const x = v.left + 12;
  const y = v.top + 12;
  g.save();
  roundRect(g, x, y, 330, 22 + lines.length * 24, 12);
  g.fillStyle = 'rgba(0,0,0,0.72)';
  g.fill();
  g.font = font(19, 600);
  g.textAlign = 'left';
  g.textBaseline = 'top';
  lines.forEach((l, i) => {
    g.fillStyle = i === lines.length - 1 && lines.length > 3 ? '#ffd640' : '#ffffff';
    g.fillText(l, x + 12, y + 12 + i * 24);
  });
  g.restore();
}
