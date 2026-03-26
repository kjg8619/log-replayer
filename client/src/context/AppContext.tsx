import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { LogEvent, FilterState, PlaybackState, ToastMessage } from '../types';
import { generateId } from '../utils/formatters';

interface AppContextType {
  events: LogEvent[];
  setEvents: (events: LogEvent[]) => void;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  filter: FilterState;
  setFilter: (filter: FilterState) => void;
  playback: PlaybackState;
  setPlayback: (state: Partial<PlaybackState>) => void;
  filteredEvents: LogEvent[];
  eventTypes: string[];
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  currentEvent: LogEvent | null;
  previousEvent: LogEvent | null;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState<FilterState>({ type: null, search: '' });
  const [playback, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    speed: 1,
    currentIndex: 0,
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const eventTypes = useMemo(() => {
    const types = new Set(events.map(e => e.type));
    return Array.from(types).sort();
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      if (filter.type && event.type !== filter.type) {
        return false;
      }
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        const searchString = JSON.stringify(event).toLowerCase();
        if (!searchString.includes(searchLower)) {
          return false;
        }
      }
      return true;
    });
  }, [events, filter]);

  const currentEvent = useMemo(() => {
    return filteredEvents[selectedIndex] ?? null;
  }, [filteredEvents, selectedIndex]);

  const previousEvent = useMemo(() => {
    return selectedIndex > 0 ? filteredEvents[selectedIndex - 1] : null;
  }, [filteredEvents, selectedIndex]);

  const setPlayback = useCallback((state: Partial<PlaybackState>) => {
    setPlaybackState(prev => ({ ...prev, ...state }));
  }, []);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId();
    setToasts(prev => [...prev, { ...toast, id }]);
    const duration = toast.duration ?? 5000;
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const value = useMemo(() => ({
    events,
    setEvents,
    selectedIndex,
    setSelectedIndex,
    filter,
    setFilter,
    playback,
    setPlayback,
    filteredEvents,
    eventTypes,
    toasts,
    addToast,
    removeToast,
    currentEvent,
    previousEvent,
  }), [
    events, selectedIndex, filter, playback, filteredEvents, eventTypes,
    toasts, addToast, removeToast, currentEvent, previousEvent
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
