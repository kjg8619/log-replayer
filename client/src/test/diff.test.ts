import { describe, it, expect } from 'vitest';
import { diffObjects, computeDiff } from '../utils/diff';

describe('diff utilities', () => {
  describe('diffObjects', () => {
    it('should detect added fields', () => {
      const oldObj = { a: 1 };
      const newObj = { a: 1, b: 2 };
      const result = diffObjects(oldObj, newObj);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('added');
      expect(result[0].path).toBe('b');
    });

    it('should detect removed fields', () => {
      const oldObj = { a: 1, b: 2 };
      const newObj = { a: 1 };
      const result = diffObjects(oldObj, newObj);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('removed');
      expect(result[0].path).toBe('b');
    });

    it('should detect modified fields', () => {
      const oldObj = { a: 1, b: 2 };
      const newObj = { a: 1, b: 3 };
      const result = diffObjects(oldObj, newObj);
      
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('modified');
      expect(result[0].oldValue).toBe(2);
      expect(result[0].newValue).toBe(3);
    });
  });

  describe('computeDiff', () => {
    it('should handle null before state', () => {
      const after = { a: 1, b: 2 };
      const result = computeDiff(null, after);
      
      expect(result).toHaveLength(2);
      expect(result.every(r => r.type === 'added')).toBe(true);
    });
  });
});
