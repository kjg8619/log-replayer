import { existsSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { openTestDatabase } from './helper';

describe('openTestDatabase', () => {
  it('creates a database', () => {
    const { db, cleanup } = openTestDatabase();

    try {
      const result = db.prepare('SELECT 1 AS value').get() as { value: number };
      expect(result.value).toBe(1);
    } finally {
      cleanup();
    }
  });

  it('cleans up the temporary database', () => {
    const { filePath, cleanup } = openTestDatabase();

    expect(existsSync(filePath)).toBe(true);

    cleanup();

    expect(existsSync(filePath)).toBe(false);
  });
});
