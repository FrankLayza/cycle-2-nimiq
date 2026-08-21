import type { Database } from 'better-sqlite3';

/**
 * Schema per ARCHITECTURE.md §6. Runs has UNIQUE(day, log_hash) — log-copy
 * rejection (D29). Payouts are idempotent by construction (one tx per run).
 * `runs.inputs` stores the applied input log as JSON (verification payload, D27).
 */
const MIGRATIONS: string[] = [
  `
  CREATE TABLE IF NOT EXISTS wallets (
    address TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    streak INTEGER NOT NULL DEFAULT 0,
    last_play_date TEXT,
    last_run_at INTEGER
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    wallet TEXT NOT NULL,
    seed INTEGER NOT NULL,
    sim_version INTEGER NOT NULL,
    mode TEXT NOT NULL,
    inputs TEXT NOT NULL,
    log_hash TEXT NOT NULL,
    score INTEGER NOT NULL,
    length INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attested_at INTEGER NOT NULL,
    attestation TEXT NOT NULL DEFAULT '',
    UNIQUE(day, log_hash)
  );
  CREATE INDEX IF NOT EXISTS idx_runs_day_score ON runs(day, score DESC);
  `,
  `
  CREATE TABLE IF NOT EXISTS leaderboard (
    day TEXT NOT NULL,
    match_type TEXT NOT NULL,
    wallet TEXT NOT NULL,
    score INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    PRIMARY KEY (day, match_type, wallet)
  );
  `,
  `
  CREATE TABLE IF NOT EXISTS payouts (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    wallet TEXT NOT NULL,
    amount_nim INTEGER NOT NULL,
    tx_hash TEXT,
    status TEXT NOT NULL,
    paid_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_payouts_run_id ON payouts(run_id);
  `,
  `
  CREATE TABLE IF NOT EXISTS rooms (
    code TEXT PRIMARY KEY,
    mode TEXT NOT NULL,
    room_id TEXT NOT NULL,
    seats TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  `,
];

export function migrate(db: Database): void {
  for (const sql of MIGRATIONS) db.exec(sql);
  const runColumns = db.prepare('PRAGMA table_info(runs)').all() as Array<{ name: string }>;
  if (!runColumns.some((column) => column.name === 'attestation')) {
    db.exec("ALTER TABLE runs ADD COLUMN attestation TEXT NOT NULL DEFAULT ''");
  }
}
