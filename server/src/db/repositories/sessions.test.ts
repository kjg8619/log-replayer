import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openTestDatabase } from '../helper';
import { SessionsRepository } from './sessions';

describe('SessionsRepository', () => {
  let repository: SessionsRepository;
  let cleanup: () => void;

  beforeEach(() => {
    const { db, cleanup: cleanupDb } = openTestDatabase();
    repository = new SessionsRepository(db);
    cleanup = cleanupDb;
  });

  afterEach(() => {
    cleanup();
  });

  it('creates a session', () => {
    const result = repository.create({
      id: 'sess-1',
      name: 'Test Session',
      createdAt: '2024-01-01T10:00:00Z',
    });

    expect(result.id).toBe('sess-1');
    expect(result.name).toBe('Test Session');
    expect(result.eventCount).toBe(0);
  });

  it('generates createdAt when omitted', () => {
    const result = repository.create({
      id: 'sess-1',
      name: 'Test Session',
    });

    expect(result.createdAt).toBeTruthy();
  });

  it('finds existing session', () => {
    repository.create({
      id: 'sess-1',
      name: 'Test Session',
      createdAt: '2024-01-01T10:00:00Z',
    });

    const result = repository.findById('sess-1');
    expect(result?.name).toBe('Test Session');
  });

  it('returns null for missing session', () => {
    expect(repository.findById('missing')).toBeNull();
  });

  it('lists sessions in reverse chronological order', () => {
    repository.create({ id: 'sess-1', name: 'First', createdAt: '2024-01-01T10:00:00Z' });
    repository.create({ id: 'sess-2', name: 'Second', createdAt: '2024-01-02T10:00:00Z' });

    const result = repository.list();
    expect(result[0].name).toBe('Second');
    expect(result[1].name).toBe('First');
  });

  it('respects limit and offset', () => {
    for (let i = 0; i < 10; i++) {
      repository.create({
        id: `sess-${i}`,
        name: `Session ${i}`,
        createdAt: new Date(2024, 0, i + 1).toISOString(),
      });
    }

    const result = repository.list({ limit: 5, offset: 2 });
    expect(result).toHaveLength(5);
  });

  it('updates stats', () => {
    repository.create({ id: 'sess-1', name: 'Test', createdAt: '2024-01-01T10:00:00Z' });

    repository.updateStats('sess-1', {
      eventCount: 100,
      startTime: '2024-01-01T10:00:00Z',
      endTime: '2024-01-01T11:00:00Z',
      eventTypes: ['TYPE_A', 'TYPE_B'],
    });

    const result = repository.findById('sess-1');
    expect(result?.eventCount).toBe(100);
    expect(result?.startTime).toBe('2024-01-01T10:00:00Z');
    expect(result?.endTime).toBe('2024-01-01T11:00:00Z');
    expect(result?.eventTypes).toEqual(['TYPE_A', 'TYPE_B']);
  });

  it('clears event types when set to null', () => {
    repository.create({ id: 'sess-1', name: 'Test', createdAt: '2024-01-01T10:00:00Z' });

    repository.updateStats('sess-1', { eventTypes: [] });

    const result = repository.findById('sess-1');
    expect(result?.eventTypes).toEqual([]);
  });

  it('deletes sessions', () => {
    repository.create({ id: 'sess-1', name: 'Test', createdAt: '2024-01-01T10:00:00Z' });

    repository.delete('sess-1');

    expect(repository.findById('sess-1')).toBeNull();
  });

  it('counts sessions', () => {
    for (let i = 0; i < 5; i++) {
      repository.create({
        id: `sess-${i}`,
        name: `Session ${i}`,
        createdAt: new Date().toISOString(),
      });
    }

    expect(repository.count()).toBe(5);
  });
});
