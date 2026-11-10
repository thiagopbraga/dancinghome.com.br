// Carga e validação dos JSON que vêm com o jogo (sem áudio).
import type { Catalog } from '../core/types';
import { missingPoses } from './choreo';
import catalogJson from './poses/catalog.json';
import { CatalogSchema, ChoreoSchema, describeZodError, type Choreo } from './schema';
import brilho from './songs/brilho/choreo.json';
import demo from './songs/ensaio-aquecimento/choreo.json';
import letal from './songs/letal/choreo.json';
import guarana from './songs/meu-pequeno-guarana/choreo.json';
import perdao from './songs/nao-tem-perdao/choreo.json';
import voz from './songs/o-som-da-nossa-voz/choreo.json';

export const DEMO_ID = 'ensaio-aquecimento';
export const BASE_SONG_IDS = [
  'brilho',
  'meu-pequeno-guarana',
  'o-som-da-nossa-voz',
  'letal',
  'nao-tem-perdao',
];

export interface BaseData {
  catalog: Catalog;
  songs: Choreo[];
  errors: string[];
}

export function loadBaseData(): BaseData {
  const errors: string[] = [];
  let catalog: Catalog = {};
  const cat = CatalogSchema.safeParse(catalogJson);
  if (cat.success) catalog = cat.data;
  else errors.push(`catalog.json: ${describeZodError(cat.error)}`);

  const songs: Choreo[] = [];
  for (const raw of [demo, brilho, guarana, voz, letal, perdao]) {
    const parsed = ChoreoSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(`${(raw as { id?: string }).id ?? 'música'}: ${describeZodError(parsed.error)}`);
      continue;
    }
    const missing = missingPoses(parsed.data, catalog);
    if (missing.length > 0) {
      errors.push(`${parsed.data.id}: poses que não existem no catálogo: ${missing.join(', ')}`);
      continue;
    }
    songs.push(parsed.data);
  }
  return { catalog, songs, errors };
}
