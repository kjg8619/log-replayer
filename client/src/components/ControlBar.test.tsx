import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ControlBar } from './ControlBar';
import { useTimelineStore } from '../stores/timelineStore';
import type { LogEvent } from '../types';

vi.useFakeTimers();

const createMockEvent = (sequence: number): LogEvent => ({
  id: `event-${sequence}`,
  sessionId: 'session-1',
  sequence,
  timestamp: new Date(2024, 0, 1, 12, 0, sequence).toISOString(),
  type: 'test',
  payload: { value: sequence },
});

describe.skip('ControlBar', () => {
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
  
  describe('playback controls', () => {
    it('should render play button', () => {
      render(<ControlBar />);
      
      expect(screen.getByLabelText('Play')).toBeInTheDocument();
    });
    
    it('should render previous and next buttons', () => {
      render(<ControlBar />);
      
      expect(screen.getByLabelText('Previous event')).toBeInTheDocument();
      expect(screen.getByLabelText('Next event')).toBeInTheDocument();
    });
    
    it('should disable previous button at step 0', () => {
      useTimelineStore.setState({
        events: [createMockEvent(0), createMockEvent(1)],
        currentStep: 0,
      });
      
      render(<ControlBar />);
      
      expect(screen.getByLabelText('Previous event')).toBeDisabled();
    });
    
    it('should disable next button at last step', () => {
      useTimelineStore.setState({
        events: [createMockEvent(0), createMockEvent(1)],
        currentStep: 1,
      });
      
      render(<ControlBar />);
      
      expect(screen.getByLabelText('Next event')).toBeDisabled();
    });
    
    it('should disable play button when no events', () => {
      render(<ControlBar />);
      
      expect(screen.getByLabelText('Play')).toBeDisabled();
    });
    
    it('should toggle to pause icon when playing', () => {
      useTimelineStore.setState({
        events: [createMockEvent(0)],
        isPlaying: true,
      });
      
      render(<ControlBar />);
      
      expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    });
  });
  
  describe('play/pause actions', () => {
    it('should call play when play button is clicked', () => {
      const play = vi.fn();
      useTimelineStore.setState({
        events: [createMockEvent(0)],
        play,
      });
      
      render(<ControlBar />);
      
      fireEvent.click(screen.getByLabelText('Play'));
      expect(play).toHaveBeenCalled();
    });
    
    it('should call pause when pause button is clicked', () => {
      const pause = vi.fn();
      useTimelineStore.setState({
        events: [createMockEvent(0)],
        isPlaying: true,
        pause,
      });
      
      render(<ControlBar />);
      
      fireEvent.click(screen.getByLabelText('Pause'));
      expect(pause).toHaveBeenCalled();
    });
  });
  
  describe('step navigation', () => {
    it('should call next when next button is clicked', () => {
      const next = vi.fn();
      useTimelineStore.setState({
        events: [createMockEvent(0), createMockEvent(1)],
        currentStep: 0,
        next,
      });
      
      render(<ControlBar />);
      
      fireEvent.click(screen.getByLabelText('Next event'));
      expect(next).toHaveBeenCalled();
    });
    
    it('should call previous when previous button is clicked', () => {
      const previous = vi.fn();
      useTimelineStore.setState({
        events: [createMockEvent(0), createMockEvent(1)],
        currentStep: 1,
        previous,
      });
      
      render(<ControlBar />);
      
      fireEvent.click(screen.getByLabelText('Previous event'));
      expect(previous).toHaveBeenCalled();
    });
  });
  
  describe('position display', () => {
    it('should display current position', () => {
      useTimelineStore.setState({
        events: [createMockEvent(0), createMockEvent(1), createMockEvent(2)],
        currentStep: 1,
      });
      
      render(<ControlBar />);
      
      expect(screen.getByText('Step 2 / 3')).toBeInTheDocument();
    });
    
    it('should show 0 events when empty', () => {
      render(<ControlBar />);
      
      expect(screen.getByText('Step 1 / 0')).toBeInTheDocument();
    });
  });
  
  describe('speed control', () => {
    it('should render all speed options', () => {
      render(<ControlBar />);
      
      expect(screen.getByText('0.5x')).toBeInTheDocument();
      expect(screen.getByText('1x')).toBeInTheDocument();
      expect(screen.getByText('2x')).toBeInTheDocument();
      expect(screen.getByText('5x')).toBeInTheDocument();
    });
    
    it('should mark current speed as active', () => {
      useTimelineStore.setState({
        playbackSpeed: 2,
      });
      
      render(<ControlBar />);
      
      const speedButtons = screen.getAllByRole('button', { name: /x$/ });
      const activeButton = speedButtons.find(btn => 
        btn.classList.contains('active')
      );
      expect(activeButton?.textContent).toBe('2x');
    });
    
    it('should call setPlaybackSpeed when speed is clicked', () => {
      const setPlaybackSpeed = vi.fn();
      useTimelineStore.setState({
        playbackSpeed: 1,
        setPlaybackSpeed,
      });
      
      render(<ControlBar />);
      
      fireEvent.click(screen.getByText('5x'));
      expect(setPlaybackSpeed).toHaveBeenCalledWith(5);
    });
  });
  
  describe('jump to input', () => {
    it('should render jump input', () => {
      render(<ControlBar />);
      
      expect(screen.getByLabelText('Jump to:')).toBeInTheDocument();
    });
    
    it('should update jump value on input', () => {
      render(<ControlBar />);
      
      const input = screen.getByPlaceholderText('0');
      fireEvent.change(input, { target: { value: '42' } });
      
      expect(input).toHaveValue(42);
    });
    
    it('should call setCurrentStep on form submit', () => {
      const setCurrentStep = vi.fn();
      useTimelineStore.setState({
        events: Array.from({ length: 100 }, (_, i) => createMockEvent(i)),
        setCurrentStep,
      });
      
      render(<ControlBar />);
      
      const input = screen.getByPlaceholderText('0');
      fireEvent.change(input, { target: { value: '50' } });
      
      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      expect(setCurrentStep).toHaveBeenCalled();
    });
    
    it('should clear input after submit', () => {
      const setCurrentStep = vi.fn();
      useTimelineStore.setState({
        events: Array.from({ length: 100 }, (_, i) => createMockEvent(i)),
        setCurrentStep,
      });
      
      render(<ControlBar />);
      
      const input = screen.getByPlaceholderText('0');
      fireEvent.change(input, { target: { value: '50' } });
      
      const form = input.closest('form');
      if (form) {
        fireEvent.submit(form);
      }
      
      expect(input).toHaveValue(0);
    });
    
    it('should disable go button when input is empty', () => {
      useTimelineStore.setState({
        events: [createMockEvent(0)],
      });
      
      render(<ControlBar />);
      
      expect(screen.getByText('Go')).toBeDisabled();
    });
  });
});
