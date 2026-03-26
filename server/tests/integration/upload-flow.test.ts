import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { openTestDatabase } from '../../src/db/helper';
import { createApp } from '../../src/index';
import { createSessionsRouter } from '../../src/routes/sessions';
import type { SqliteDatabase } from '../../src/db/helper';

describe('Upload Flow Integration Tests', () => {
  let db: SqliteDatabase;
  let cleanup: () => void;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const testDb = openTestDatabase();
    db = testDb.db;
    cleanup = testDb.cleanup;
    app = createApp(db);
    app.use('/api/sessions', createSessionsRouter(db));
  });

  afterEach(() => {
    cleanup();
  });

  describe('POST /api/sessions', () => {
    it('should create a session from JSON array content', async () => {
      const content = JSON.stringify([
        { id: 'e1', timestamp: '2024-01-01T10:00:00Z', type: 'entity:created', payload: { entityType: 'user', entityId: 'u1', data: { name: 'John' } } },
        { id: 'e2', timestamp: '2024-01-01T10:01:00Z', type: 'entity:updated', payload: { entityType: 'user', entityId: 'u1', data: { name: 'John Doe' } } },
      ]);

      const response = await request(app)
        .post('/api/sessions')
        .field('name', 'Test Session')
        .field('content', content);

      expect(response.status).toBe(201);
      expect(response.body.session).toBeDefined();
      expect(response.body.session.name).toBe('Test Session');
      expect(response.body.session.eventCount).toBe(2);
      expect(response.body.importedCount).toBe(2);
    });

    it('should create a session from JSONL content', async () => {
      const content = [
        JSON.stringify({ id: 'e1', timestamp: '2024-01-01T10:00:00Z', type: 'entity:created', payload: { entityType: 'user', entityId: 'u1', data: { name: 'Alice' } } }),
        JSON.stringify({ id: 'e2', timestamp: '2024-01-01T10:01:00Z', type: 'entity:created', payload: { entityType: 'order', entityId: 'o1', data: { amount: 100 } } }),
      ].join('\n');

      const response = await request(app)
        .post('/api/sessions')
        .field('name', 'JSONL Session')
        .field('content', content);

      expect(response.status).toBe(201);
      expect(response.body.session.eventCount).toBe(2);
      expect(response.body.importedCount).toBe(2);
    });

    it('should reject request without name', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .field('content', '[]');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No valid events');
    });

    it('should reject request without file or content', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .field('name', 'Test');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('multipart file field');
    });

    it('should handle empty array', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .field('name', 'Empty Session')
        .field('content', '[]');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('No valid events');
    });

    it('should track event types correctly', async () => {
      const content = JSON.stringify([
        { id: 'e1', timestamp: '2024-01-01T10:00:00Z', type: 'entity:created', payload: { entityType: 'user', entityId: 'u1', data: {} } },
        { id: 'e2', timestamp: '2024-01-01T10:01:00Z', type: 'entity:updated', payload: { entityType: 'user', entityId: 'u1', data: {} } },
        { id: 'e3', timestamp: '2024-01-01T10:02:00Z', type: 'entity:deleted', payload: { entityType: 'user', entityId: 'u1', data: {} } },
      ]);

      const response = await request(app)
        .post('/api/sessions')
        .field('name', 'Types Session')
        .field('content', content);

      expect(response.status).toBe(201);
      expect(response.body.session.eventTypes).toContain('entity:created');
      expect(response.body.session.eventTypes).toContain('entity:updated');
      expect(response.body.session.eventTypes).toContain('entity:deleted');
      expect(response.body.session.eventTypes.length).toBe(3);
    });

    it('should set start and end times correctly', async () => {
      const content = JSON.stringify([
        { id: 'e1', timestamp: '2024-01-01T10:00:00Z', type: 'test', payload: {} },
        { id: 'e2', timestamp: '2024-01-01T12:00:00Z', type: 'test', payload: {} },
        { id: 'e3', timestamp: '2024-01-01T11:00:00Z', type: 'test', payload: {} },
      ]);

      const response = await request(app)
        .post('/api/sessions')
        .field('name', 'Time Session')
        .field('content', content);

      expect(response.status).toBe(201);
      expect(response.body.session.timeRange.start).toBe('2024-01-01T10:00:00.000Z');
      expect(response.body.session.timeRange.end).toBe('2024-01-01T12:00:00.000Z');
    });
  });

  describe('GET /api/sessions', () => {
    beforeEach(async () => {
      // Create test sessions
      for (let i = 1; i <= 3; i++) {
        await request(app)
          .post('/api/sessions')
          .field('name', `Session ${i}`)
          .field('content', JSON.stringify([
            { id: `e${i}`, timestamp: '2024-01-01T10:00:00Z', type: 'test', payload: {} }
          ]));
      }
    });

    it('should list all sessions', async () => {
      const response = await request(app).get('/api/sessions');

      expect(response.status).toBe(200);
      expect(response.body.sessions).toHaveLength(3);
      expect(response.body.total).toBe(3);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .query({ limit: 2, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.sessions).toHaveLength(2);
    });
  });

  describe('GET /api/sessions/:id', () => {
    it('should get a specific session', async () => {
      const createResponse = await request(app)
        .post('/api/sessions')
        .field('name', 'Get Test')
        .field('content', JSON.stringify([
          { id: 'e1', timestamp: '2024-01-01T10:00:00Z', type: 'test', payload: {} }
        ]));

      const sessionId = createResponse.body.session.id;

      const response = await request(app).get(`/api/sessions/${sessionId}`);

      expect(response.status).toBe(200);
      expect(response.body.session.id).toBe(sessionId);
      expect(response.body.session.name).toBe('Get Test');
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app).get('/api/sessions/non-existent-id');

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/sessions/:id', () => {
    it.skip('should delete a session and its events', async () => {});
  });
});
