// Core event type matching backend schema
export interface LogEvent {
  id: string;
  sessionId: string;
  sequence: number;
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Session type matching backend schema
export interface Session {
  id: string;
  name: string;
  createdAt: string;
  eventCount: number;
  startTime: string | null;
  endTime: string | null;
  eventTypes: string[];
}

// API response types
export interface SessionsResponse {
  sessions: Session[];
  total: number;
}

export interface EventsResponse {
  events: LogEvent[];
  total: number;
  hasMore: boolean;
}

export interface SessionStats {
  eventCount: number;
  durationMs: number;
  eventTypes: string[];
}

// UI state types
export interface FilterState {
  type: string | null;
  search: string;
}

export type PlaybackSpeed = 0.5 | 1 | 2 | 5 | 10;

export interface PlaybackState {
  isPlaying: boolean;
  speed: PlaybackSpeed;
  currentIndex: number;
}

// Diff types for state comparison
export interface DiffResult {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
}

// Toast notification type
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Event filter type
export type EventType = string;
export interface EventFilter {
  types: EventType[];
  searchQuery: string;
}

// Component prop types
export interface JsonNodeProps {
  keyName: string | null;
  value: unknown;
  path: string[];
  depth: number;
  diffMode?: boolean;
  diffResult?: DiffResult;
  isLast?: boolean;
}

export interface TimelineItemProps {
  event: LogEvent;
  isSelected: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}

// Upload progress type
export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}

// Pagination type for events API
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

// Checkpoint type for state snapshots
export interface Checkpoint {
  id: number;
  sessionId: string;
  sequence: number;
  state: Record<string, unknown>;
  createdAt: string;
}

export interface StateSnapshot {
  sessionId: string;
  eventId: string;
  sequence: number;
  state: Record<string, unknown>;
  diff: Record<string, unknown> | null;
}
