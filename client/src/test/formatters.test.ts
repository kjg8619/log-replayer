import { describe, it, expect } from 'vitest';
import { formatTimestamp, formatDuration, truncateString, generateId } from '../utils/formatters';

describe('formatters', () => {
  describe('formatTimestamp', () => {
    it('should format timestamp correctly', () => {
      const timestamp = new Date('2024-01-15T10:30:45.123').getTime();
      const result = formatTimestamp(timestamp);
      expect(result).toContain('10');
      expect(result).toContain('30');
      expect(result).toContain('45');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(2500)).toBe('2.5s');
    });

    it('should format minutes', () => {
      expect(formatDuration(65000)).toBe('1m 5s');
    });
  });

  describe('truncateString', () => {
    it('should not truncate short strings', () => {
      expect(truncateString('hello', 10)).toBe('hello');
    });

    it('should truncate long strings', () => {
      expect(truncateString('hello world', 8)).toBe('hello...');
    });
  });

  describe('generateId', () => {
    it('should generate unique ids', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });
});
