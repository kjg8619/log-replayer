export interface Event {
  id: string;
  sequence: number;
  timestamp: string;
  type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface LogSession {
  id: string;
  name: string;
  createdAt: string;
  eventCount: number;
  timeRange: { start: string; end: string };
  eventTypes: string[];
}

export interface StateSnapshot {
  sessionId: string;
  eventId: string;
  sequence: number;
  state: Record<string, unknown>;
  diff: Record<string, unknown> | null;
}
