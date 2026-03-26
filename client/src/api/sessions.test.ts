import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  uploadLogFile,
  fetchSessions,
  fetchSession,
  deleteSession,
  searchSessions,
  updateSession,
  exportSession,
  getSessionStats,
} from './sessions';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock XMLHttpRequest
const mockXHRSend = vi.fn();
const mockXHROpen = vi.fn();
const mockUploadOnProgress = vi.fn();
let lastXHR: {
  open: typeof mockXHROpen;
  send: (...args: unknown[]) => void;
  upload: { onprogress: typeof mockUploadOnProgress | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  status: number;
  statusText: string;
  responseText: string;
} | null = null;

vi.stubGlobal(
  'XMLHttpRequest',
  vi.fn(function XMLHttpRequestMock(this: typeof lastXHR) {
    lastXHR = {
      open: mockXHROpen,
      send: (...args: unknown[]) => {
        mockXHRSend(...args);
        lastXHR?.onload?.();
      },
      upload: { onprogress: mockUploadOnProgress },
      onload: null,
      onerror: null,
      status: 200,
      statusText: 'OK',
      responseText: JSON.stringify({ session: { id: 'sess-1', name: 'Test' } }),
    };
    return lastXHR;
  }),
);

describe('sessions API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadLogFile', () => {
    it('uploads file successfully', async () => {
      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      
      const session = await uploadLogFile(mockFile);
      
      expect(mockXHROpen).toHaveBeenCalledWith('POST', '/api/sessions/upload');
      expect(session.id).toBe('sess-1');
    });

    it('reports upload progress', async () => {
      const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
      const progressCallback = vi.fn();
      
      // Mock the progress handler
      mockUploadOnProgress.mockImplementation((event: ProgressEvent) => {
        Object.defineProperty(event, 'lengthComputable', { value: true });
        Object.defineProperty(event, 'loaded', { value: 50 });
        Object.defineProperty(event, 'total', { value: 100 });
      });

      await uploadLogFile(mockFile, progressCallback);
    });
  });

  describe('fetchSessions', () => {
    it('fetches all sessions', async () => {
      const mockSessions = [
        { id: 'sess-1', name: 'Session 1', createdAt: '2024-01-01', eventCount: 100, startTime: null, endTime: null, eventTypes: [] },
        { id: 'sess-2', name: 'Session 2', createdAt: '2024-01-01', eventCount: 50, startTime: null, endTime: null, eventTypes: [] },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ sessions: mockSessions, total: 2 }),
      });

      const result = await fetchSessions();
      
      expect(result.sessions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions');
    });

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(fetchSessions()).rejects.toThrow('Failed to fetch sessions: Not Found');
    });
  });

  describe('fetchSession', () => {
    it('fetches single session', async () => {
      const mockSession = { id: 'sess-1', name: 'Test Session' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: mockSession }),
      });

      const result = await fetchSession('sess-1');
      
      expect(result.session.id).toBe('sess-1');
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/sess-1');
    });
  });

  describe('deleteSession', () => {
    it('deletes session successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      });

      await deleteSession('sess-1');
      
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/sess-1', {
        method: 'DELETE',
      });
    });

    it('throws on error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

      await expect(deleteSession('sess-1')).rejects.toThrow();
    });
  });

  describe('searchSessions', () => {
    it('searches sessions by query', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          sessions: [{ id: 'sess-1', name: 'Production Logs' }],
          total: 1,
        }),
      });

      const result = await searchSessions('Production');
      
      expect(result).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/search?q=Production');
    });
  });

  describe('updateSession', () => {
    it('updates session name', async () => {
      const mockSession = { id: 'sess-1', name: 'Updated Name' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ session: mockSession }),
      });

      const result = await updateSession('sess-1', { name: 'Updated Name' });
      
      expect(result.name).toBe('Updated Name');
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/sess-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
    });
  });

  describe('exportSession', () => {
    it('exports session as blob', async () => {
      const mockBlob = new Blob(['test data'], { type: 'application/json' });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        blob: () => Promise.resolve(mockBlob),
      });

      const result = await exportSession('sess-1');
      
      expect(result).toBeInstanceOf(Blob);
      expect(mockFetch).toHaveBeenCalledWith('/api/sessions/sess-1/export');
    });
  });

  describe('getSessionStats', () => {
    it('fetches session statistics', async () => {
      const mockStats = {
        event_count: 1000,
        duration_ms: 60000,
        event_types: ['A', 'B', 'C'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      });

      const result = await getSessionStats('sess-1');
      
      expect(result.event_count).toBe(1000);
      expect(result.duration_ms).toBe(60000);
    });
  });
});
