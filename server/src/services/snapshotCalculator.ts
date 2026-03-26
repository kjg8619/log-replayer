import type { SqliteDatabase } from '../db/helper';
import { EventsRepository } from '../db/repositories/events';
import { SessionsRepository } from '../db/repositories/sessions';
import type { StateSnapshot } from '../types/index';
import type { ReducerRegistry } from './reducers';

type CheckpointRow = {
  session_id: string;
  sequence: number;
  state: string;
  created_at: string;
};

type CachedSnapshot = {
  snapshot: StateSnapshot;
};

const CHECKPOINT_INTERVAL = 100;
const SNAPSHOT_CACHE_LIMIT = 200;

function cloneState(state: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
}

function calculateDiff(
  previousState: Record<string, unknown>,
  nextState: Record<string, unknown>,
): Record<string, unknown> | null {
  const diff: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(previousState), ...Object.keys(nextState)]);

  for (const key of allKeys) {
    const before = previousState[key];
    const after = nextState[key];

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diff[key] = { before, after };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

export class SnapshotCalculator {
  private readonly eventsRepository: EventsRepository;
  private readonly sessionsRepository: SessionsRepository;
  private readonly snapshotCache = new Map<string, CachedSnapshot>();

  constructor(
    private readonly db: SqliteDatabase,
    private readonly reducerRegistry: ReducerRegistry,
  ) {
    this.eventsRepository = new EventsRepository(db);
    this.sessionsRepository = new SessionsRepository(db);
  }

  private getCacheKey(sessionId: string, sequence: number): string {
    return `${sessionId}:${sequence}`;
  }

  private getCheckpoint(sessionId: string, targetSequence: number): {
    sequence: number;
    state: Record<string, unknown>;
  } | null {
    const row = this.db
      .prepare(
        `
          SELECT session_id, sequence, state, created_at
          FROM checkpoints
          WHERE session_id = ? AND sequence <= ?
          ORDER BY sequence DESC
          LIMIT 1
        `,
      )
      .get(sessionId, targetSequence) as CheckpointRow | undefined;

    if (!row) {
      return null;
    }

    return {
      sequence: row.sequence,
      state: JSON.parse(row.state) as Record<string, unknown>,
    };
  }

  private saveCheckpoint(sessionId: string, sequence: number, state: Record<string, unknown>): void {
    this.db
      .prepare(
        `
          INSERT INTO checkpoints (session_id, sequence, state, created_at)
          VALUES (?, ?, ?, ?)
        `,
      )
      .run(sessionId, sequence, JSON.stringify(state), new Date().toISOString());
  }

  private setCache(snapshot: StateSnapshot): void {
    const key = this.getCacheKey(snapshot.sessionId, snapshot.sequence);
    this.snapshotCache.set(key, { snapshot });

    if (this.snapshotCache.size <= SNAPSHOT_CACHE_LIMIT) {
      return;
    }

    const firstKey = this.snapshotCache.keys().next().value;
    if (firstKey) {
      this.snapshotCache.delete(firstKey);
    }
  }

  private getCached(sessionId: string, sequence: number): StateSnapshot | null {
    const key = this.getCacheKey(sessionId, sequence);
    const cached = this.snapshotCache.get(key);
    return cached?.snapshot ?? null;
  }

  async calculateSnapshot(sessionId: string, targetSequence: number): Promise<StateSnapshot> {
    const cached = this.getCached(sessionId, targetSequence);
    if (cached) {
      return cached;
    }

    const session = this.sessionsRepository.findById(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (targetSequence < 0 || targetSequence > session.eventCount) {
      throw new Error('Sequence out of range');
    }

    if (targetSequence === 0) {
      const snapshot: StateSnapshot = {
        sessionId,
        eventId: 'origin',
        sequence: 0,
        state: {},
        diff: null,
      };

      this.setCache(snapshot);
      return snapshot;
    }

    const checkpoint = this.getCheckpoint(sessionId, targetSequence);
    const replayFromSequence = checkpoint?.sequence ?? 0;
    let state = cloneState(checkpoint?.state ?? {});
    let previousState = cloneState(state);

    const events = this.eventsRepository.listRange(sessionId, replayFromSequence, targetSequence);
    for (const event of events) {
      if (event.sequence === targetSequence) {
        previousState = cloneState(state);
      }

      state = this.reducerRegistry.reduce(state, {
        type: event.type,
        payload: event.payload,
        metadata: event.metadata,
      });
    }

    const currentEvent = this.eventsRepository.findBySequence(sessionId, targetSequence);
    const snapshot: StateSnapshot = {
      sessionId,
      eventId: currentEvent?.id ?? `sequence-${targetSequence}`,
      sequence: targetSequence,
      state,
      diff: calculateDiff(previousState, state),
    };

    this.setCache(snapshot);

    if (targetSequence % CHECKPOINT_INTERVAL === 0) {
      this.saveCheckpoint(sessionId, targetSequence, state);
    }

    return snapshot;
  }

  invalidateSession(sessionId: string): void {
    for (const key of this.snapshotCache.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.snapshotCache.delete(key);
      }
    }
  }
}

export function createSnapshotCalculator(db: SqliteDatabase, reducerRegistry: ReducerRegistry) {
  return new SnapshotCalculator(db, reducerRegistry);
}
