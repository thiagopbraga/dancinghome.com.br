// Adaptador D1 em memória usando node:sqlite (apenas para testes automatizados e servidor Vite local).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { D1Database, D1PreparedStatement, D1Result } from './types.ts';

function createPreparedStatement(
  db: DatabaseSync,
  query: string,
  boundValues: SQLInputValue[] = [],
): D1PreparedStatement {
  return {
    bind(...values: unknown[]): D1PreparedStatement {
      return createPreparedStatement(db, query, values as SQLInputValue[]);
    },
    async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
      const stmt = db.prepare(query);
      const row = stmt.get(...boundValues) as Record<string, unknown> | undefined;
      if (!row) return null;
      if (colName !== undefined) {
        return (row[colName] as T) ?? null;
      }
      return { ...row } as T;
    },
    async all<T = Record<string, unknown>>(): Promise<D1Result<T>> {
      const stmt = db.prepare(query);
      const rows = stmt.all(...boundValues) as Record<string, unknown>[];
      return {
        results: rows.map((r) => ({ ...r }) as T),
        success: true,
      };
    },
    async run(): Promise<D1Result> {
      const stmt = db.prepare(query);
      const info = stmt.run(...boundValues);
      return {
        results: [],
        success: true,
        meta: {
          changes: Number(info.changes),
          last_row_id: Number(info.lastInsertRowid),
        },
      };
    },
  };
}

/** Cria uma instância D1Database em memória populada com as migrações SQL reais do Worker. */
export function criarBancoD1Memoria(rootDir = process.cwd()): D1Database {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  const m1 = readFileSync(resolve(rootDir, 'worker/migrations/0001_placar.sql'), 'utf-8');
  const m2 = readFileSync(resolve(rootDir, 'worker/migrations/0002_musicas.sql'), 'utf-8');
  db.exec(m1);
  db.exec(m2);

  return {
    prepare(query: string): D1PreparedStatement {
      return createPreparedStatement(db, query);
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      const out: D1Result<T>[] = [];
      for (const st of statements) {
        out.push((await st.run()) as D1Result<T>);
      }
      return out;
    },
    async exec(query: string): Promise<{ count: number; duration: number }> {
      db.exec(query);
      return { count: 1, duration: 0 };
    },
  };
}
