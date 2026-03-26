import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { SqliteDatabase } from '../db/helper';
import { EventsRepository } from '../db/repositories/events';
import { SessionsRepository } from '../db/repositories/sessions';
import { createReducerRegistry } from '../services/reducers';
import { createSnapshotCalculator } from '../services/snapshotCalculator';
import type { Event } from '../types/index';

const SessionIdSchema = z.object({
  id: z.string().min(1),
});

const SequenceParamsSchema = z.object({
  id: z.string().min(1),
  sequence: z.coerce.number().int().min(1),
});

const ListEventsQuerySchema = z.object({
  cursor: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

function toDomainEvent(input: {
  id: string;
  sequence: number;
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Event {
  return {
    id: input.id,
    sequence: input.sequence,
    timestamp: input.timestamp,
    type: input.type,
    payload: input.payload,
    metadata: input.metadata,
  };
}

export function createEventsRouter(db: SqliteDatabase) {
  const sessionsRepository = new SessionsRepository(db);
  const eventsRepository = new EventsRepository(db);
  const snapshotCalculator = createSnapshotCalculator(db, createReducerRegistry());
  const router = Router();

  router.get('/:id/events', (request: Request, response: Response) => {
    const params = SessionIdSchema.safeParse(request.params);
    const query = ListEventsQuerySchema.safeParse(request.query);

    if (!params.success || !query.success) {
      response.status(400).json({ error: 'Invalid request parameters' });
      return;
    }

    const session = sessionsRepository.findById(params.data.id);
    if (!session) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }

    const page = eventsRepository.listBySession(params.data.id, {
      cursor: query.data.cursor,
      limit: query.data.limit,
    });

    response.json({
      events: page.events.map(toDomainEvent),
      nextCursor: page.nextCursor,
      hasMore: page.nextCursor !== null,
    });
  });

  router.get('/:id/events/:sequence', (request: Request, response: Response) => {
    const params = SequenceParamsSchema.safeParse(request.params);
    if (!params.success) {
      response.status(400).json({ error: 'Invalid sequence' });
      return;
    }

    const session = sessionsRepository.findById(params.data.id);
    if (!session) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }

    const event = eventsRepository.findBySequence(params.data.id, params.data.sequence);
    if (!event) {
      response.status(404).json({ error: 'Event not found' });
      return;
    }

    response.json(toDomainEvent(event));
  });

  router.get('/:id/snapshot/:sequence', async (request: Request, response: Response) => {
    const params = SequenceParamsSchema.safeParse(request.params);
    if (!params.success) {
      response.status(400).json({ error: 'Invalid sequence' });
      return;
    }

    const session = sessionsRepository.findById(params.data.id);
    if (!session) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }

    try {
      const snapshot = await snapshotCalculator.calculateSnapshot(params.data.id, params.data.sequence);
      response.json(snapshot);
    } catch (error) {
      response.status(400).json({ error: (error as Error).message });
    }
  });

  return router;
}
