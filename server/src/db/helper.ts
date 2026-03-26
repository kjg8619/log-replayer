import Database from 'better-sqlite3';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { initializeSchema } from './schema';

export interface SqliteDatabase {
  open: boolean;
  exec(sql: string): void;
  pragma(sql: string, value?: unknown): void;
  close(): void;
  prepare(sql: string): {
    get<T = unknown>(...params: unknown[]): T;
    all<T = unknown>(...params: unknown[]): T[];
    run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  };
}

export function openSqliteDatabase(filePath: string): SqliteDatabase {
  if (!existsSync(filePath)) {
    writeFileSync(filePath, '');
  }

  const db = new Database(filePath) as unknown as SqliteDatabase;
  initializeSchema(db);
  return db;
}

export function openTestDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'log-replayer-'));
  const filePath = join(directory, 'test.db');
  const db = openSqliteDatabase(filePath);

  return {
    db,
    filePath,
    cleanup: () => {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
