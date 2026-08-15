import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from '../config.js';
import { migrate } from './migrations.js';

let db: Database.Database | null = null;

/** Open (once) the SQLite database — WAL mode, migrations applied on boot. */
export function getDb(): Database.Database {
  if (db) return db;
  const cfg = loadConfig();
  mkdirSync(dirname(cfg.dbPath), { recursive: true });
  db = new Database(cfg.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
