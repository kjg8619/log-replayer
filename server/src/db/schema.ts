import type { SqliteDatabase } from './helper';

const SESSIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    event_count INTEGER NOT NULL DEFAULT 0,
    start_time TEXT,
    end_time TEXT,
    event_types TEXT -- JSON array of unique event types
  );
`;

const EVENTS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL, -- JSON
    metadata TEXT, -- JSON
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
`;

const CHECKPOINTS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS checkpoints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    state TEXT NOT NULL, -- JSON snapshot
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_checkpoints_session_seq 
  ON checkpoints(session_id, sequence);
`;

export function initializeSchema(db: SqliteDatabase) {
  db.exec(SESSIONS_SCHEMA);
  db.exec(EVENTS_SCHEMA);
  db.exec(CHECKPOINTS_SCHEMA);
}
