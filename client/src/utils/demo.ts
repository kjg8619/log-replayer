import { LogEvent } from '../types';
import { generateId } from './formatters';

const EVENT_TYPES = [
  'user-action',
  'api-call',
  'state-update',
  'error',
  'navigation',
  'form-submit',
  'data-fetch',
  'auth-event',
  'analytics',
  'custom',
];

const SAMPLE_DATA = [
  { userId: 'user-123', action: 'click', target: 'button-submit' },
  { userId: 'user-123', method: 'GET', url: '/api/users' },
  { userId: 'user-123', field: 'email', value: 'test@example.com' },
  { error: 'NetworkError', status: 500, message: 'Server error' },
  { userId: 'user-123', path: '/dashboard', referrer: '/home' },
  { formId: 'contact-form', fields: ['name', 'email', 'message'] },
  { endpoint: '/api/data', duration: 234 },
  { event: 'login', provider: 'google', userId: 'user-123' },
  { event: 'page_view', page: '/dashboard', duration: 4200 },
  { customType: 'workflow', step: 3, totalSteps: 5 },
];

export function generateDemoEvents(count: number = 10000): LogEvent[] {
  const events: LogEvent[] = [];
  let timestamp = Date.now() - count * 1000;

  for (let i = 0; i < count; i++) {
    const typeIndex = Math.floor(Math.random() * EVENT_TYPES.length);
    const dataIndex = Math.floor(Math.random() * SAMPLE_DATA.length);
    
    events.push({
      id: generateId(),
      timestamp: new Date(timestamp).toISOString(),
      type: EVENT_TYPES[typeIndex],
      payload: {
        ...SAMPLE_DATA[dataIndex],
        index: i,
        random: Math.random().toString(36).substring(7),
      },
      sessionId: 'demo-session',
      sequence: i + 1,
    });

    timestamp += Math.floor(Math.random() * 500) + 100;
  }

  return events;
}

export function generateLargeSession(): { name: string; events: LogEvent[] } {
  return {
    name: 'Large Demo Session (10,000 events)',
    events: generateDemoEvents(10000),
  };
}
