import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import type { Summary } from '../../src/core/stars';
import {
  applyMatch,
  bestStars,
  CONQUISTAS,
  newAchievements,
  totalStars,
  unlockedBetween,
  type MatchFacts,
} from '../../src/data/progress';
import { defaultProgress, Storage } from '../../src/data/storage';

function resumo(stars: 1 | 2 | 3, perfeitos = 0, seq = 0): Summary {
  return {
    posePoints: stars * 300,
    energyPoints: 0,
    score: stars * 300,
    pct: stars / 3,
    stars,
    perfeitos,
    maiorSequencia: seq,
  };
}

function fatos(over: Partial<MatchFacts> = {}): MatchFacts {
  return {
    key: 'brilho:facil',
    summary: resumo(2),
    pontos: 600,
    treino: false,
    dupla: false,
    surpresa: false,
    estatuas: 0,
    ...over,
  };
}

describe('progresso', () => {
  it('guarda o melhor resultado por música e nível', () => {
    let p = defaultProgress();
    let r = applyMatch(p, fatos());
    expect(r.recorde).toBe(false); // a primeira vez não é "novo recorde"
    p = r.progress;
    expect(p.melhores['brilho:facil']).toEqual({ estrelas: 2, pct: 2 / 3, pontos: 600 });
    r = applyMatch(p, fatos({ summary: resumo(1), pontos: 300 }));
    expect(r.recorde).toBe(false);
    expect(r.progress.melhores['brilho:facil'].pontos).toBe(600);
    r = applyMatch(p, fatos({ summary: resumo(3), pontos: 900 }));
    expect(r.recorde).toBe(true);
    expect(r.progress.melhores['brilho:facil'].estrelas).toBe(3);
    expect(r.progress.musicasTocadas).toBe(2);
  });

  it('soma as estrelas de cada música e nível', () => {
    let p = defaultProgress();
    p = applyMatch(p, fatos({ key: 'brilho:facil', summary: resumo(3), pontos: 900 })).progress;
    p = applyMatch(p, fatos({ key: 'brilho:normal', summary: resumo(1), pontos: 100 })).progress;
    p = applyMatch(p, fatos({ key: 'letal:facil', summary: resumo(2), pontos: 500 })).progress;
    expect(totalStars(p)).toBe(6);
    expect(bestStars(p, 'brilho')).toBe(3);
    expect(bestStars(p, 'letal')).toBe(2);
    expect(bestStars(p, 'guarana')).toBe(0);
  });

  it('treino conta treinos e não mexe nos recordes', () => {
    const r = applyMatch(defaultProgress(), fatos({ treino: true }));
    expect(r.progress.treinos).toBe(1);
    expect(r.progress.musicasTocadas).toBe(0);
    expect(r.progress.melhores).toEqual({});
  });

  it('libera medalhas nos limites certos', () => {
    const p = defaultProgress();
    expect(newAchievements(p)).toEqual([]);
    expect(CONQUISTAS.length).toBeGreaterThanOrEqual(8);
    p.musicasTocadas = 9;
    p.maiorSequencia = 4;
    expect(newAchievements(p).map((c) => c.id)).toEqual(['estreia']);
    p.musicasTocadas = 10;
    p.maiorSequencia = 5;
    expect(newAchievements(p).map((c) => c.id)).toEqual(['estreia', 'dez-musicas', 'cinco-seguidos']);
    p.conquistas = ['estreia', 'dez-musicas'];
    expect(newAchievements(p).map((c) => c.id)).toEqual(['cinco-seguidos']);
  });

  it('desbloqueios por total de estrelas: 5, 15 e 30', () => {
    const itens = [
      { id: 'sala', estrelas: 0 },
      { id: 'palco', estrelas: 5 },
      { id: 'patins', estrelas: 15 },
      { id: 'ciclovia', estrelas: 30 },
    ];
    expect(unlockedBetween(itens, 0, 4)).toEqual([]);
    expect(unlockedBetween(itens, 4, 5).map((i) => i.id)).toEqual(['palco']);
    expect(unlockedBetween(itens, 5, 14)).toEqual([]);
    expect(unlockedBetween(itens, 14, 31).map((i) => i.id)).toEqual(['patins', 'ciclovia']);
  });
});

describe('armazenamento', () => {
  it('progresso e configurações voltam depois de fechar e abrir', async () => {
    let s = await Storage.open('teste-1');
    const p = applyMatch(defaultProgress(), fatos()).progress;
    await s.saveProgress(p);
    const cfg = await s.settings();
    await s.saveSettings({ ...cfg, modelo: 'full', volume: 0.4 });
    s.close();
    s = await Storage.open('teste-1');
    expect(await s.progress()).toEqual(p);
    expect((await s.settings()).modelo).toBe('full');
    expect((await s.settings()).volume).toBe(0.4);
    s.close();
  });

  it('exportar e importar devolve os mesmos dados, sem o áudio', async () => {
    const a = await Storage.open('teste-2');
    await a.saveProgress(applyMatch(defaultProgress(), fatos()).progress);
    await a.savePose('minha-pose', {
      nome: 'Pose da Lua',
      nivel: 'facil',
      angles: { lShoulder: 120, rShoulder: 30 },
      descricao: 'Um braço para cima',
    });
    await a.saveAudio({ id: 'brilho', nome: 'brilho.mp3', tipo: 'audio/mpeg', dados: new ArrayBuffer(8) });
    const exportado = await a.exportAll();
    expect(JSON.stringify(exportado)).not.toContain('brilho.mp3');
    const b = await Storage.open('teste-3');
    await b.importAll(JSON.parse(JSON.stringify(exportado)));
    expect(await b.exportAll()).toEqual(exportado);
    expect(await b.audioIds()).toEqual([]);
    await expect(b.importAll({ app: 'outro' })).rejects.toThrow();
    a.close();
    b.close();
  });
});
