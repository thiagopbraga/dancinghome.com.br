// Registro das cenas: cada cena é aberta pelo nome com game.go('nome', parâmetros).
import { DEMO_ID } from '../../data/songs';
import type { Game } from '../game';
import { defaultConfig, type MatchSetup, type Outcome } from '../match';
import { CalibracaoScene } from './Calibracao';
import { ContagemScene } from './Contagem';
import { DancaScene } from './Danca';
import { EsqueletoScene } from './Esqueleto';
import { GravarPoseScene } from './GravarPose';
import { InicioScene } from './Inicio';
import { MenuScene } from './Menu';
import { MetronomoScene } from './Metronomo';
import { MusicasScene, type MusicasParams } from './Musicas';
import { PaisScene, type PaisParams } from './Pais';
import { ResultadoScene } from './Resultado';
import { SemCameraScene } from './SemCamera';

/** Partida padrão para abrir a dança direto (?cena=danca): demonstração no fácil. */
function demoSetup(game: Game): MatchSetup {
  const choreo = game.song(DEMO_ID);
  if (!choreo) throw new Error('música de demonstração ausente');
  return { cfg: defaultConfig(DEMO_ID), choreo, buffer: game.demoAudio() };
}

export function registerScenes(game: Game): void {
  const r = game.routes;
  r.inicio = (g, p) => new InicioScene(g, (p as string | undefined) ?? 'menu');
  r.metronomo = (g) => new MetronomoScene(g);
  r.esqueleto = (g) => new EsqueletoScene(g);
  r.semCamera = (g, p) => new SemCameraScene(g, (p as string | undefined) ?? 'menu');
  r.menu = (g) => new MenuScene(g);
  r.musicas = (g, p) => new MusicasScene(g, (p as MusicasParams | undefined) ?? { modo: 'show' });
  r.calibracao = (g, p) => new CalibracaoScene(g, (p as MatchSetup | undefined) ?? demoSetup(g));
  r.contagem = (g, p) => new ContagemScene(g, (p as MatchSetup | undefined) ?? demoSetup(g));
  r.danca = (g, p) => new DancaScene(g, (p as MatchSetup | undefined) ?? demoSetup(g));
  r.pais = (g, p) => new PaisScene(g, (p as PaisParams | undefined) ?? {});
  r.gravarPose = (g, p) => new GravarPoseScene(g, (p as string | undefined) ?? 'estrela');
  r.resultado = (g, p) => new ResultadoScene(g, p as Outcome);
}
