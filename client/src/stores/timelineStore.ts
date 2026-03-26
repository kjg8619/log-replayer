import { create } from 'zustand';
import type { LogEvent, Session, PlaybackSpeed } from '../types';

interface TimelineState {
  currentStep: number;
  events: LogEvent[];
  session: Session | null;
  isPlaying: boolean;
  playbackSpeed: PlaybackSpeed;
  playbackTimer: ReturnType<typeof setInterval> | null;
  
  setCurrentStep: (step: number) => void;
  setEvents: (events: LogEvent[]) => void;
  addEvents: (events: LogEvent[]) => void;
  setSession: (session: Session | null) => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  setPlaybackSpeed: (speed: PlaybackSpeed) => void;
  reset: () => void;
  getCurrentEvent: () => LogEvent | null;
  getTotalEvents: () => number;
}

const getIntervalForSpeed = (speed: PlaybackSpeed): number => {
  const baseInterval = 1000;
  return baseInterval / speed;
};

export const useTimelineStore = create<TimelineState>((set, get) => ({
  currentStep: 0,
  events: [],
  session: null,
  isPlaying: false,
  playbackSpeed: 1,
  playbackTimer: null,
  
  setCurrentStep: (step: number) => {
    const { events } = get();
    const clampedStep = Math.max(0, Math.min(step, events.length - 1));
    set({ currentStep: clampedStep });
  },
  
  setEvents: (events: LogEvent[]) => {
    set({ events, currentStep: 0 });
  },
  
  addEvents: (newEvents: LogEvent[]) => {
    const { events } = get();
    const merged = [...events, ...newEvents];
    const unique = merged.reduce((acc, event) => {
      if (!acc.find(e => e.sequence === event.sequence)) {
        acc.push(event);
      }
      return acc;
    }, [] as LogEvent[]);
    unique.sort((a, b) => a.sequence - b.sequence);
    set({ events: unique });
  },
  
  setSession: (session: Session | null) => {
    set({ session, currentStep: 0, events: [] });
  },
  
  play: () => {
    const { isPlaying, playbackSpeed, events, currentStep } = get();
    
    if (isPlaying) return;
    if (currentStep >= events.length - 1) {
      set({ currentStep: 0 });
    }
    
    const timer = setInterval(() => {
      const { currentStep: step, events: evts } = get();
      if (step < evts.length - 1) {
        set({ currentStep: step + 1 });
      } else {
        get().pause();
      }
    }, getIntervalForSpeed(playbackSpeed));
    
    set({ isPlaying: true, playbackTimer: timer });
  },
  
  pause: () => {
    const { playbackTimer } = get();
    if (playbackTimer) {
      clearInterval(playbackTimer);
    }
    set({ isPlaying: false, playbackTimer: null });
  },
  
  next: () => {
    const { currentStep, events } = get();
    if (currentStep < events.length - 1) {
      set({ currentStep: currentStep + 1 });
    }
  },
  
  previous: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },
  
  setPlaybackSpeed: (speed: PlaybackSpeed) => {
    const { isPlaying, playbackTimer } = get();
    
    if (playbackTimer) {
      clearInterval(playbackTimer);
    }
    
    if (isPlaying) {
      const timer = setInterval(() => {
        const { currentStep: step, events: evts } = get();
        if (step < evts.length - 1) {
          set({ currentStep: step + 1 });
        } else {
          get().pause();
        }
      }, getIntervalForSpeed(speed));
      set({ playbackSpeed: speed, playbackTimer: timer });
    } else {
      set({ playbackSpeed: speed, playbackTimer: null });
    }
  },
  
  reset: () => {
    const { playbackTimer } = get();
    if (playbackTimer) {
      clearInterval(playbackTimer);
    }
    set({
      currentStep: 0,
      events: [],
      session: null,
      isPlaying: false,
      playbackTimer: null,
    });
  },
  
  getCurrentEvent: () => {
    const { events, currentStep } = get();
    return events[currentStep] || null;
  },
  
  getTotalEvents: () => {
    const { events } = get();
    return events.length;
  },
}));
