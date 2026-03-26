import { describe, it, expect } from 'vitest';
import { generateDemoEvents } from '../utils/demo';

describe('demo data generator', () => {
  describe('generateDemoEvents', () => {
    it('should generate requested number of events', () => {
      const events = generateDemoEvents(100);
      expect(events).toHaveLength(100);
    });

    it('should generate events with required properties', () => {
      const events = generateDemoEvents(10);
      events.forEach(event => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('payload');
      });
    });

    it('should generate monotonically increasing timestamps', () => {
      const events = generateDemoEvents(100);
      for (let i = 1; i < events.length; i++) {
        const current = events[i];
        const previous = events[i - 1];
        if (!current || !previous) continue;
        expect(Date.parse(current.timestamp)).toBeGreaterThanOrEqual(Date.parse(previous.timestamp));
      }
    });

    it('should handle large datasets (10k events)', () => {
      const events = generateDemoEvents(10000);
      expect(events).toHaveLength(10000);
    });
  });
});
