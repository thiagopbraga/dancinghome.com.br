// Registro das cenas: cada cena é aberta pelo nome com game.go('nome', parâmetros).
import type { Game } from '../game';
import { EsqueletoScene } from './Esqueleto';
import { InicioScene } from './Inicio';
import { MetronomoScene } from './Metronomo';
import { SemCameraScene } from './SemCamera';

export function registerScenes(game: Game): void {
  const r = game.routes;
  r.inicio = (g, p) => new InicioScene(g, (p as string | undefined) ?? 'esqueleto');
  r.metronomo = (g) => new MetronomoScene(g);
  r.esqueleto = (g) => new EsqueletoScene(g);
  r.semCamera = (g, p) => new SemCameraScene(g, (p as string | undefined) ?? 'esqueleto');
}
