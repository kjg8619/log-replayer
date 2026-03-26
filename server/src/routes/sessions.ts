import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { SqliteDatabase } from '../db/helper';
import { EventsRepository } from '../db/repositories/events';
import { SessionsRepository } from '../db/repositories/sessions';
import { parseLogContent } from '../services/logParser';
import type { LogSession } from '../types/index';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

const CreateSessionBodySchema = z.object({
  name: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

const ListSessionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

const SessionIdParamSchema = z.object({
  id: z.string().min(1),
});

function toLogSession(input: {
  id: string;
  name: string;
  createdAt: string;
  eventCount: number;
  startTime: string | null;
  endTime: string | null;
  eventTypes: string[];
}): LogSession {
  const start = input.startTime ?? input.createdAt;
  const end = input.endTime ?? input.createdAt;

  return {
    id: input.id,
    name: input.name,
    createdAt: input.createdAt,
    eventCount: input.eventCount,
    timeRange: { start, end },
    eventTypes: input.eventTypes,
  };
}

function getFileContent(request: Request): { text: string; fileNameHint?: string } | null {
  const maybeFile = request.file;
  if (maybeFile) {
    return {
      text: maybeFile.buffer.toString('utf-8'),
      fileNameHint: maybeFile.originalname,
    };
  }

  const body = CreateSessionBodySchema.safeParse(request.body);
  if (body.success && body.data.content) {
    return {
      text: body.data.content,
    };
  }

  return null;
}

export function createSessionsRouter(db: SqliteDatabase) {
  const sessionsRepository = new SessionsRepository(db);
  const eventsRepository = new EventsRepository(db);
  const router = Router();

  router.post('/', upload.single('file'), async (request: Request, response: Response) => {
    const parsedBody = CreateSessionBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      response.status(400).json({
        error: 'Invalid request body',
        issues: parsedBody.error.flatten(),
      });
      return;
    }

    const content = getFileContent(request);
    if (!content) {
      response.status(400).json({
        error: 'Provide either multipart file field "file" or JSON body with "content"',
      });
      return;
    }

    const parsed = await parseLogContent(content.text, content.fileNameHint);
    if (parsed.events.length === 0) {
      response.status(400).json({
        error: 'No valid events found in uploaded content',
        parseErrors: parsed.errors,
      });
      return;
    }

    const sessionId = randomUUID();
    const name = parsedBody.data.name ?? parsed.sessionName;
    const createdAt = new Date().toISOString();

    sessionsRepository.create({
      id: sessionId,
      name,
      createdAt,
    });

    const normalizedEvents = parsed.events.map((event, index) => ({
      id: event.id ?? randomUUID(),
      sessionId,
      sequence: index + 1,
      timestamp: event.timestamp,
      type: event.type,
      payload: event.payload ?? {},
      metadata: event.metadata,
    }));

    eventsRepository.createMany(normalizedEvents);

    const eventTypes = Array.from(new Set(normalizedEvents.map((event) => event.type))).sort();
    const sortedTimestamps = normalizedEvents
      .map((event) => new Date(event.timestamp).getTime())
      .filter((value) => Number.isFinite(value))
      .sort((left, right) => left - right);

    const startTime = sortedTimestamps.length > 0 ? new Date(sortedTimestamps[0]).toISOString() : null;
    const endTime =
      sortedTimestamps.length > 0
        ? new Date(sortedTimestamps[sortedTimestamps.length - 1]).toISOString()
        : null;

    const updated = sessionsRepository.updateStats(sessionId, {
      eventCount: normalizedEvents.length,
      startTime,
      endTime,
      eventTypes,
    });

    response.status(201).json({
      session: updated ? toLogSession(updated) : null,
      importedCount: normalizedEvents.length,
      parseErrors: parsed.errors,
    });
  });

  router.get('/', (request: Request, response: Response) => {
    const query = ListSessionsQuerySchema.safeParse(request.query);
    if (!query.success) {
      response.status(400).json({ error: 'Invalid query parameters', issues: query.error.flatten() });
      return;
    }

    const sessions = sessionsRepository
      .list({
        limit: query.data.limit,
        offset: query.data.offset,
      })
      .map(toLogSession);

    response.json({
      sessions,
      total: sessionsRepository.count(),
    });
  });

  router.get('/:id', (request: Request, response: Response) => {
    const params = SessionIdParamSchema.safeParse(request.params);
    if (!params.success) {
      response.status(400).json({ error: 'Invalid session id' });
      return;
    }

    const session = sessionsRepository.findById(params.data.id);
    if (!session) {
      response.status(404).json({ error: 'Session not found' });
      return;
    }

    response.json({ session: toLogSession(session) });
  });

  return router;
}
