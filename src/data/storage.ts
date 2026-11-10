// Tudo que fica guardado no aparelho (IndexedDB): áudio, coreografias, poses, progresso e configurações.
// Nada disso sai do aparelho; a exportação gera um arquivo JSON que o adulto baixa.
import { openDB, type IDBPDatabase } from 'idb';
import type { Catalog, PoseDef } from '../core/types';
import {
  CatalogSchema,
  CharactersSchema,
  ChoreoSchema,
  ExportSchema,
  PoseDefSchema,
  ProgressSchema,
  SettingsSchema,
  type Characters,
  type Choreo,
  type ExportData,
  type Progress,
  type Settings,
} from './schema';

export const DB_NAME = 'ensaio-de-danca';

export interface StoredAudio {
  id: string;
  nome: string;
  tipo: string;
  dados: ArrayBuffer;
}

export function defaultCharacters(): Characters {
  return CharactersSchema.parse({
    idols: [
      { nome: 'Luna', cor: '#ff5fa8', cabelo: 0, cabeloCor: '#3a2a6b' },
      { nome: 'Mel', cor: '#ffd23f', cabelo: 1, cabeloCor: '#7a4a21' },
      { nome: 'Bia', cor: '#3ad6e0', cabelo: 2, cabeloCor: '#16121f' },
    ],
  });
}

export function defaultSettings(): Settings {
  return SettingsSchema.parse({});
}

export function defaultProgress(): Progress {
  return ProgressSchema.parse({});
}

export class Storage {
  private constructor(private readonly db: IDBPDatabase) {}

  static async open(name = DB_NAME): Promise<Storage> {
    const db = await openDB(name, 1, {
      upgrade(d) {
        d.createObjectStore('kv');
        d.createObjectStore('audio', { keyPath: 'id' });
        d.createObjectStore('choreos', { keyPath: 'id' });
        d.createObjectStore('poses');
      },
    });
    return new Storage(db);
  }

  close(): void {
    this.db.close();
  }

  async settings(): Promise<Settings> {
    const r = SettingsSchema.safeParse((await this.db.get('kv', 'settings')) ?? {});
    return r.success ? r.data : defaultSettings();
  }

  async saveSettings(s: Settings): Promise<void> {
    await this.db.put('kv', SettingsSchema.parse(s), 'settings');
  }

  async progress(): Promise<Progress> {
    const r = ProgressSchema.safeParse((await this.db.get('kv', 'progress')) ?? {});
    return r.success ? r.data : defaultProgress();
  }

  async saveProgress(p: Progress): Promise<void> {
    await this.db.put('kv', ProgressSchema.parse(p), 'progress');
  }

  async characters(): Promise<Characters> {
    const raw: unknown = await this.db.get('kv', 'characters');
    const r = CharactersSchema.safeParse(raw);
    return r.success ? r.data : defaultCharacters();
  }

  async saveCharacters(c: Characters): Promise<void> {
    await this.db.put('kv', CharactersSchema.parse(c), 'characters');
  }

  // Áudio: fica só aqui, nunca entra na exportação.
  async audioIds(): Promise<string[]> {
    return (await this.db.getAllKeys('audio')).map(String);
  }

  async audioList(): Promise<{ id: string; nome: string }[]> {
    const all = (await this.db.getAll('audio')) as StoredAudio[];
    return all.map((a) => ({ id: a.id, nome: a.nome }));
  }

  async audio(id: string): Promise<StoredAudio | null> {
    return ((await this.db.get('audio', id)) as StoredAudio | undefined) ?? null;
  }

  async saveAudio(a: StoredAudio): Promise<void> {
    await this.db.put('audio', a);
  }

  async deleteAudio(id: string): Promise<void> {
    await this.db.delete('audio', id);
  }

  // Coreografias editadas (as 5 músicas depois do editor) e as gravadas por ela.
  async choreos(): Promise<Choreo[]> {
    const out: Choreo[] = [];
    for (const raw of await this.db.getAll('choreos')) {
      const r = ChoreoSchema.safeParse(raw);
      if (r.success) out.push(r.data);
    }
    return out;
  }

  async saveChoreo(c: Choreo): Promise<void> {
    await this.db.put('choreos', ChoreoSchema.parse(c));
  }

  async deleteChoreo(id: string): Promise<void> {
    await this.db.delete('choreos', id);
  }

  // Poses regravadas (mesmo id do catálogo) e poses novas.
  async poses(): Promise<Catalog> {
    const out: Catalog = {};
    const keys = await this.db.getAllKeys('poses');
    const values = await this.db.getAll('poses');
    keys.forEach((k, i) => {
      const r = PoseDefSchema.safeParse(values[i]);
      if (r.success) out[String(k)] = r.data;
    });
    return out;
  }

  async savePose(id: string, def: PoseDef): Promise<void> {
    await this.db.put('poses', PoseDefSchema.parse(def), id);
  }

  async deletePose(id: string): Promise<void> {
    await this.db.delete('poses', id);
  }

  async exportAll(): Promise<ExportData> {
    return {
      app: 'ensaio-de-danca',
      versao: 1,
      settings: await this.settings(),
      progress: await this.progress(),
      characters: await this.characters(),
      choreos: await this.choreos(),
      poses: await this.poses(),
    };
  }

  /** Substitui os dados guardados pelos do arquivo. O áudio fica como está. Lança ZodError se o arquivo for inválido. */
  async importAll(raw: unknown): Promise<ExportData> {
    const data = ExportSchema.parse(raw);
    const poses = CatalogSchema.parse(data.poses);
    const tx = this.db.transaction(['kv', 'choreos', 'poses'], 'readwrite');
    const kv = tx.objectStore('kv');
    await kv.put(data.settings, 'settings');
    await kv.put(data.progress, 'progress');
    await kv.put(data.characters, 'characters');
    const ch = tx.objectStore('choreos');
    await ch.clear();
    for (const c of data.choreos) await ch.put(c);
    const ps = tx.objectStore('poses');
    await ps.clear();
    for (const [id, def] of Object.entries(poses)) await ps.put(def, id);
    await tx.done;
    return data;
  }
}
