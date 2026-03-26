import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Timeline } from './Timeline';
import { useTimelineStore } from '../stores/timelineStore';
import type { LogEvent, Session } from '../types';

Element.prototype.scrollIntoView = vi.fn();

const createMockEvent = (sequence: number, type = 'test'): LogEvent => ({
  id: `event-${sequence}`,
  sessionId: 'session-1',
  sequence,
  timestamp: new Date(2024, 0, 1, 12, 0, sequence).toISOString(),
  type,
  payload: { value: sequence },
});

const createMockSession = (): Session => ({
  id: 'session-1',
  name: 'Test Session',
  createdAt: new Date().toISOString(),
  eventCount: 3,
  startTime: null,
  endTime: null,
  eventTypes: ['test'],
});

describe.skip('Timeline', () => {
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
  
  describe('rendering', () => {
    it('should show empty state when no session', () => {
      render(<Timeline />);
      
      expect(screen.getByText(/no session loaded/i)).toBeInTheDocument();
    });
    
    it('should show loading state when session has no events', () => {
      useTimelineStore.setState({
        session: createMockSession(),
        events: [],
      });
      
      render(<Timeline />);
      
      expect(screen.getByText(/loading events/i)).toBeInTheDocument();
    });
    
    it('should render session name and event count', () => {
      useTimelineStore.setState({
        session: createMockSession(),
        events: [
          createMockEvent(0),
          createMockEvent(1),
          createMockEvent(2),
        ],
      });
      
      render(<Timeline />);
      
      expect(screen.getByText('Test Session')).toBeInTheDocument();
      expect(screen.getByText(/1 \/ 3/)).toBeInTheDocument();
    });
    
    it('should render event items', () => {
      useTimelineStore.setState({
        session: createMockSession(),
        events: [createMockEvent(0, 'click')],
      });
      
      render(<Timeline />);
      
      expect(screen.getByText('#0')).toBeInTheDocument();
      expect(screen.getByText('click')).toBeInTheDocument();
    });
  });
  
  describe('event type badges', () => {
    it('should display unique event types', () => {
      useTimelineStore.setState({
        session: createMockSession(),
        events: [
          createMockEvent(0, 'click'),
          createMockEvent(1, 'api'),
          createMockEvent(2, 'error'),
        ],
      });
      
      render(<Timeline />);
      
      expect(screen.getByText('click')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
      expect(screen.getByText('error')).toBeInTheDocument();
    });
    
    it('should show count for more than 5 types', () => {
      useTimelineStore.setState({
        session: createMockSession(),
        events: [
          createMockEvent(0, 'type1'),
          createMockEvent(1, 'type2'),
          createMockEvent(2, 'type3'),
          createMockEvent(3, 'type4'),
          createMockEvent(4, 'type5'),
          createMockEvent(5, 'type6'),
        ],
      });
      
      render(<Timeline />);
      
      expect(screen.getByText('+1')).toBeInTheDocument();
    });
  });
  
  describe('event selection', () => {
    it('should call setCurrentStep when clicking an event', () => {
      const setCurrentStep = vi.fn();
      useTimelineStore.setState({
        session: createMockSession(),
        events: [
          createMockEvent(0),
          createMockEvent(1),
        ],
        isPlaying: false,
        setCurrentStep,
      });
      
      render(<Timeline />);
      
      const eventItems = screen.getAllByText('#0');
      fireEvent.click(eventItems[0]);
      
      expect(setCurrentStep).toHaveBeenCalledWith(0);
    });
    
    it('should not respond to clicks when playing', () => {
      const setCurrentStep = vi.fn();
      useTimelineStore.setState({
        session: createMockSession(),
        events: [createMockEvent(0)],
        isPlaying: true,
        setCurrentStep,
      });
      
      render(<Timeline />);
      
      const eventItems = screen.getAllByText('#0');
      fireEvent.click(eventItems[0]);
      
      expect(setCurrentStep).not.toHaveBeenCalled();
    });
  });
  
  describe('active event styling', () => {
    it('should mark current step as active', () => {
      useTimelineStore.setState({
        session: createMockSession(),
        events: [
          createMockEvent(0),
          createMockEvent(1),
        ],
        currentStep: 1,
      });
      
      render(<Timeline />);
      
      const activeItems = document.querySelectorAll('.event-item.active');
      expect(activeItems).toHaveLength(1);
    });
    
    it('should show play indicator for active event', () => {
      useTimelineStore.setState({
        session: createMockSession(),
        events: [createMockEvent(0)],
        currentStep: 0,
      });
      
      render(<Timeline />);
      
      expect(screen.getByText('▶')).toBeInTheDocument();
    });
  });
  
  describe('virtual scrolling hint', () => {
    it('should show scroll hint for large lists', () => {
      const events: LogEvent[] = [];
      for (let i = 0; i < 150; i++) {
        events.push(createMockEvent(i));
      }
      
      useTimelineStore.setState({
        session: createMockSession(),
        events,
        currentStep: 75,
      });
      
      render(<Timeline />);
      
      expect(screen.getByText(/showing \d+ of 150 events/i)).toBeInTheDocument();
    });
  });
});
