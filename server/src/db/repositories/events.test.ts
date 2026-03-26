import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTestDatabase } from '../helper';
import { SessionsRepository } from './sessions';
import { EventsRepository, type Event } from './events';

describe('EventsRepository', () => {
  let repository: EventsRepository;
  let sessionsRepository: SessionsRepository;
  let cleanup: () => void;

  const createEvent = (overrides: Partial<Event> = {}): Event => ({
    id: 'evt-1',
    sessionId: 'sess-1',
    sequence: 1,
    timestamp: '2024-01-01T10:00:00Z',
    type: 'TEST',
    payload: { data: 'test' },
    ...overrides,
  });

  beforeEach(() => {
    const { db, cleanup: cleanupDb } = openTestDatabase();
    repository = new EventsRepository(db);
    sessionsRepository = new SessionsRepository(db);
    cleanup = cleanupDb;

    sessionsRepository.create({
      id: 'sess-1',
      name: 'Test Session',
      createdAt: '2024-01-01T00:00:00Z',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('creates an event', () => {
    const result = repository.create(createEvent());

    expect(result.id).toBe('evt-1');
    expect(result.sessionId).toBe('sess-1');
  });

  it('persists metadata', () => {
    const result = repository.create(
      createEvent({
        metadata: { source: 'test' },
      }),
    );

    expect(result.metadata).toEqual({ source: 'test' });
  });

  it('creates many events', () => {
    const events = [
      createEvent({ id: 'evt-1', sequence: 1 }),
      createEvent({ id: 'evt-2', sequence: 2 }),
      createEvent({ id: 'evt-3', sequence: 3 }),
    ];

    expect(repository.createMany(events)).toBe(3);
  });

  it('finds events by id', () => {
    repository.create(createEvent());

    const result = repository.findById('evt-1');
    expect(result?.payload).toEqual({ data: 'test' });
  });

  it('lists events by session with pagination', () => {
    for (let i = 0; i < 25; i++) {
      repository.create(
        createEvent({
          id: `evt-${i}`,
          sequence: i + 1,
          sessionId: 'sess-1',
          type: i % 2 === 0 ? 'EVEN' : 'ODD',
        }),
      );
    }

    const page1 = repository.listBySession('sess-1', { limit: 10 });
    expect(page1.events).toHaveLength(10);
    expect(page1.nextCursor).toBe(10);

    const page2 = repository.listBySession('sess-1', { limit: 10, cursor: page1.nextCursor ?? undefined });
    expect(page2.events[0].sequence).toBe(11);
  });

  it('returns only requested session events', () => {
    sessionsRepository.create({
      id: 'sess-2',
      name: 'Other Session',
      createdAt: '2024-01-01T00:00:00Z',
    });

    repository.create(createEvent({ id: 'evt-1', sessionId: 'sess-1' }));
    repository.create(createEvent({ id: 'evt-2', sessionId: 'sess-2' }));

    const result = repository.listBySession('sess-1');
    expect(result.events).toHaveLength(1);
    expect(result.events[0].sessionId).toBe('sess-1');
  });

  it('finds events by sequence', () => {
    for (let i = 0; i < 10; i++) {
      repository.create(createEvent({ id: `evt-${i}`, sequence: i + 1 }));
    }

    expect(repository.findBySequence('sess-1', 5)?.id).toBe('evt-4');
    expect(repository.findBySequence('sess-1', 999)).toBeNull();
  });

  it('counts events by session', () => {
    for (let i = 0; i < 15; i++) {
      repository.create(createEvent({ id: `evt-${i}` }));
    }

    expect(repository.countBySession('sess-1')).toBe(15);
    expect(repository.countBySession('missing')).toBe(0);
  });

  it('deletes events by session', () => {
    for (let i = 0; i < 10; i++) {
      repository.create(createEvent({ id: `evt-${i}` }));
    }

    repository.deleteBySession('sess-1');
    expect(repository.countBySession('sess-1')).toBe(0);
  });

  it('returns sorted unique event types', () => {
    ['USER_CREATED', 'USER_UPDATED', 'ORDER_CREATED', 'USER_DELETED'].forEach((type, index) => {
      repository.create(createEvent({ id: `evt-${index}`, type }));
    });

    expect(repository.getEventTypes('sess-1')).toEqual([
      'ORDER_CREATED',
      'USER_CREATED',
      'USER_DELETED',
      'USER_UPDATED',
    ]);
  });
});
