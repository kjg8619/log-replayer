import type { SqliteDatabase } from '../helper';

export interface Event {
  id: string;
  sessionId: string;
  sequence: number;
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface EventRow {
  id: string;
  session_id: string;
  sequence: number;
  timestamp: string;
  type: string;
  payload: string;
  metadata: string | null;
}

function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    sessionId: row.session_id,
    sequence: row.sequence,
    timestamp: row.timestamp,
    type: row.type,
    payload: JSON.parse(row.payload),
    metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
  };
}

type PaginationOptions = {
  limit?: number;
  cursor?: number;
};

type PaginatedEvents = {
  events: Event[];
  nextCursor: number | null;
};

export class EventsRepository {
  constructor(private readonly db: SqliteDatabase) {}

  create(event: Event): Event {
    this.db.prepare(`
      INSERT INTO events (id, session_id, sequence, timestamp, type, payload, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.id,
      event.sessionId,
      event.sequence,
      event.timestamp,
      event.type,
      JSON.stringify(event.payload),
      event.metadata ? JSON.stringify(event.metadata) : null,
    );

    return event;
  }

  createMany(events: Event[]): number {
    if (events.length === 0) {
      return 0;
    }

    const stmt = this.db.prepare(`
      INSERT INTO events (id, session_id, sequence, timestamp, type, payload, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const event of events) {
      stmt.run(
        event.id,
        event.sessionId,
        event.sequence,
        event.timestamp,
        event.type,
        JSON.stringify(event.payload),
        event.metadata ? JSON.stringify(event.metadata) : null,
      );
    }

    return events.length;
  }

  findById(id: string): Event | null {
    const row = this.db.prepare('SELECT * FROM events WHERE id = ?').get(id) as EventRow | undefined;
    return row ? rowToEvent(row) : null;
  }

  listBySession(sessionId: string, options: PaginationOptions = {}): PaginatedEvents {
    const limit = options.limit ?? 100;
    let sql = 'SELECT * FROM events WHERE session_id = ?';
    const params: unknown[] = [sessionId];

    if (options.cursor !== undefined) {
      sql += ' AND sequence > ?';
      params.push(options.cursor);
    }

    sql += ' ORDER BY sequence ASC LIMIT ?';
    params.push(limit + 1);

    const rows = this.db.prepare(sql).all(...params) as EventRow[];
    const mapped = rows.map(rowToEvent);

    if (mapped.length <= limit) {
      return { events: mapped, nextCursor: null };
    }

    const events = mapped.slice(0, limit);
    const nextCursor = events[events.length - 1]?.sequence ?? null;

    return { events, nextCursor };
  }

  findBySequence(sessionId: string, sequence: number): Event | null {
    const row = this.db
      .prepare('SELECT * FROM events WHERE session_id = ? AND sequence = ?')
      .get(sessionId, sequence) as EventRow | undefined;
    return row ? rowToEvent(row) : null;
  }

  listRange(sessionId: string, startExclusive: number, endInclusive: number): Event[] {
    const rows = this.db
      .prepare(
        `
          SELECT *
          FROM events
          WHERE session_id = ?
            AND sequence > ?
            AND sequence <= ?
          ORDER BY sequence ASC
        `,
      )
      .all(sessionId, startExclusive, endInclusive) as EventRow[];

    return rows.map(rowToEvent);
  }

  countBySession(sessionId: string): number {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE session_id = ?').get(sessionId) as { count: number };
    return result.count;
  }

  deleteBySession(sessionId: string): number {
    return this.db.prepare('DELETE FROM events WHERE session_id = ?').run(sessionId).changes;
  }

  getEventTypes(sessionId: string): string[] {
    const rows = this.db.prepare('SELECT DISTINCT type FROM events WHERE session_id = ? ORDER BY type ASC').all(sessionId) as { type: string }[];
    return rows.map((r) => r.type);
  }

  getLastSequence(sessionId: string): number {
    const row = this.db
      .prepare('SELECT MAX(sequence) AS max_sequence FROM events WHERE session_id = ?')
      .get(sessionId) as { max_sequence: number | null };

    return row.max_sequence ?? 0;
  }
}
