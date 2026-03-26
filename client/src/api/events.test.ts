import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  fetchEvents,
  fetchEvent,
  fetchEventsAroundSequence,
  fetchSnapshot,
  fetchSnapshots,
  fetchEventTypes,
  streamEvents,
  searchEvents,
} from './events';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock EventSource
const mockClose = vi.fn();
let lastEventSource: {
  close: () => void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: (() => void) | null;
} | null = null;

vi.stubGlobal(
  'EventSource',
  vi.fn(function EventSourceMock(this: typeof lastEventSource) {
    lastEventSource = {
      close: mockClose,
      onmessage: null,
      onerror: null,
    };
    return lastEventSource;
  }),
);

describe('events API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchEvents', () => {
    it('fetches events for session', async () => {
      const mockEvents = [
        { id: 'evt-1', sessionId: 'sess-1', sequence: 1, timestamp: '2024-01-01T00:00:01Z', type: 'TEST', payload: {} },
        { id: 'evt-2', sessionId: 'sess-1', sequence: 2, timestamp: '2024-01-01T00:00:02Z', type: 'TEST', payload: {} },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          events: mockEvents,
          has_more: false,
          next_cursor: null,
        }),
      });

      const result = await fetchEvents('sess-1');
      
      expect(result.events).toHaveLength(2);
      expect(result.has_more).toBe(false);
    });

    it('includes query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: [], has_more: false, next_cursor: null }),
      });

      await fetchEvents('sess-1', { limit: 50, eventType: 'ERROR' });
      
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=50');
      expect(url).toContain('event_type=ERROR');
    });

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

      await expect(fetchEvents('sess-1')).rejects.toThrow();
    });
  });

  describe('fetchEvent', () => {
    it('fetches single event', async () => {
      const mockEvent = { id: 'evt-1', sessionId: 'sess-1', sequence: 1, timestamp: '2024-01-01T00:00:01Z', type: 'TEST', payload: {} };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockEvent),
      });

      const result = await fetchEvent('sess-1', 'evt-1');
      
      expect(result.id).toBe('evt-1');
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/sess-1/events/evt-1');
    });
  });

  describe('fetchEventsAroundSequence', () => {
    it('fetches events in range', async () => {
      const mockEvents = [
        { id: 'evt-8', sessionId: 'sess-1', sequence: 8, timestamp: '2024-01-01T00:00:08Z', type: 'TEST', payload: {} },
        { id: 'evt-9', sessionId: 'sess-1', sequence: 9, timestamp: '2024-01-01T00:00:09Z', type: 'TEST', payload: {} },
        { id: 'evt-10', sessionId: 'sess-1', sequence: 10, timestamp: '2024-01-01T00:00:10Z', type: 'TEST', payload: {} },
        { id: 'evt-11', sessionId: 'sess-1', sequence: 11, timestamp: '2024-01-01T00:00:11Z', type: 'TEST', payload: {} },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      });

      const result = await fetchEventsAroundSequence('sess-1', 10, 2);
      
      expect(result).toHaveLength(4);
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('start_sequence=8');
      expect(url).toContain('end_sequence=12');
    });
  });

  describe('fetchSnapshot', () => {
    it('fetches snapshot at sequence', async () => {
      const mockState = { entities: { user: { '1': { id: '1', name: 'Test' } } } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ state: mockState }),
      });

      const result = await fetchSnapshot('sess-1', 100);
      
      expect(result).toEqual(mockState);
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/sess-1/snapshots/100');
    });
  });

  describe('fetchSnapshots', () => {
    it('fetches all snapshots for session', async () => {
      const mockSnapshots = [
        { sessionId: 'sess-1', eventId: 'evt-100', sequence: 100, state: {}, diff: null },
        { sessionId: 'sess-1', eventId: 'evt-200', sequence: 200, state: {}, diff: null },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSnapshots),
      });

      const result = await fetchSnapshots('sess-1');
      
      expect(result).toHaveLength(2);
      expect(result[0]?.sequence).toBe(100);
    });
  });

  describe('fetchEventTypes', () => {
    it('fetches unique event types', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          event_types: ['ERROR', 'INFO', 'WARNING'],
        }),
      });

      const result = await fetchEventTypes('sess-1');
      
      expect(result).toEqual(['ERROR', 'INFO', 'WARNING']);
    });
  });

  describe('streamEvents', () => {
    it('creates EventSource connection', () => {
      const onEvent = vi.fn();
      const cleanup = streamEvents('sess-1', onEvent);
      
      expect(EventSource).toHaveBeenCalled();
      cleanup();
      expect(mockClose).toHaveBeenCalled();
    });

    it('handles message events', () => {
      const onEvent = vi.fn();
      streamEvents('sess-1', onEvent);
      
      const event = { data: JSON.stringify({ id: 'evt-1', type: 'TEST' }) };
      lastEventSource?.onmessage?.(event as MessageEvent);
      
      expect(onEvent).toHaveBeenCalled();
    });
  });

  describe('searchEvents', () => {
    it('searches events by query', async () => {
      const mockEvents = [
        { id: 'evt-1', sessionId: 'sess-1', sequence: 1, timestamp: '2024-01-01T00:00:01Z', type: 'ERROR', payload: { message: 'Database connection failed' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ events: mockEvents }),
      });

      const result = await searchEvents('sess-1', 'Database');
      
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/sess-1/events/search?q=Database');
    });
  });
});
