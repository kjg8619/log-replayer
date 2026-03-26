import { describe, expect, it, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/index';
import { openTestDatabase } from '../../src/db/helper';
import { SessionsRepository } from '../../src/db/repositories/sessions';
import { EventsRepository } from '../../src/db/repositories/events';
import type { Express } from 'express';

describe.skip('Full Flow Integration Tests', () => {
  let app: Express;
  let db: ReturnType<typeof openTestDatabase> extends Promise<infer T> ? T : never;
  let sessionsRepo: SessionsRepository;
  let eventsRepo: EventsRepository;

  beforeAll(() => {
    const testDb = openTestDatabase();
    db = testDb as typeof db;
    app = createApp(db.db);
    sessionsRepo = new SessionsRepository(db.db);
    eventsRepo = new EventsRepository(db.db);
  });

  afterAll(() => {
    db.cleanup();
  });

  describe('Health Check', () => {
    it('returns healthy status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Session Management', () => {
    afterEach(() => {
      const sessions = sessionsRepo.list(100);
      for (const session of sessions) {
        sessionsRepo.delete(session.id);
      }
    });

    it('creates and retrieves a session', async () => {
      // Create session directly
      const session = sessionsRepo.create({
        id: 'test-session-1',
        name: 'Integration Test Session',
        created_at: new Date().toISOString(),
        start_time: null,
        end_time: null,
        event_types: null,
      });

      expect(session.id).toBe('test-session-1');

      // Retrieve via API (would need routes set up, but testing repo directly)
      const retrieved = sessionsRepo.findById('test-session-1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Integration Test Session');
    });

    it('updates session statistics', () => {
      const session = sessionsRepo.create({
        id: 'test-session-2',
        name: 'Test Session 2',
        created_at: new Date().toISOString(),
        start_time: null,
        end_time: null,
        event_types: null,
      });

      sessionsRepo.updateStats('test-session-2', {
        event_count: 100,
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T11:00:00Z',
        event_types: ['TYPE_A', 'TYPE_B'],
      });

      const updated = sessionsRepo.findById('test-session-2');
      expect(updated?.event_count).toBe(100);
      expect(updated?.event_types).toEqual(['TYPE_A', 'TYPE_B']);
    });
  });

  describe('Event Management', () => {
    beforeAll(() => {
      // Create a session for event tests
      sessionsRepo.create({
        id: 'event-test-session',
        name: 'Event Test Session',
        created_at: new Date().toISOString(),
        start_time: null,
        end_time: null,
        event_types: null,
      });
    });

    afterAll(() => {
      eventsRepo.deleteBySession('event-test-session');
      sessionsRepo.delete('event-test-session');
    });

    it('creates events in sequence', () => {
      for (let i = 1; i <= 10; i++) {
        eventsRepo.create({
          id: `evt-${i}`,
          session_id: 'event-test-session',
          sequence: i,
          timestamp: new Date(2024, 0, 1, 10, i).toISOString(),
          type: i % 2 === 0 ? 'EVEN' : 'ODD',
          payload: { index: i },
        });
      }

      const count = eventsRepo.countBySession('event-test-session');
      expect(count).toBe(10);
    });

    it('retrieves events with pagination', () => {
      const page1 = eventsRepo.findBySession('event-test-session', { limit: 3 });
      expect(page1.events).toHaveLength(3);
      expect(page1.nextCursor).toBe('3');

      const page2 = eventsRepo.findBySession('event-test-session', {
        limit: 3,
        cursor: page1.nextCursor || undefined,
      });
      expect(page2.events[0].sequence).toBe(4);
    });

    it('filters events by type', () => {
      const evenEvents = eventsRepo.findBySession('event-test-session', {
        eventType: 'EVEN',
      });

      evenEvents.events.forEach((event) => {
        expect(event.type).toBe('EVEN');
      });
    });

    it('finds event by sequence', () => {
      const event = eventsRepo.findBySequence('event-test-session', 5);
      expect(event).not.toBeNull();
      expect(event?.id).toBe('evt-5');
    });

    it('retrieves unique event types', () => {
      const types = eventsRepo.getEventTypes('event-test-session');
      expect(types).toContain('EVEN');
      expect(types).toContain('ODD');
    });
  });

  describe('State Snapshots', () => {
    it('calculates state at sequence', async () => {
      // This tests the snapshot calculator integration
      const { SnapshotCalculator } = await import('../../src/services/snapshotCalculator');
      
      const calculator = new SnapshotCalculator({ checkpointInterval: 5 });
      
      // Simulate entity operations
      calculator.addOperations([
        { type: 'CREATE', entityType: 'user', entity: { id: '1', name: 'Alice' } },
        { type: 'CREATE', entityType: 'user', entity: { id: '2', name: 'Bob' } },
        { type: 'UPDATE', entityType: 'user', entityId: '1', changes: { name: 'Alicia' } },
        { type: 'DELETE', entityType: 'user', entityId: '2' },
      ]);

      // State after sequence 1
      const state1 = calculator.calculateAtSequence(1);
      expect(Object.keys(state1.entities.user || {})).toHaveLength(1);

      // State after sequence 4 (final)
      const state4 = calculator.getFinalState();
      expect(Object.keys(state4.entities.user || {})).toHaveLength(1);
      expect(state4.entities.user['1'].name).toBe('Alicia');
    });

    it('optimizes calculation using checkpoints', async () => {
      const { SnapshotCalculator } = await import('../../src/services/snapshotCalculator');
      
      const calculator = new SnapshotCalculator({ checkpointInterval: 10 });
      
      // Add 50 operations
      const operations = Array.from({ length: 50 }, (_, i) => ({
        type: 'CREATE' as const,
        entityType: 'item',
        entity: { id: String(i), name: `Item ${i}` },
      }));
      
      calculator.addOperations(operations);

      // Calculate optimized at sequence 25
      const start = performance.now();
      const state = calculator.calculateOptimized(25);
      const elapsed = performance.now() - start;

      expect(Object.keys(state.entities.item || {})).toHaveLength(25);
      // Should complete quickly (under 100ms)
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Filtering', () => {
    beforeAll(() => {
      // Create session with mixed events
      sessionsRepo.create({
        id: 'filter-test-session',
        name: 'Filter Test Session',
        created_at: new Date().toISOString(),
        start_time: null,
        end_time: null,
        event_types: null,
      });

      // Add events with different types and timestamps
      const baseTime = new Date('2024-01-01T10:00:00Z').getTime();
      const events = [
        { id: 'f-evt-1', type: 'ERROR', offset: 0 },
        { id: 'f-evt-2', type: 'INFO', offset: 1000 },
        { id: 'f-evt-3', type: 'ERROR', offset: 2000 },
        { id: 'f-evt-4', type: 'WARNING', offset: 3000 },
        { id: 'f-evt-5', type: 'ERROR', offset: 4000 },
      ];

      events.forEach((evt, index) => {
        eventsRepo.create({
          id: evt.id,
          session_id: 'filter-test-session',
          sequence: index + 1,
          timestamp: new Date(baseTime + evt.offset).toISOString(),
          type: evt.type,
          payload: {},
        });
      });
    });

    afterAll(() => {
      eventsRepo.deleteBySession('filter-test-session');
      sessionsRepo.delete('filter-test-session');
    });

    it('filters by event type', () => {
      const errorEvents = eventsRepo.findBySession('filter-test-session', {
        eventType: 'ERROR',
      });

      expect(errorEvents.events).toHaveLength(3);
      errorEvents.events.forEach((e) => {
        expect(e.type).toBe('ERROR');
      });
    });

    it('filters by time range', () => {
      const filtered = eventsRepo.findBySession('filter-test-session', {
        startTime: '2024-01-01T10:00:02Z',
        endTime: '2024-01-01T10:00:04Z',
      });

      expect(filtered.events).toHaveLength(2);
    });
  });

  describe('Large Dataset Performance', () => {
    it('handles 1000 events efficiently', () => {
      sessionsRepo.create({
        id: 'perf-test-session',
        name: 'Performance Test Session',
        created_at: new Date().toISOString(),
        start_time: null,
        end_time: null,
        event_types: null,
      });

      const startTime = Date.now();
      
      for (let i = 1; i <= 1000; i++) {
        eventsRepo.create({
          id: `perf-evt-${i}`,
          session_id: 'perf-test-session',
          sequence: i,
          timestamp: new Date().toISOString(),
          type: `TYPE_${i % 10}`,
          payload: { index: i },
        });
      }

      const insertTime = Date.now() - startTime;

      // Should insert 1000 events in reasonable time
      expect(insertTime).toBeLessThan(5000);

      // Retrieval should also be fast
      const retrieveStart = Date.now();
      const { events } = eventsRepo.findBySession('perf-test-session', { limit: 1000 });
      const retrieveTime = Date.now() - retrieveStart;

      expect(events).toHaveLength(1000);
      expect(retrieveTime).toBeLessThan(1000);

      // Cleanup
      eventsRepo.deleteBySession('perf-test-session');
      sessionsRepo.delete('perf-test-session');
    });
  });
});
