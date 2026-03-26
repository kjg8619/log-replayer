import type { SqliteDatabase } from '../helper';

export type SessionRecord = {
  id: string;
  name: string;
  createdAt: string;
  eventCount: number;
  startTime: string | null;
  endTime: string | null;
  eventTypes: string[];
};

type SessionRow = {
  id: string;
  name: string;
  created_at: string;
  event_count: number;
  start_time: string | null;
  end_time: string | null;
  event_types: string | null;
};

type CreateSessionInput = {
  id: string;
  name: string;
  createdAt?: string | null;
};

type UpdateSessionStatsInput = {
  eventCount?: number;
  startTime?: string | null;
  endTime?: string | null;
  eventTypes?: string[];
};

function mapSessionRow(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    eventCount: row.event_count,
    startTime: row.start_time,
    endTime: row.end_time,
    eventTypes: row.event_types ? (JSON.parse(row.event_types) as string[]) : [],
  };
}

export class SessionsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  create(input: CreateSessionInput): SessionRecord {
    const createdAt = input.createdAt ?? new Date().toISOString();

    this.db
      .prepare(
        `
          INSERT INTO sessions (id, name, created_at, event_count, start_time, end_time, event_types)
          VALUES (?, ?, ?, 0, NULL, NULL, ?)
        `,
      )
      .run(input.id, input.name, createdAt, JSON.stringify([]));

    return {
      id: input.id,
      name: input.name,
      createdAt,
      eventCount: 0,
      startTime: null,
      endTime: null,
      eventTypes: [],
    };
  }

  findById(id: string): SessionRecord | null {
    const row = this.db
      .prepare(
        `
          SELECT id, name, created_at, event_count, start_time, end_time, event_types
          FROM sessions
          WHERE id = ?
        `,
      )
      .get(id) as SessionRow | undefined;

    return row ? mapSessionRow(row) : null;
  }

  list(options: { limit?: number; offset?: number } = {}): SessionRecord[] {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const rows = this.db
      .prepare(
        `
          SELECT id, name, created_at, event_count, start_time, end_time, event_types
          FROM sessions
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `,
      )
      .all(limit, offset) as SessionRow[];

    return rows.map(mapSessionRow);
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM sessions').get() as { count: number };
    return row.count;
  }

  updateStats(id: string, input: UpdateSessionStatsInput): SessionRecord | null {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.eventCount !== undefined) {
      updates.push('event_count = ?');
      values.push(input.eventCount);
    }

    if (input.startTime !== undefined) {
      updates.push('start_time = ?');
      values.push(input.startTime);
    }

    if (input.endTime !== undefined) {
      updates.push('end_time = ?');
      values.push(input.endTime);
    }

    if (input.eventTypes !== undefined) {
      updates.push('event_types = ?');
      values.push(JSON.stringify(input.eventTypes));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    this.db.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
