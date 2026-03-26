import type { LogEvent, StateSnapshot } from '../types';

const API_BASE = '/api';

export interface FetchEventsOptions {
  limit?: number;
  eventType?: string;
  startSequence?: number;
  endSequence?: number;
}

export interface FetchEventsResponse {
  events: LogEvent[];
  has_more: boolean;
  next_cursor: string | null;
}

/**
 * Fetch events for a session with optional filters
 */
export async function fetchEvents(
  sessionId: string,
  options: FetchEventsOptions = {}
): Promise<FetchEventsResponse> {
  const params = new URLSearchParams();
  
  if (options.limit) params.set('limit', String(options.limit));
  if (options.eventType) params.set('event_type', options.eventType);
  if (options.startSequence !== undefined) params.set('start_sequence', String(options.startSequence));
  if (options.endSequence !== undefined) params.set('end_sequence', String(options.endSequence));
  
  const queryString = params.toString();
  const url = `${API_BASE}/sessions/${sessionId}/events${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch a single event by ID
 */
export async function fetchEvent(sessionId: string, eventId: string): Promise<LogEvent> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/events/${eventId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch event: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch events around a specific sequence number
 */
export async function fetchEventsAroundSequence(
  sessionId: string,
  sequence: number,
  range: number = 5
): Promise<LogEvent[]> {
  const startSequence = Math.max(0, sequence - range);
  const endSequence = sequence + range;
  
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/events?start_sequence=${startSequence}&end_sequence=${endSequence}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch events around sequence: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.events;
}

/**
 * Fetch snapshot/state at a specific sequence
 */
export async function fetchSnapshot(sessionId: string, sequence: number): Promise<unknown> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/snapshots/${sequence}`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch snapshot: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.state;
}

/**
 * Fetch all snapshots for a session
 */
export async function fetchSnapshots(sessionId: string): Promise<StateSnapshot[]> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/snapshots`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch snapshots: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch unique event types for a session
 */
export async function fetchEventTypes(sessionId: string): Promise<string[]> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/event-types`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch event types: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.event_types;
}

/**
 * Stream events using Server-Sent Events
 */
export function streamEvents(
  sessionId: string,
  onEvent: (event: LogEvent) => void
): () => void {
  const eventSource = new EventSource(`${API_BASE}/sessions/${sessionId}/events/stream`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch {
      console.error('Failed to parse event data');
    }
  };
  
  eventSource.onerror = () => {
    eventSource.close();
  };
  
  return () => {
    eventSource.close();
  };
}

/**
 * Search events by query string
 */
export async function searchEvents(sessionId: string, query: string): Promise<LogEvent[]> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/events/search?q=${encodeURIComponent(query)}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to search events: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.events;
}

/**
 * Get all events for a session (handles pagination)
 */
export async function getAllEvents(sessionId: string): Promise<LogEvent[]> {
  const allEvents: LogEvent[] = [];
  let cursor: string | null = null;
  
  do {
    const params = new URLSearchParams();
    if (cursor) params.set('cursor', cursor);
    params.set('limit', '100');
    
    const response = await fetch(
      `${API_BASE}/sessions/${sessionId}/events?${params.toString()}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    
    const data = await response.json();
    allEvents.push(...data.events);
    cursor = data.next_cursor;
  } while (cursor);
  
  return allEvents;
}

/**
 * Get a single event by sequence number
 */
export async function getEvent(sessionId: string, sequence: number): Promise<LogEvent> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/events/${sequence}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch event');
  }
  
  return response.json();
}

/**
 * Get snapshot/state at a specific sequence
 */
export async function getSnapshot(sessionId: string, sequence: number): Promise<StateSnapshot> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/snapshot/${sequence}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch snapshot');
  }
  
  return response.json();
}
