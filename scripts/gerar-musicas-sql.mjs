#!/usr/bin/env node
// Gera worker/migrations/0002_musicas.sql a partir das coreografias públicas (origem: "demo").
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_SONG_IDS = ['ensaio-aquecimento', 'ensaio-brisa', 'ensaio-festa'];
const MIN_FIRST_BEAT = 4;

function levelRange(choreo, nivel) {
  const trecho = choreo.niveis[nivel]?.trecho;
  const inicio = trecho?.inicioBeat ?? 0;
  const fim = Math.min(trecho?.fimBeat ?? choreo.duracaoBeats, choreo.duracaoBeats);
  return { inicio, fim: Math.max(fim, inicio) };
}

function refToPose(ref) {
  return typeof ref === 'string'
    ? { pose: ref, mirror: false }
    : { pose: ref.pose, mirror: ref.mirror ?? false };
}

function expandSections(choreo, nivel) {
  const def = choreo.niveis[nivel];
  if (!def) return [];
  const { inicio, fim } = levelRange(choreo, nivel);
  const primeira = inicio + MIN_FIRST_BEAT;
  let events = [];

  if (def.eventos && def.eventos.length > 0) {
    events = def.eventos.map((e) => ({
      beat: e.beat,
      pose: e.pose,
      mirror: e.mirror ?? false,
      holdBeats: e.holdBeats ?? 0,
      secao: e.secao ?? 'gravada',
    }));
  } else {
    const secoes = [...(def.secoes ?? [])].sort((a, b) => a.inicioBeat - b.inicioBeat);
    secoes.forEach((sec, i) => {
      const end = Math.min(secoes[i + 1]?.inicioBeat ?? fim, fim);
      const from = Math.max(sec.inicioBeat, primeira);
      const k0 = Math.max(0, Math.ceil((from - sec.inicioBeat) / sec.aCada - 1e-9));
      const beats = [];
      for (let k = k0; sec.inicioBeat + k * sec.aCada < end - 1e-9; k++) {
        beats.push(sec.inicioBeat + k * sec.aCada);
      }
      if (sec.segurar) {
        while (beats.length > 1 && beats[beats.length - 1] + sec.segurar > end + 1e-9) beats.pop();
      }
      beats.forEach((beat, j) => {
        const { pose, mirror } = refToPose(sec.poses[j % sec.poses.length]);
        const last = j === beats.length - 1;
        events.push({
          beat,
          pose,
          mirror,
          holdBeats: last && sec.segurar ? sec.segurar : 0,
          secao: sec.nome,
        });
      });
    });
  }

  events.sort((a, b) => a.beat - b.beat);
  const out = [];
  let holdUntil = -Infinity;
  for (const e of events) {
    if (e.beat < primeira - 1e-9 || e.beat >= fim - 1e-9) continue;
    if (e.beat < holdUntil - 1e-9) continue;
    out.push(e);
    if (e.holdBeats > 0) holdUntil = e.beat + e.holdBeats;
  }
  return out;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const lines = [
  '-- worker/migrations/0002_musicas.sql',
  '-- Gerado automaticamente por scripts/gerar-musicas-sql.mjs a partir de src/data/songs/*/choreo.json',
  '',
];

for (const songId of PUBLIC_SONG_IDS) {
  const path = resolve(root, 'src', 'data', 'songs', songId, 'choreo.json');
  const choreo = JSON.parse(readFileSync(path, 'utf-8'));
  if (choreo.origem !== 'demo') {
    throw new Error(`Música pública ${songId} precisa ter origem "demo".`);
  }
  for (const nivel of ['facil', 'normal']) {
    if (!choreo.niveis[nivel]) continue;
    const { inicio, fim } = levelRange(choreo, nivel);
    const duracaoMs = Math.round(((fim - inicio) * 60 * 1000) / choreo.bpm);
    const numPoses = expandSections(choreo, nivel).length;
    lines.push(
      `INSERT OR REPLACE INTO musica (id, titulo, nivel, versao, duracao_ms, num_poses, ativa) VALUES (${sqlString(choreo.id)}, ${sqlString(choreo.title)}, ${sqlString(nivel)}, 1, ${duracaoMs}, ${numPoses}, 1);`,
    );
  }
}

lines.push('');
const outPath = resolve(root, 'worker', 'migrations', '0002_musicas.sql');
writeFileSync(outPath, lines.join('\n'), 'utf-8');
console.log(`Gerado ${outPath}`);
