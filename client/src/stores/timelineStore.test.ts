import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTimelineStore } from './timelineStore';
import type { LogEvent, Session } from '../types';

const mockSession: Session = {
  id: 'sess-1',
  name: 'Test Session',
  createdAt: '2024-01-01T00:00:00Z',
  eventCount: 2,
  startTime: null,
  endTime: null,
  eventTypes: ['TEST'],
};

const mockEvent: LogEvent = {
  id: 'evt-1',
  sessionId: 'sess-1',
  sequence: 1,
  timestamp: '2024-01-01T00:00:00Z',
  type: 'TEST',
  payload: {},
};

describe('timelineStore', () => {
  beforeEach(() => {
    useTimelineStore.setState({
      currentStep: 0,
      events: [],
      session: null,
      isPlaying: false,
      playbackSpeed: 1,
      playbackTimer: null,
    });
  });

  it('exposes the initial state', () => {
    const { result } = renderHook(() => useTimelineStore());

    expect(result.current.events).toEqual([]);
    expect(result.current.session).toBeNull();
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isPlaying).toBe(false);
  });

  it('updates session and events', () => {
    const { result } = renderHook(() => useTimelineStore());

    act(() => {
      result.current.setSession(mockSession);
      result.current.setEvents([mockEvent]);
    });

    expect(result.current.session).toEqual(mockSession);
    expect(result.current.events).toEqual([mockEvent]);
  });

  it('navigates through events', () => {
    const { result } = renderHook(() => useTimelineStore());

    act(() => {
      result.current.setEvents([
        mockEvent,
        { ...mockEvent, id: 'evt-2', sequence: 2 },
      ]);
      result.current.setCurrentStep(1);
      result.current.previous();
    });

    expect(result.current.currentStep).toBe(0);
    expect(result.current.getCurrentEvent()).toEqual(mockEvent);
  });
});
