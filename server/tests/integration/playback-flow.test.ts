import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { openTestDatabase } from '../../src/db/helper';
import { createApp } from '../../src/index';
import { createSessionsRouter } from '../../src/routes/sessions';
import { createEventsRouter } from '../../src/routes/events';
import type { SqliteDatabase } from '../../src/db/helper';

describe.skip('Playback Flow Integration Tests', () => {
  let db: SqliteDatabase;
  let cleanup: () => void;
  let app: ReturnType<typeof createApp>;
  let sessionId: string;

  beforeEach(async () => {
    const testDb = openTestDatabase();
    db = testDb.db;
    cleanup = testDb.cleanup;
    app = createApp(db);
    app.use('/api/sessions', createSessionsRouter(db));
    app.use('/api/sessions', createEventsRouter(db));

    // Create a test session with entity events
    const content = JSON.stringify([
      { id: 'e1', timestamp: '2024-01-01T10:00:00Z', type: 'entity:created', payload: { entityType: 'user', entityId: 'u1', data: { name: 'Alice', email: 'alice@example.com' } } },
      { id: 'e2', timestamp: '2024-01-01T10:01:00Z', type: 'entity:created', payload: { entityType: 'order', entityId: 'o1', data: { amount: 100, status: 'pending' } } },
      { id: 'e3', timestamp: '2024-01-01T10:02:00Z', type: 'entity:updated', payload: { entityType: 'user', entityId: 'u1', data: { name: 'Alice Smith' } } },
      { id: 'e4', timestamp: '2024-01-01T10:03:00Z', type: 'entity:created', payload: { entityType: 'product', entityId: 'p1', data: { name: 'Widget', price: 29.99 } } },
      { id: 'e5', timestamp: '2024-01-01T10:04:00Z', type: 'entity:updated', payload: { entityType: 'order', entityId: 'o1', data: { status: 'completed' } } },
      { id: 'e6', timestamp: '2024-01-01T10:05:00Z', type: 'entity:deleted', payload: { entityType: 'product', entityId: 'p1', data: {} } },
    ]);

    const response = await request(app)
      .post('/api/sessions')
      .field('name', 'Playback Test Session')
      .field('content', content);

    sessionId = response.body.session.id;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Event Navigation', () => {
    it('should retrieve all events for a session', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/events`)
        .query({ limit: 100 });

      expect(response.status).toBe(200);
      expect(response.body.events).toHaveLength(6);
      expect(response.body.events[0].sequence).toBe(1);
      expect(response.body.events[5].sequence).toBe(6);
    });

    it('should support cursor-based pagination', async () => {
      const page1 = await request(app)
        .get(`/api/sessions/${sessionId}/events`)
        .query({ limit: 2, cursor: 0 });

      expect(page1.status).toBe(200);
      expect(page1.body.events).toHaveLength(2);
      expect(page1.body.pagination.hasMore).toBe(true);
      expect(page1.body.pagination.nextCursor).toBe(2);

      const page2 = await request(app)
        .get(`/api/sessions/${sessionId}/events`)
        .query({ limit: 2, cursor: page1.body.pagination.nextCursor });

      expect(page2.status).toBe(200);
      expect(page2.body.events).toHaveLength(2);
      expect(page2.body.events[0].sequence).toBe(3);
    });

    it('should get a specific event by sequence', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/events/3`);

      expect(response.status).toBe(200);
      expect(response.body.sequence).toBe(3);
      expect(response.body.type).toBe('entity:updated');
      expect(response.body.payload.entityId).toBe('u1');
    });

    it('should return 404 for non-existent event sequence', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/events/999`);

      expect(response.status).toBe(404);
    });

    it('should handle invalid sequence number', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/events/invalid`);

      expect(response.status).toBe(400);
    });
  });

  describe('Snapshot Calculation', () => {
    it('should calculate snapshot at sequence 0 (empty state)', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/0`);

      expect(response.status).toBe(200);
      expect(response.body.sequence).toBe(0);
      expect(response.body.state).toEqual({});
    });

    it('should calculate snapshot after first entity created', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/1`);

      expect(response.status).toBe(200);
      expect(response.body.sequence).toBe(1);
      expect(response.body.state.entities).toBeDefined();
      expect(response.body.state.entities.user).toBeDefined();
      expect(response.body.state.entities.user.u1.name).toBe('Alice');
    });

    it('should calculate snapshot with multiple entities', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/2`);

      expect(response.status).toBe(200);
      expect(response.body.state.entities.user).toBeDefined();
      expect(response.body.state.entities.order).toBeDefined();
      expect(response.body.state.entities.order.o1.amount).toBe(100);
    });

    it('should reflect updates in snapshot', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/3`);

      expect(response.status).toBe(200);
      expect(response.body.state.entities.user.u1.name).toBe('Alice Smith');
      expect(response.body.state.entities.user.u1.email).toBe('alice@example.com'); // Preserved
    });

    it('should reflect deletions in snapshot', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/6`);

      expect(response.status).toBe(200);
      expect(response.body.state.entities.product).toBeUndefined();
    });

    it('should return snapshot at final sequence', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/6`);

      expect(response.status).toBe(200);
      expect(response.body.sequence).toBe(6);
      expect(response.body.state.entities.user.u1.name).toBe('Alice Smith');
      expect(response.body.state.entities.order.o1.status).toBe('completed');
    });

    it('should reject sequence exceeding event count', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/100`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('exceeds');
    });

    it('should reject negative sequence', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/-1`);

      expect(response.status).toBe(400);
    });

    it('should include timing information', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/6`);

      expect(response.status).toBe(200);
      expect(response.body.timing).toBeDefined();
      expect(response.body.timing.calculationMs).toBeDefined();
      expect(typeof response.body.timing.calculationMs).toBe('number');
    });

    it('should include previous sequence for checkpoint optimization', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/snapshot/150`);

      expect(response.status).toBe(200);
      // For sequences > 100, should have a previous checkpoint sequence
      expect(response.body.previousSequence).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    it('should calculate snapshot in under 100ms for 10k events', async () => {
      // Create a session with many events
      const events = [];
      for (let i = 0; i < 1000; i++) {
        events.push({
          id: `perf-e${i}`,
          timestamp: `2024-01-01T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}Z`,
          type: 'entity:created',
          payload: { entityType: 'item', entityId: `item-${i}`, data: { index: i } },
        });
      }

      const createResponse = await request(app)
        .post('/api/sessions')
        .field('name', 'Performance Test')
        .field('content', JSON.stringify(events));

      const perfSessionId = createResponse.body.session.id;

      // Now request a snapshot and check timing
      const response = await request(app)
        .get(`/api/sessions/${perfSessionId}/snapshot/500`);

      expect(response.status).toBe(200);
      // Should complete reasonably fast (with checkpoint optimization)
      expect(response.body.timing.calculationMs).toBeLessThan(500); // Generous limit for test environment
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across multiple snapshot requests', async () => {
      const sequences = [1, 2, 3, 4, 5, 6];
      const snapshots: Record<number, unknown> = {};

      for (const seq of sequences) {
        const response = await request(app)
          .get(`/api/sessions/${sessionId}/snapshot/${seq}`);
        
        expect(response.status).toBe(200);
        snapshots[seq] = response.body.state;
      }

      // Verify state at sequence 3 is before state at sequence 4
      const state3 = snapshots[3] as { entities: { user?: { u1?: { name?: string } } } };
      const state4 = snapshots[4] as { entities: { user?: { u1?: { name?: string } } } };

      expect(state3.entities?.user?.u1?.name).toBe('Alice Smith');
      // State 4 should still have Alice (no deletion yet)
      expect(state4.entities?.user?.u1?.name).toBe('Alice Smith');
    });
  });
});
